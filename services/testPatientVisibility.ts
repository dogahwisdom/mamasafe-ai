import type { UserProfile } from "../types";

/**
 * Controls whether QA/test patients appear in facility-facing lists.
 * DB column `patients.is_test` is authoritative when present; name heuristics cover legacy rows.
 */
export class TestPatientVisibility {
  /** Known automation / terminal naming patterns (legacy rows without is_test). */
  static nameLooksLikeTestData(name: string | undefined | null): boolean {
    const n = String(name || "")
      .trim()
      .toLowerCase();
    if (!n) return false;
    if (n === "terminal test user") return true;
    if (n.includes("terminal test")) return true;
    return false;
  }

  static patientIsTest(p: { isTest?: boolean; name: string }): boolean {
    if (p.isTest === true) return true;
    if (p.isTest === false) return false;
    return TestPatientVisibility.nameLooksLikeTestData(p.name);
  }

  /** Superadmins can opt in to see test rows in list endpoints. */
  static includeTestInListApi(user: UserProfile | null | undefined, userToggledShowTest: boolean): boolean {
    if (userToggledShowTest && user?.role === "superadmin") return true;
    return false;
  }
}
