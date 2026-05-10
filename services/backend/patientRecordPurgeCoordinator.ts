import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone, phoneLookupVariants } from "./shared";

/**
 * Best-effort deletion of all app data tied to a patient, including messaging and AI logs,
 * then login rows. Each table is isolated so a missing table/column does not block the rest.
 */
export class PatientRecordPurgeCoordinator {
  private static async deleteEq(
    supabase: SupabaseClient,
    table: string,
    column: string,
    value: string
  ): Promise<void> {
    try {
      const { error } = await supabase.from(table).delete().eq(column, value);
      if (error) {
        console.warn(`[PatientPurge] ${table}.${column}:`, error.message);
      }
    } catch (e) {
      console.warn(`[PatientPurge] ${table}.${column}:`, e);
    }
  }

  public static async purgeByPatientId(
    supabase: SupabaseClient,
    patientId: string,
    normalizedPhone?: string | null
  ): Promise<void> {
    const phone = normalizedPhone?.trim() || null;

    await this.deleteEq(supabase, "medications", "patient_id", patientId);
    await this.deleteEq(supabase, "tasks", "patient_id", patientId);
    await this.deleteEq(supabase, "referrals", "patient_id", patientId);
    await this.deleteEq(supabase, "reminders", "patient_id", patientId);

    await this.deleteEq(supabase, "ai_conversations", "patient_id", patientId);
    await this.deleteEq(supabase, "resolved_tasks_log", "patient_id", patientId);

    await this.deleteEq(supabase, "patient_transfers", "patient_id", patientId);
    await this.deleteEq(supabase, "dispensing_records", "patient_id", patientId);

    await this.deleteEq(supabase, "whatsapp_messages", "patient_id", patientId);
    await this.deleteEq(supabase, "whatsapp_sessions", "patient_id", patientId);

    const workflowTables = [
      "payments",
      "diagnoses",
      "lab_requests",
      "clinical_history",
      "clinic_visits",
    ];
    for (const t of workflowTables) {
      await this.deleteEq(supabase, t, "patient_id", patientId);
    }

    if (phone && phone.length >= 8) {
      const variants = new Set<string>(phoneLookupVariants(phone));
      variants.add(phone);
      if (phone.startsWith("+")) {
        variants.add(phone.slice(1));
      }
      for (const pv of variants) {
        const p = pv.trim();
        if (!p) continue;
        await this.deleteEq(supabase, "whatsapp_messages", "phone", p);
        await this.deleteEq(supabase, "whatsapp_sessions", "phone", p);
      }
    }

    try {
      await supabase.from("users").delete().eq("id", patientId);
    } catch (e) {
      console.warn("[PatientPurge] users by id:", e);
    }

    if (phone && phone.length >= 8) {
      const userPhoneVariants = new Set<string>(phoneLookupVariants(phone));
      userPhoneVariants.add(phone);
      if (phone.startsWith("+")) {
        userPhoneVariants.add(phone.slice(1));
      }
      for (const p of userPhoneVariants) {
        if (!p.trim()) continue;
        try {
          const { error } = await supabase
            .from("users")
            .delete()
            .eq("role", "patient")
            .eq("phone", p.trim());
          if (error) {
            console.warn("[PatientPurge] users by phone+patient:", error.message);
          }
        } catch (e) {
          console.warn("[PatientPurge] users by phone+patient:", e);
        }
      }
    }

    try {
      const { error } = await supabase.from("patients").delete().eq("id", patientId);
      if (error) {
        console.warn("[PatientPurge] patients:", error.message);
        throw error;
      }
    } catch (e) {
      if (e && typeof e === "object" && "message" in e) throw e;
      throw new Error(String(e));
    }
  }

  /** Load phone from DB when caller only has id (e.g. delete from Patients list). */
  public static async fetchPatientPhone(
    supabase: SupabaseClient,
    patientId: string
  ): Promise<string | null> {
    try {
      const { data } = await supabase
        .from("patients")
        .select("phone")
        .eq("id", patientId)
        .maybeSingle();
      const raw = (data?.phone as string | undefined)?.trim();
      return raw ? normalizePhone(raw) : null;
    } catch {
      return null;
    }
  }
}
