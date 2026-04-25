import {
  UserProfile,
  Patient,
  RiskLevel,
  UserRole,
} from "../../types";
import {
  KEYS,
  normalizePhone,
  phoneLookupVariants,
  delay,
  Security,
  storage,
} from "./shared";
import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { MessagingService } from "./messagingService";

export class AuthService {
  private normalizeEmail(email: string | null | undefined): string | null {
    if (!email) return null;
    const e = email.trim().toLowerCase();
    return e.length ? e : null;
  }

  private dbRowToProfile(row: Record<string, unknown>): UserProfile {
    return {
      id: String(row.id),
      role: row.role as UserRole,
      name: String(row.name),
      phone: String(row.phone),
      email: (row.email as string) || undefined,
      location: (row.location as string) ?? "",
      avatar: (row.avatar as string) || undefined,
      countryCode: (row.country_code as string) || "KE",
      subscriptionPlan: (row.subscription_plan as string) || undefined,
      patientData: row.patient_data as any,
      facilityData: row.facility_data as any,
      employerFacilityId: (row.employer_facility_id as string) || undefined,
    };
  }

  private defaultFacilitySignupData(
    role: UserRole,
    managerName: string,
    existing?: UserProfile["facilityData"],
    employerFacilityId?: string | null
  ): UserProfile["facilityData"] | null {
    if (role === "patient") return null;

    // Staff invited into an existing facility should not be auto-promoted.
    if (employerFacilityId) {
      return existing || { managerName };
    }

    return {
      ...(existing || {}),
      managerName: existing?.managerName || managerName,
      permissionRole: "owner",
      permissions: {
        overview: true,
        inventory: true,
        expenses: true,
      },
    };
  }

  private getAllowInsecureDemoAuth(): boolean {
    // Never allow hard-coded credentials in production.
    // This is only for local/dev environments when Supabase isn't available.
    const v = import.meta.env.VITE_ALLOW_INSECURE_DEMO_AUTH;
    return !!(import.meta.env.DEV || v === 'true');
  }

  private isDebugAuthEnabled(): boolean {
    const v = import.meta.env.VITE_DEBUG_AUTH;
    return !!(import.meta.env.DEV || v === 'true');
  }

  private generateResetCode(): string {
    // 6-digit code, cryptographically random when available.
    const c: Uint32Array =
      typeof crypto !== 'undefined' && crypto.getRandomValues
        ? new Uint32Array(1)
        : new Uint32Array([Math.floor(Math.random() * 2 ** 32)]);

    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(c);
    }

