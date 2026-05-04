import type { UserProfile } from "../types";

/**
 * Controls whether QA/test patients appear in facility-facing lists.
 * Supabase: `patients.is_test` only (see migration). LocalStorage demo mode has no column — name heuristic only there.
 */
export class TestPatientVisibility {
  /** LocalStorage-only fallback (no `is_test` on stored referral/task rows). */
  static nameLooksLikeTestData(name: string | undefined | null): boolean {
    const n = String(name || "")
      .trim()
      .toLowerCase();
    if (!n) return false;
    if (n === "terminal test user") return true;
    if (n.includes("terminal test")) return true;
    return false;
  }

  /** Superadmins can opt in to see test rows in list endpoints. */
  static includeTestInListApi(user: UserProfile | null | undefined, userToggledShowTest: boolean): boolean {
    return userToggledShowTest && user?.role === "superadmin";
  }
}
