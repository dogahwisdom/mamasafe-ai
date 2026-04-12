import type { UserProfile } from "../types";

export type PermissionKey = "overview" | "inventory" | "expenses";

export class Permissions {
  static isOwnerOrAdmin(user: UserProfile | null | undefined): boolean {
    if (user?.role === "superadmin") return true;
    // Canonical facility owner account (seeded in many deployments)
    if (user?.id === "00000000-0000-0000-0000-000000000001") return true;
    const r = user?.facilityData?.permissionRole;
    return r === "owner" || r === "admin";
  }

  /**
   * Facility user id used for staff membership checks: clinic/pharmacy root = own id;
   * staff rows use `employerFacilityId`.
   */
  static facilityOwnerUserId(manager: UserProfile | null | undefined): string | null {
    if (!manager || manager.role === "superadmin") return null;
    if (manager.employerFacilityId) return manager.employerFacilityId;
    if (manager.role === "clinic" || manager.role === "pharmacy") return manager.id;
    return null;
  }

  /** Whether `manager` may load/update `target` in the Permissions UI (server still uses RLS). */
  static canManageStaffProfile(
    manager: UserProfile | null | undefined,
    target: UserProfile | null | undefined
  ): boolean {
    if (!manager || !target) return false;
    if (manager.role === "superadmin") return true;
    if (!Permissions.isOwnerOrAdmin(manager)) return false;
    if (target.id === manager.id) return true;
    const rootId = Permissions.facilityOwnerUserId(manager);
    if (!rootId) return false;
    return target.employerFacilityId === rootId;
  }

  static canAccess(user: UserProfile | null | undefined, key: PermissionKey): boolean {
    if (!user) return false;
    if (user.role === "superadmin") return true;
    if (user.role === "patient") return key === "overview";

    // Owners/admins default to all.
    if (Permissions.isOwnerOrAdmin(user)) return true;

    // For other facility staff, require explicit allow.
    const p = user.facilityData?.permissions;
    if (!p) return false;
    return !!p[key];
  }
}

