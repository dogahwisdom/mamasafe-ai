import type {
  CreateFacilityStaffInput,
  FacilityStaffSummary,
  UserProfile,
  UserRole,
} from "../../types";
import { Permissions } from "../permissions";
import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { KEYS, normalizePhone, Security, storage } from "./shared";

/**
 * Lists and creates facility staff (`employer_facility_id` → facility root user).
 * Authorization is enforced here; tighten Supabase RLS when auth.uid() is available for PIN users.
 */
export class FacilityStaffService {
  private normalizeEmail(email: string | null | undefined): string | null {
    if (!email) return null;
    const e = email.trim().toLowerCase();
    return e.length ? e : null;
  }

  private assertCanManageStaff(actor: UserProfile): string {
    if (!Permissions.isOwnerOrAdmin(actor)) {
      throw new Error("Only owners and admins can manage facility staff.");
    }
    const root = Permissions.facilityOwnerUserId(actor);
    if (!root) {
      throw new Error("Your account is not linked to a facility.");
    }
    if (actor.role !== "clinic" && actor.role !== "pharmacy") {
      throw new Error("Staff management is only available in clinic or pharmacy portals.");
    }
    return root;
  }

  private portalRoleForActor(actor: UserRole): "clinic" | "pharmacy" {
    return actor.role === "pharmacy" ? "pharmacy" : "clinic";
  }