    const n = c[0] % 1000000;
    return n.toString().padStart(6, '0');
  }

  private resolveUserIdByIdentifier = async (
    identifier: string
  ): Promise<{ userId: string; phone: string } | null> => {
    const rawInput = identifier.trim();
    if (!rawInput) return null;

    const identifierLower = rawInput.toLowerCase();
    const looksLikeEmail =
      identifierLower.includes('@') && identifierLower.includes('.');

    if (!isSupabaseConfigured()) return null;

    if (looksLikeEmail) {
      const { data: eqUsers } = await supabase
        .from('users')
        .select('id, phone')
        .eq('email', identifierLower)
        .limit(1);

      if (eqUsers && eqUsers.length > 0) {
        return { userId: eqUsers[0].id, phone: eqUsers[0].phone };
      }

      const { data: ilikeUsers } = await supabase
        .from('users')
        .select('id, phone')
        .ilike('email', identifierLower)
        .limit(1);

      if (ilikeUsers && ilikeUsers.length > 0) {
        return { userId: ilikeUsers[0].id, phone: ilikeUsers[0].phone };
      }
    }

    const cleanIdentifier = normalizePhone(rawInput);
    if (cleanIdentifier) {
      for (const phone of phoneLookupVariants(rawInput)) {
        const { data: phoneUsers } = await supabase
          .from("users")
          .select("id, phone")
          .eq("phone", phone)
          .limit(1);

        if (phoneUsers && phoneUsers.length > 0) {
          return { userId: phoneUsers[0].id, phone: phoneUsers[0].phone };
        }
      }
    }

    const { data: nameUsers } = await supabase
      .from('users')
      .select('id, phone')
      .ilike('name', `%${rawInput}%`)
      .limit(1);

    if (nameUsers && nameUsers.length > 0) {
      return { userId: nameUsers[0].id, phone: nameUsers[0].phone };
    }

    return null;
  };

  /**
   * Request a one-time PIN reset code.
   * Always returns `{ ok: true }` to avoid leaking whether the user exists.
   */
  public async requestPinReset(
    identifier: string
  ): Promise<{ ok: true }> {
    if (!isSupabaseConfigured()) return { ok: true };

    const user = await this.resolveUserIdByIdentifier(identifier);
    if (!user) return { ok: true };

    const code = this.generateResetCode();
    const tokenHash = Security.hash(`${code}:${user.userId}`);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const messagingService = new MessagingService();
    const portalUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://mamasafe.ai';

    try {
      await supabase.from('pin_reset_tokens').insert({
        user_id: user.userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

      const message = `Habari! Umeomba kuweka upya PIN yako kwenye MamaSafe.\n\nPIN RESET CODE yako ni: ${code}\nInatakiwa itumike ndani ya dakika 15.\n\nKuingia: ${portalUrl}`;
      // Best effort messaging; do not block the reset flow.
      await messagingService.sendNotification(user.phone, message, ['whatsapp', 'sms']);
    } catch (e) {
      console.error('Error requesting PIN reset:', e);
      // Still return ok to prevent enumeration.
    }

    return { ok: true };
  }

  /**
   * Reset the user's PIN using the one-time reset code.
   */
  public async resetPin(
    identifier: string,
    code: string,
    newPin: string
  ): Promise<{ ok: true }> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const pin = newPin.trim();
    const resetCode = code.trim();

    if (!pin || pin.length < 4) {
      throw new Error('New PIN must be at least 4 characters.');
    }
    if (!resetCode) {
      throw new Error('Reset code is required.');
    }

    const user = await this.resolveUserIdByIdentifier(identifier);
    if (!user) {
      throw new Error('Invalid or expired reset code.');
    }

    const tokenHash = Security.hash(`${resetCode}:${user.userId}`);
    const nowIso = new Date().toISOString();

    const { data: tokens } = await supabase
      .from('pin_reset_tokens')
      .select('id, used, expires_at')
      .eq('user_id', user.userId)
      .eq('token_hash', tokenHash)
      .eq('used', false)
      .gt('expires_at', nowIso)
      .limit(1);

    const token = tokens && tokens.length > 0 ? tokens[0] : null;
    if (!token) {
      throw new Error('Invalid or expired reset code.');
    }

    // Update PIN + mark token used.
    await supabase.from('users').update({
      pin_hash: Security.hash(pin),
    }).eq('id', user.userId);

    await supabase.from('pin_reset_tokens').update({
      used: true,
      used_at: new Date().toISOString(),
    }).eq('id', token.id);

    return { ok: true };
  }

  public async loginAsDemo(role: UserRole): Promise<{ user: UserProfile }> {
    await delay(200);

    if (role === "superadmin") {
      const superadmin: UserProfile = {
        id: "superadmin",
        role: "superadmin",
        name: "MamaSafe AI Team",
        phone: "+254700000000",
        email: "admin@mamasafe.ai",
        location: "Nairobi",
        countryCode: "KE",
        avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80",
      };
      storage.set(KEYS.CURRENT_USER, superadmin);
      storage.set(KEYS.SESSION, "true");
      return { user: superadmin };
    }

    if (role === "clinic") {
      const admin: UserProfile = {
        id: "admin",
        role: "clinic",
        name: "MamaSafe HQ",
        phone: "+254700000000",
        email: "admin@mamasafe.ai",
        location: "Nairobi",
        countryCode: "KE",
        facilityData: {
          managerName: "System Admin",
          permissionRole: "owner",
          permissions: { overview: true, inventory: true, expenses: true },
        },
        avatar:
          "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80",
      };
      storage.set(KEYS.CURRENT_USER, admin);
      storage.set(KEYS.SESSION, "true");
      return { user: admin };
    }

    if (role === "patient") {
      const demoPatient: UserProfile = {
        id: "demo_patient",
        role: "patient",
        name: "Jane Demo (Patient)",
        phone: "+254722000000",
        location: "Nairobi",
        countryCode: "KE",
        pin: Security.hash("1234"),
        patientData: {
          gestationWeeks: 28,
          dob: "1995-01-01",
          nextOfKin: { name: "John Doe", phone: "+254711000000" },
          medicalHistory: ["Mild Anemia"],
          allergies: [],
          medications: [],
          nextAppointment: new Date(
            Date.now() + 86400000 * 5
          ).toISOString(),
          riskStatus: RiskLevel.LOW,
        },
      };
      storage.set(KEYS.CURRENT_USER, demoPatient);
      storage.set(KEYS.SESSION, "true");
      return { user: demoPatient };
    }

    const demoPharmacy: UserProfile = {
      id: "demo_pharmacy",
      role: "pharmacy",
      name: "City Care Pharmacy",
      phone: "+254733000000",
      location: "Westlands, Nairobi",
      countryCode: "KE",
      facilityData: {
        managerName: "Peter Drugman",
        permissionRole: "owner",
        permissions: { overview: true, inventory: true, expenses: true },
      },
    };
    storage.set(KEYS.CURRENT_USER, demoPharmacy);
    storage.set(KEYS.SESSION, "true");
    return { user: demoPharmacy };
  }

  public async loginWithProvider(
    role: UserRole = "patient"
  ): Promise<{ user: UserProfile }> {
    // Use Supabase OAuth if configured
    if (isSupabaseConfigured()) {
      try {
        // First, check if user already has a session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // User is already authenticated, get their profile
          const googleUser = session.user;
          
          // Check if user exists in our users table
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', googleUser.email)
            .single();

          if (existingUser) {
            // User exists, return their profile
            const userProfile = this.dbRowToProfile(existingUser as Record<string, unknown>);
            if (googleUser.user_metadata?.avatar_url && !userProfile.avatar) {
              userProfile.avatar = googleUser.user_metadata.avatar_url as string;
            }
            storage.set(KEYS.CURRENT_USER, userProfile);
            storage.set(KEYS.SESSION, "true");
            return { user: userProfile };
          } else {
            // New user, create account
            const newUserData = {
              id: googleUser.id,
              role: role,
              name: googleUser.user_metadata?.full_name || googleUser.user_metadata?.name || googleUser.email?.split('@')[0] || 'Google User',
              phone: googleUser.phone || '',
              email: googleUser.email || '',
              location: 'Nairobi',
              avatar: googleUser.user_metadata?.avatar_url || undefined,
              country_code: 'KE',
              subscription_plan: 'free',
              pin_hash: null, // No password for OAuth users
              patient_data: role === 'patient' ? JSON.parse(JSON.stringify({
                gestationWeeks: 12,
                dob: '1995-01-01',
                nextOfKin: { name: '', phone: '' },
                medicalHistory: [],
                allergies: [],
                medications: [],
                nextAppointment: new Date().toISOString(),
                riskStatus: RiskLevel.LOW,
              })) : null,
              facility_data: JSON.parse(JSON.stringify(
                this.defaultFacilitySignupData(
                  role,
                  googleUser.user_metadata?.full_name || "Manager"
                )
              )),
              employer_facility_id: null,
            };

            const { data: createdUser, error: createError } = await supabase
              .from('users')
              .insert(newUserData)
              .select()
              .single();

            if (createError) {
              console.error('Error creating user:', createError);
              throw new Error('Failed to create account. Please try again.');
            }

            const userProfile = this.dbRowToProfile(createdUser as Record<string, unknown>);

            storage.set(KEYS.CURRENT_USER, userProfile);
            storage.set(KEYS.SESSION, "true");
            return { user: userProfile };
          }
        }

        // No existing session, initiate OAuth flow
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });

        if (error) {
          console.error('Google OAuth error:', error);
          throw new Error('Failed to initiate Google sign-in. Please try again.');
        }

        // OAuth will redirect the user, so we can't return here
        // The user will be redirected back and we'll handle it in getSession
        // For now, throw an error that the UI can handle gracefully
        throw new Error('Redirecting to Google for authentication...');
      } catch (error: any) {
        // If it's a redirect message, that's expected
        if (error.message?.includes('Redirecting')) {
          throw error;
        }
        console.error('Google OAuth error:', error);
        throw new Error(error.message || 'Google sign-in failed. Please try again.');
      }
    }

    // Fallback: Mock implementation for development
    await delay(800);

    const providerUser = {
      email: "user@example.com",
      name: "Provisioned User",
      avatar:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80",
    };

    const users = storage.get<UserProfile[]>(KEYS.USERS, []);
    let user = users.find((u) => u.email === providerUser.email);

    if (user) {
      storage.set(KEYS.CURRENT_USER, user);
      storage.set(KEYS.SESSION, "true");
      return { user };
    }

    const newUser: UserProfile = {
      id: `provisioned_${Date.now()}`,
      role,
      name: providerUser.name,
      email: providerUser.email,
      phone: "",
      location: "Nairobi, Kenya",
      countryCode: "KE",
      avatar: providerUser.avatar,
      facilityData: this.defaultFacilitySignupData(role, providerUser.name) || undefined,
      patientData:
        role === "patient"
          ? {
              gestationWeeks: 12,
              dob: "1995-01-01",
              nextOfKin: { name: "", phone: "" },
              medicalHistory: [],
              allergies: [],
              medications: [],
              nextAppointment: new Date().toISOString(),
              riskStatus: RiskLevel.LOW,
            }
          : undefined,
    };

    users.push(newUser);
    storage.set(KEYS.USERS, users);
    storage.set(KEYS.CURRENT_USER, newUser);
    storage.set(KEYS.SESSION, "true");
    return { user: newUser };
  }

  public async login(
    identifier: string,
    password: string
  ): Promise<{ user: UserProfile }> {
    await delay(500);

    const rawInput = identifier.trim();
    const cleanPassword = password.trim();
    const identifierLower = rawInput.toLowerCase();
    const looksLikeEmail =
      identifierLower.includes('@') && identifierLower.includes('.');

    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      let users: any[] | null = null;
      let error: any = null;

      // Special handling for "admin" - check email first
      if (rawInput.toLowerCase() === "admin" || rawInput.toLowerCase() === "admin@mamasafe.ai") {
        const { data, error: err } = await supabase
          .from('users')
          .select('*')
          .eq('email', 'admin@mamasafe.ai')
          .limit(1);
        users = data;
        error = err;
      } else {
        // Try email first (most common)
        if (looksLikeEmail) {
          // Prefer exact match (email is normalized on register), then fallback to case-insensitive match.
          const { data: emailEqUsers, error: emailEqErr } = await supabase
            .from('users')
            .select('*')
            .eq('email', identifierLower)
            .limit(1);

          if (emailEqErr) error = emailEqErr;

          users = emailEqUsers && emailEqUsers.length > 0 ? emailEqUsers : null;

          if (!users) {
            const { data: emailILikeUsers, error: emailILikeErr } = await supabase
              .from('users')
              .select('*')
              .ilike('email', identifierLower)
              .limit(1);

            if (emailILikeErr) error = emailILikeErr;
            users = emailILikeUsers || null;
          }
        } else {
          // Try phone (multiple stored formats: +254…, 254…, 07…)
          const cleanIdentifier = normalizePhone(rawInput);
          if (cleanIdentifier) {
            for (const phone of phoneLookupVariants(rawInput)) {
              const { data: phoneUsers, error: phoneErr } = await supabase
                .from("users")
                .select("*")
                .eq("phone", phone)
                .limit(1);
              if (phoneErr) error = phoneErr;
              if (phoneUsers && phoneUsers.length > 0) {
                users = phoneUsers;
                break;
              }
            }
          }

          // If still not found, try name (case-insensitive)
          if (!users || users.length === 0) {
            const { data: nameUsers } = await supabase
              .from('users')
              .select('*')
              .ilike('name', `%${rawInput}%`)
              .limit(1);
            users = nameUsers || null;
          }
        }
      }

      if (!users || users.length === 0) {
        if (error) {
          console.error("[Auth] Supabase users query error:", error);
          throw new Error(
            "Sign-in service is temporarily unavailable. Please try again in a moment."
          );
        }
        if (this.isDebugAuthEnabled()) {
          console.warn("[Auth] User not found:", { identifier: rawInput });
        }
        throw new Error("Invalid credentials.");
      }

      const dbUser = users[0];
      
      // Verify password
      if (!Security.compare(cleanPassword, dbUser.pin_hash || '')) {
        if (this.isDebugAuthEnabled()) {
          console.warn('[Auth] Password mismatch:', { identifier: rawInput, userId: dbUser.id });
        }
        throw new Error('Invalid credentials.');
      }

      const user = this.dbRowToProfile(dbUser as Record<string, unknown>);

      // Store session
      storage.set(KEYS.CURRENT_USER, user);
      storage.set(KEYS.SESSION, "true");
      return { user };
    }

    // Fallback to localStorage
    if (this.getAllowInsecureDemoAuth()) {
      if (
        (rawInput.toLowerCase() === "admin" ||
          rawInput.toLowerCase() === "admin@mamasafe.ai") &&
        cleanPassword === "1234"
      ) {
        const admin: UserProfile = {
          id: "admin",
          role: "clinic",
          name: "MamaSafe HQ",
          phone: "+254700000000",
          email: "admin@mamasafe.ai",
          location: "Nairobi",
          countryCode: "KE",
          facilityData: {
            managerName: "System Admin",
            permissionRole: "owner",
            permissions: { overview: true, inventory: true, expenses: true },
          },
          avatar:
            "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80",
        };
        storage.set(KEYS.CURRENT_USER, admin);
        storage.set(KEYS.SESSION, "true");
        return { user: admin };
      }
    }

    const cleanIdentifier = normalizePhone(rawInput);

    if (this.getAllowInsecureDemoAuth()) {
      if (cleanIdentifier === "+254722000000" && cleanPassword === "1234") {
        const demoPatient: UserProfile = {
          id: "demo_patient",
          role: "patient",
          name: "Jane Demo (Patient)",
          phone: "+254722000000",
          location: "Nairobi",
          countryCode: "KE",
          pin: Security.hash("1234"),
          patientData: {
            gestationWeeks: 28,
            dob: "1995-01-01",
            nextOfKin: { name: "John Doe", phone: "+254711000000" },
            medicalHistory: ["Mild Anemia"],
            allergies: [],
            medications: [],
            nextAppointment: new Date(
              Date.now() + 86400000 * 5
            ).toISOString(),
            riskStatus: RiskLevel.LOW,
          },
        };
        storage.set(KEYS.CURRENT_USER, demoPatient);
        storage.set(KEYS.SESSION, "true");
        return { user: demoPatient };
      }

      if (cleanIdentifier === "+254733000000" && cleanPassword === "1234") {
        const demoPharmacy: UserProfile = {
          id: "demo_pharmacy",
          role: "pharmacy",
          name: "City Care Pharmacy",
          phone: "+254733000000",
          location: "Westlands, Nairobi",
          countryCode: "KE",
          facilityData: {
            managerName: "Peter Drugman",
            permissionRole: "owner",
            permissions: { overview: true, inventory: true, expenses: true },
          },
        };
        storage.set(KEYS.CURRENT_USER, demoPharmacy);
        storage.set(KEYS.SESSION, "true");
        return { user: demoPharmacy };
      }
    }

    const users = storage.get<UserProfile[]>(KEYS.USERS, []);
    const cleanId = cleanIdentifier;

    const user = users.find((u) => {
      const isPhoneMatch = normalizePhone(u.phone) === cleanId;
      const isEmailMatch =
        u.email && u.email.toLowerCase() === rawInput.toLowerCase();
      const isNameMatch = u.name.toLowerCase() === rawInput.toLowerCase();

      return (
        (isPhoneMatch || isEmailMatch || isNameMatch) &&
        Security.compare(cleanPassword, u.pin)
      );
    });

    if (!user) {
      throw new Error('Invalid credentials.');
    }

    if (user.role === "patient") {
      const patients = storage.get<Patient[]>(KEYS.PATIENTS, []);
      const patientRecord = patients.find((p) => p.id === user.id);
      if (patientRecord && user.patientData) {
        user.patientData.medications = patientRecord.medications || [];
      }
    }

    storage.set(KEYS.CURRENT_USER, user);
    storage.set(KEYS.SESSION, "true");
    return { user };
  }

  public async register(
    user: UserProfile & { pin: string }
  ): Promise<{ user: UserProfile }> {
    await delay(500);

    const cleanPhone = normalizePhone(user.phone);
    const emailNormalized = this.normalizeEmail(user.email);
    const hasEmail = user.email && user.email.includes("@");

    if (cleanPhone === "+254700000000") {
      throw new Error("This phone number is reserved. Please Log In.");
    }

    if ((!cleanPhone || cleanPhone.length < 10) && !hasEmail) {
      throw new Error("Invalid phone number or email provided.");
    }
    if (!user.name) {
      throw new Error("Name is required.");
    }
    if (!user.pin || user.pin.length < 4) {
      throw new Error("Password must be at least 4 characters.");
    }

    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      const facilityDataForSignup = this.defaultFacilitySignupData(
        user.role,
        user.facilityData?.managerName || user.name,
        user.facilityData,
        user.employerFacilityId
      );

      // Check if user exists
      let existingUser = null;
      if (cleanPhone) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('phone', cleanPhone)
          .limit(1)
          .single();
        existingUser = data;
      }
      
      if (!existingUser && hasEmail) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('email', emailNormalized)
          .limit(1)
          .single();
        existingUser = data;
      }

      const baseUserData: Record<string, unknown> = {
        role: user.role,
        name: user.name,
        phone: cleanPhone,
        email: emailNormalized,
        location: user.location,
        avatar: user.avatar || null,
        country_code: user.countryCode || 'KE',
        subscription_plan: user.subscriptionPlan || null,
        pin_hash: Security.hash(user.pin),
        patient_data: user.patientData ? JSON.parse(JSON.stringify(user.patientData)) : null,
        facility_data: facilityDataForSignup ? JSON.parse(JSON.stringify(facilityDataForSignup)) : null,
      };

      if (existingUser) {
        if (user.employerFacilityId !== undefined) {
          baseUserData.employer_facility_id = user.employerFacilityId;
        }
        const { data: updated, error } = await supabase
          .from('users')
          .update(baseUserData)
          .eq('id', existingUser.id)
          .select()
          .single();

        if (error) throw new Error(error.message);

        const profile = this.dbRowToProfile(updated as Record<string, unknown>);
        storage.set(KEYS.CURRENT_USER, profile);
        storage.set(KEYS.SESSION, "true");
        return { user: profile };
      } else {
        const insertPayload = {
          ...baseUserData,
          employer_facility_id: user.employerFacilityId ?? null,
        };
        const { data: newUser, error } = await supabase
          .from('users')
          .insert(insertPayload)
          .select()
          .single();

        if (error) throw new Error(error.message);

        const profile = this.dbRowToProfile(newUser as Record<string, unknown>);
        storage.set(KEYS.CURRENT_USER, profile);
        storage.set(KEYS.SESSION, "true");
        return { user: profile };
      }
    }

    // Fallback to localStorage
    const users = storage.get<UserProfile[]>(KEYS.USERS, []);

    const existingUserIndex = users.findIndex(
      (u) =>
        (cleanPhone && normalizePhone(u.phone) === cleanPhone) ||
        (hasEmail &&
          u.email?.toLowerCase() === user.email?.toLowerCase())
    );

    const newUser: UserProfile = {
      ...user,
      phone: cleanPhone,
      facilityData:
        this.defaultFacilitySignupData(
          user.role,
          user.facilityData?.managerName || user.name,
          user.facilityData,
          user.employerFacilityId
        ) || undefined,
      pin: Security.hash(user.pin),
    };

    if (existingUserIndex >= 0) {
      const existingUser = users[existingUserIndex];
      const updatedUser = {
        ...existingUser,
        ...newUser,
        id: existingUser.id,
      };
      users[existingUserIndex] = updatedUser;

      storage.set(KEYS.USERS, users);
      storage.set(KEYS.CURRENT_USER, updatedUser);
      storage.set(KEYS.SESSION, "true");
      return { user: updatedUser };
    }

    users.push(newUser);
    storage.set(KEYS.USERS, users);
    storage.set(KEYS.CURRENT_USER, newUser);
    storage.set(KEYS.SESSION, "true");
    return { user: newUser };
  }

  public async logout(): Promise<void> {
    storage.remove(KEYS.SESSION);
    storage.remove(KEYS.CURRENT_USER);
  }

  public async getSession(): Promise<UserProfile | null> {
    // Check Supabase session first (for OAuth users)
    if (isSupabaseConfigured()) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const googleUser = session.user;
        
        // Check if user exists in our users table
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', googleUser.email)
          .single();

        if (existingUser) {
          const userProfile = this.dbRowToProfile(existingUser as Record<string, unknown>);
          if (googleUser.user_metadata?.avatar_url && !userProfile.avatar) {
            userProfile.avatar = googleUser.user_metadata.avatar_url as string;
          }
          storage.set(KEYS.CURRENT_USER, userProfile);
          storage.set(KEYS.SESSION, "true");
          return userProfile;
        }
      }
    }

    // Fallback to localStorage session
    const session = localStorage.getItem(KEYS.SESSION);
    if (session !== "true") return null;
    const cached = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
    if (!cached) return null;

    // If Supabase is configured, refresh from DB so server-side updates (e.g. permissions)
    // are reflected without requiring users to manually clear storage.
    if (isSupabaseConfigured()) {
      try {
        const { data: dbUser, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", cached.id)
          .maybeSingle();

        if (!error && dbUser) {
          const refreshed = this.dbRowToProfile(dbUser as Record<string, unknown>);
          storage.set(KEYS.CURRENT_USER, refreshed);
          return refreshed;
        }
      } catch (e) {
        console.warn("[Auth] Session refresh failed, using cached user:", e);
      }
    }

    return cached;
  }

  public async updateProfile(user: UserProfile): Promise<UserProfile> {
    storage.set(KEYS.CURRENT_USER, user);

    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      const emailNormalized = this.normalizeEmail(user.email);
      const updatePayload: Record<string, unknown> = {
        name: user.name,
        phone: user.phone,
        email: emailNormalized,
        location: user.location,
        avatar: user.avatar || null,
        country_code: user.countryCode || 'KE',
        subscription_plan: user.subscriptionPlan || null,
        patient_data: user.patientData ? JSON.parse(JSON.stringify(user.patientData)) : null,
        facility_data: user.facilityData ? JSON.parse(JSON.stringify(user.facilityData)) : null,
      };
      if (user.employerFacilityId !== undefined) {
        updatePayload.employer_facility_id = user.employerFacilityId;
      }
      const { error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', user.id);

      if (error) throw new Error(error.message);
      return user;
    }

    // Fallback to localStorage
    const users = storage.get<UserProfile[]>(KEYS.USERS, []);
    const index = users.findIndex((u) => u.id === user.id);
    if (index !== -1) {
      users[index] = { ...users[index], ...user };
      storage.set(KEYS.USERS, users);
    }
    return user;
  }

  /**
   * Admin utility: resolve and fetch a user profile by phone/email/name identifier.
   * Returns null when not found.
   */
  public async getUserProfileByIdentifier(
    identifier: string
  ): Promise<UserProfile | null> {
    if (!isSupabaseConfigured()) return null;
    const resolved = await this.resolveUserIdByIdentifier(identifier);
    if (!resolved) return null;

    const { data: dbUser, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", resolved.userId)
      .maybeSingle();

    if (error) {
      console.error("[Auth] getUserProfileByIdentifier:", error);
      throw error;
    }
    if (!dbUser) return null;

    return this.dbRowToProfile(dbUser as Record<string, unknown>);
  }
}

