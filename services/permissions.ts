import type { UserProfile } from "../types";

export type PermissionKey = "overview" | "inventory" | "expenses";

export class Permissions {
  static isOwnerOrAdmin(user: UserProfile | null | undefined): boolean {
    const r = user?.facilityData?.permissionRole;
    return r === "owner" || r === "admin";
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