  public async listStaffForCurrentFacility(
    actor: UserProfile
  ): Promise<FacilityStaffSummary[]> {
    const facilityRootId = this.assertCanManageStaff(actor);

    if (!isSupabaseConfigured()) {
      const users = storage.get<UserProfile[]>(KEYS.USERS, []);
      return users
        .filter((u) => u.employerFacilityId === facilityRootId)
        .map((u) => ({
          id: u.id,
          name: u.name,
          phone: u.phone,
          email: u.email,
          permissionRole: u.facilityData?.permissionRole,
          permissions: u.facilityData?.permissions,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, name, phone, email, facility_data, employer_facility_id")
      .eq("employer_facility_id", facilityRootId)
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map((row) => {
      const fd = row.facility_data as UserProfile["facilityData"];
      return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email || undefined,
        permissionRole: fd?.permissionRole,
        permissions: fd?.permissions,
      };
    });
  }

  /**
   * Creates a new user row with their own PIN. Does not change the current session.
   */
  public async createStaffMember(
    actor: UserProfile,
    input: CreateFacilityStaffInput
  ): Promise<UserProfile> {
    const facilityRootId = this.assertCanManageStaff(actor);
    const portalRole = this.portalRoleForActor(actor.role);

    const cleanPhone = normalizePhone(input.phone);
    const emailNormalized = this.normalizeEmail(input.email);
    const hasEmail = !!(input.email && input.email.includes("@"));

    if ((!cleanPhone || cleanPhone.length < 10) && !hasEmail) {
      throw new Error("Valid phone or email is required.");
    }
    if (!input.name?.trim()) {
      throw new Error("Name is required.");
    }
    if (!input.pin || input.pin.length < 4) {
      throw new Error("PIN must be at least 4 characters.");
    }

    const facilityData = {
      managerName: input.name.trim(),
      permissionRole: input.staffPermissionRole,
      permissions: {
        overview: false,
        inventory: false,
        expenses: false,
      },
    };

    const location = (input.location || actor.location || "—").trim() || "—";

    if (!isSupabaseConfigured()) {
      const users = storage.get<UserProfile[]>(KEYS.USERS, []);
      const dup = users.some(
        (u) =>
          (cleanPhone && normalizePhone(u.phone) === cleanPhone) ||
          (emailNormalized &&
            u.email?.toLowerCase() === emailNormalized)
      );
      if (dup) {
        throw new Error("A user with this phone or email already exists.");
      }
      const created: UserProfile = {
        id: `staff_${Date.now()}`,
        role: portalRole,
        name: input.name.trim(),
        phone: cleanPhone || input.phone.trim(),
        email: emailNormalized || undefined,
        location,
        countryCode: actor.countryCode || "KE",
        employerFacilityId: facilityRootId,
        facilityData,
        pin: Security.hash(input.pin),
      };
      users.push(created);
      storage.set(KEYS.USERS, users);
      return created;
    }

    if (cleanPhone) {
      const { data: byPhone } = await supabase
        .from("users")
        .select("id")
        .eq("phone", cleanPhone)
        .maybeSingle();
      if (byPhone) {
        throw new Error("This phone number is already registered.");
      }
    }
    if (emailNormalized) {
      const { data: byEmail } = await supabase
        .from("users")
        .select("id")
        .eq("email", emailNormalized)
        .maybeSingle();
      if (byEmail) {
        throw new Error("This email is already registered.");
      }
    }

    const insertPayload: Record<string, unknown> = {
      role: portalRole,
      name: input.name.trim(),
      phone: cleanPhone || input.phone.trim(),
      email: emailNormalized,
      location,
      avatar: null,
      country_code: actor.countryCode || "KE",
      subscription_plan: actor.subscriptionPlan || null,
      pin_hash: Security.hash(input.pin),
      patient_data: null,
      facility_data: JSON.parse(JSON.stringify(facilityData)),
      employer_facility_id: facilityRootId,
    };

    const { data: created, error } = await supabase
      .from("users")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return {
      id: created.id,
      role: created.role as UserRole,
      name: created.name,
      phone: created.phone,
      email: created.email || undefined,
      location: created.location ?? "",
      avatar: created.avatar || undefined,
      countryCode: created.country_code || "KE",
      subscriptionPlan: created.subscription_plan || undefined,
      patientData: created.patient_data as UserProfile["patientData"],
      facilityData: created.facility_data as UserProfile["facilityData"],
      employerFacilityId: created.employer_facility_id || undefined,
    };
  }

  /**
   * Unlinks a staff member from this facility (clears `employer_facility_id`) and revokes
   * module permissions. The user row and PIN remain so they can be re-invited or use PIN reset;
   * they no longer appear on this team or pass `canManageStaffProfile` for this facility.
   */
  public async removeStaffFromFacility(
    actor: UserProfile,
    staffUserId: string
  ): Promise<void> {
    const facilityRootId = this.assertCanManageStaff(actor);
    if (staffUserId === facilityRootId) {
      throw new Error("You cannot remove the primary facility account.");
    }

    if (!isSupabaseConfigured()) {
      const users = storage.get<UserProfile[]>(KEYS.USERS, []);
      const idx = users.findIndex((u) => u.id === staffUserId);
      if (idx === -1) throw new Error("User not found.");
      const target = users[idx];
      if (target.employerFacilityId !== facilityRootId) {
        throw new Error("This person is not on your team.");
      }
      const fd = target.facilityData || { managerName: target.name };
      users[idx] = {
        ...target,
        employerFacilityId: undefined,
        facilityData: {
          ...fd,
          managerName: fd.managerName || target.name,
          permissionRole: "attendant",
          permissions: {
            overview: false,
            inventory: false,
            expenses: false,
          },
        },
      };
      storage.set(KEYS.USERS, users);
      return;
    }

    const { data: row, error: fetchErr } = await supabase
      .from("users")
      .select("id, employer_facility_id, facility_data")
      .eq("id", staffUserId)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!row) throw new Error("User not found.");
    if (row.employer_facility_id !== facilityRootId) {
      throw new Error("This person is not on your team.");
    }

    const existingFd =
      (row.facility_data as Record<string, unknown> | null) || {};
    const nextFd = {
      ...existingFd,
      permissionRole: "attendant",
      permissions: {
        overview: false,
        inventory: false,
        expenses: false,
      },
    };

    const { error } = await supabase
      .from("users")
      .update({
        employer_facility_id: null,
        facility_data: nextFd,
      })
      .eq("id", staffUserId);

    if (error) throw new Error(error.message);
  }
}
