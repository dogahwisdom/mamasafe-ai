import { Referral, Patient } from "../../types";
import { KEYS, storage } from "./shared";
import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { TestPatientVisibility } from "../testPatientVisibility";

function mapReferralRow(r: any): Referral {
  return {
    id: r.id,
    patientId: r.patient_id,
    patientName: r.patient_name,
    fromFacility: r.from_facility,
    toFacility: r.to_facility,
    reason: r.reason,
    status: r.status as Referral["status"],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class ReferralService {
  /**
   * Facility-wide referral list. Excludes test/QA patients unless `includeTestPatients`.
   */
  public async getAll(options?: { includeTestPatients?: boolean }): Promise<Referral[]> {
    const includeTest = options?.includeTestPatients === true;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("referrals")
        .select(
          `
          id,
          patient_id,
          patient_name,
          from_facility,
          to_facility,
          reason,
          status,
          created_at,
          updated_at,
          patients ( is_test )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching referrals:", error);
        return storage.get<Referral[]>(KEYS.REFERRALS, []);
      }

      let rows = data || [];
      if (!includeTest) {
        rows = rows.filter((r: any) => {
          const flag = r.patients?.is_test;
          if (flag === true) return false;
          if (flag === false) return true;
          return !TestPatientVisibility.nameLooksLikeTestData(r.patient_name);
        });
      }

      return rows.map((r: any) => mapReferralRow(r));
    }

    const stored = storage.get<Referral[]>(KEYS.REFERRALS, []);
    if (includeTest) return stored;
    return stored.filter((r) => !TestPatientVisibility.nameLooksLikeTestData(r.patientName));
  }

  /** All referrals for one patient (profile / PDF) — not filtered by is_test. */
  public async listForPatient(patientId: string): Promise<Referral[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching referrals for patient:", error);
        return [];
      }
      return (data || []).map(mapReferralRow);
    }

    const stored = storage.get<Referral[]>(KEYS.REFERRALS, []);
    return stored.filter((r) => r.patientId === patientId);
  }

  public async createFromTriage(
    patientId: string,
    reason: string,
    toFacility: string
  ): Promise<Referral> {
    let patientName = "Unknown";
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from("patients").select("name").eq("id", patientId).single();
      patientName = data?.name || "Unknown";
    } else {
      const patients = storage.get<Patient[]>(KEYS.PATIENTS, []);
      const patient = patients.find((p) => p.id === patientId);
      patientName = patient?.name || "Unknown";
    }

    const now = new Date().toISOString();
    const referral: Referral = {
      id: `ref_${Date.now()}`,
      patientId,
      patientName,
      fromFacility: "MamaSafe Clinic",
      toFacility,
      reason,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("referrals")
        .insert({
          patient_id: patientId,
          patient_name: patientName,
          from_facility: referral.fromFacility,
          to_facility: toFacility,
          reason,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating referral:", error);
        throw error;
      }

      return mapReferralRow(data);
    }

    const existing = storage.get<Referral[]>(KEYS.REFERRALS, []);
    storage.set(KEYS.REFERRALS, [referral, ...existing]);
    return referral;
  }

  public async updateStatus(id: string, status: Referral["status"]): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from("referrals")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Error updating referral:", error);
        throw error;
      }
      return;
    }

    const referrals = storage.get<Referral[]>(KEYS.REFERRALS, []);
    const updated = referrals.map((r) =>
      r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
    );
    storage.set(KEYS.REFERRALS, updated);
  }
}
