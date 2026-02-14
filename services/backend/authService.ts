import {
  UserProfile,
  Patient,
  RiskLevel,
  UserRole,
} from "../../types";
import {
  KEYS,
  normalizePhone,
  delay,
  Security,
  storage,
  DEFAULT_PATIENTS,
} from "./shared";
import { supabase, isSupabaseConfigured } from "../supabaseClient";

export class AuthService {
  public async loginAsDemo(role: UserRole): Promise<{ user: UserProfile }> {
    await delay(200);

    if (role === "clinic") {
      const admin: UserProfile = {
        id: "admin",
        role: "clinic",
        name: "MamaSafe HQ",
        phone: "+254700000000",
        email: "admin@mamasafe.ai",
        location: "Nairobi",
        countryCode: "KE",
        facilityData: { managerName: "System Admin" },
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
      facilityData: { managerName: "Peter Drugman" },
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
            const userProfile: UserProfile = {
              id: existingUser.id,
              role: existingUser.role as UserRole,
              name: existingUser.name,
              phone: existingUser.phone,
              email: existingUser.email || undefined,
              location: existingUser.location || '',
              avatar: existingUser.avatar || googleUser.user_metadata?.avatar_url || undefined,
              countryCode: existingUser.country_code || 'KE',
              subscriptionPlan: existingUser.subscription_plan || undefined,
              patientData: existingUser.patient_data as any,
              facilityData: existingUser.facility_data as any,
            };
            
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
              facility_data: role !== 'patient' ? JSON.parse(JSON.stringify({
                managerName: googleUser.user_metadata?.full_name || 'Manager',
              })) : null,
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

            const userProfile: UserProfile = {
              id: createdUser.id,
              role: createdUser.role as UserRole,
              name: createdUser.name,
              phone: createdUser.phone,
              email: createdUser.email || undefined,
              location: createdUser.location || '',
              avatar: createdUser.avatar || undefined,
              countryCode: createdUser.country_code || 'KE',
              subscriptionPlan: createdUser.subscription_plan || undefined,
              patientData: createdUser.patient_data as any,
              facilityData: createdUser.facility_data as any,
            };

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
      facilityData:
        role !== "patient" ? { managerName: providerUser.name } : undefined,
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
        const { data: emailUsers, error: emailErr } = await supabase
          .from('users')
          .select('*')
          .eq('email', rawInput.toLowerCase())
          .limit(1);
        
        if (emailUsers && emailUsers.length > 0) {
          users = emailUsers;
        } else {
          // Try phone
          const cleanIdentifier = normalizePhone(rawInput);
          if (cleanIdentifier) {
            const { data: phoneUsers, error: phoneErr } = await supabase
              .from('users')
              .select('*')
              .eq('phone', cleanIdentifier)
              .limit(1);
            if (phoneUsers && phoneUsers.length > 0) {
              users = phoneUsers;
            }
          }
          
          // If still not found, try name (case-insensitive)
          if (!users || users.length === 0) {
            const { data: nameUsers } = await supabase
              .from('users')
              .select('*')
              .ilike('name', `%${rawInput}%`)
              .limit(1);
            if (nameUsers && nameUsers.length > 0) {
              users = nameUsers;
            }
          }
        }
      }

      if (error || !users || users.length === 0) {
        throw new Error('Invalid credentials. Try "admin" / "1234"');
      }

      const dbUser = users[0];
      
      // Verify password
      if (!Security.compare(cleanPassword, dbUser.pin_hash || '')) {
        throw new Error('Invalid credentials. Try "admin" / "1234"');
      }

      // Convert DB user to UserProfile
      const user: UserProfile = {
        id: dbUser.id,
        role: dbUser.role as UserRole,
        name: dbUser.name,
        phone: dbUser.phone,
        email: dbUser.email || undefined,
        location: dbUser.location,
        avatar: dbUser.avatar || undefined,
        countryCode: dbUser.country_code,
        subscriptionPlan: dbUser.subscription_plan || undefined,
        patientData: dbUser.patient_data as any,
        facilityData: dbUser.facility_data as any,
      };

      // Store session
      storage.set(KEYS.CURRENT_USER, user);
      storage.set(KEYS.SESSION, "true");
      return { user };
    }

    // Fallback to localStorage
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
        facilityData: { managerName: "System Admin" },
        avatar:
          "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80",
      };
      storage.set(KEYS.CURRENT_USER, admin);
      storage.set(KEYS.SESSION, "true");
      return { user: admin };
    }

    const cleanIdentifier = normalizePhone(rawInput);

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
        facilityData: { managerName: "Peter Drugman" },
      };
      storage.set(KEYS.CURRENT_USER, demoPharmacy);
      storage.set(KEYS.SESSION, "true");
      return { user: demoPharmacy };
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
      throw new Error('Invalid credentials. Try "admin" / "1234"');
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
          .eq('email', user.email?.toLowerCase())
          .limit(1)
          .single();
        existingUser = data;
      }

      const userData = {
        role: user.role,
        name: user.name,
        phone: cleanPhone,
        email: user.email || null,
        location: user.location,
        avatar: user.avatar || null,
        country_code: user.countryCode || 'KE',
        subscription_plan: user.subscriptionPlan || null,
        pin_hash: Security.hash(user.pin),
        patient_data: user.patientData ? JSON.parse(JSON.stringify(user.patientData)) : null,
        facility_data: user.facilityData ? JSON.parse(JSON.stringify(user.facilityData)) : null,
      };

      if (existingUser) {
        // Update existing user
        const { data: updated, error } = await supabase
          .from('users')
          .update(userData)
          .eq('id', existingUser.id)
          .select()
          .single();

        if (error) throw new Error(error.message);

        const profile: UserProfile = {
          id: updated.id,
          role: updated.role as UserRole,
          name: updated.name,
          phone: updated.phone,
          email: updated.email || undefined,
          location: updated.location,
          avatar: updated.avatar || undefined,
          countryCode: updated.country_code,
          subscriptionPlan: updated.subscription_plan || undefined,
          patientData: updated.patient_data as any,
          facilityData: updated.facility_data as any,
        };

        storage.set(KEYS.CURRENT_USER, profile);
        storage.set(KEYS.SESSION, "true");
        return { user: profile };
      } else {
        // Create new user
        const { data: newUser, error } = await supabase
          .from('users')
          .insert(userData)
          .select()
          .single();

        if (error) throw new Error(error.message);

        const profile: UserProfile = {
          id: newUser.id,
          role: newUser.role as UserRole,
          name: newUser.name,
          phone: newUser.phone,
          email: newUser.email || undefined,
          location: newUser.location,
          avatar: newUser.avatar || undefined,
          countryCode: newUser.country_code,
          subscriptionPlan: newUser.subscription_plan || undefined,
          patientData: newUser.patient_data as any,
          facilityData: newUser.facility_data as any,
        };

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
          const userProfile: UserProfile = {
            id: existingUser.id,
            role: existingUser.role as UserRole,
            name: existingUser.name,
            phone: existingUser.phone,
            email: existingUser.email || undefined,
            location: existingUser.location || '',
            avatar: existingUser.avatar || googleUser.user_metadata?.avatar_url || undefined,
            countryCode: existingUser.country_code || 'KE',
            subscriptionPlan: existingUser.subscription_plan || undefined,
            patientData: existingUser.patient_data as any,
            facilityData: existingUser.facility_data as any,
          };
          
          storage.set(KEYS.CURRENT_USER, userProfile);
          storage.set(KEYS.SESSION, "true");
          return userProfile;
        }
      }
    }

    // Fallback to localStorage session
    const session = localStorage.getItem(KEYS.SESSION);
    if (session !== "true") return null;
    return storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
  }

  public async updateProfile(user: UserProfile): Promise<UserProfile> {
    storage.set(KEYS.CURRENT_USER, user);

    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('users')
        .update({
          name: user.name,
          phone: user.phone,
          email: user.email || null,
          location: user.location,
          avatar: user.avatar || null,
          country_code: user.countryCode || 'KE',
          subscription_plan: user.subscriptionPlan || null,
          patient_data: user.patientData ? JSON.parse(JSON.stringify(user.patientData)) : null,
          facility_data: user.facilityData ? JSON.parse(JSON.stringify(user.facilityData)) : null,
        })
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
}

