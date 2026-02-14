import { Referral, Patient } from "../../types";
import { KEYS, storage, DEFAULT_PATIENTS } from "./shared";
import { supabase, isSupabaseConfigured } from "../supabaseClient";

export class ReferralService {
  public async getAll(): Promise<Referral[]> {
    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching referrals:', error);
        return storage.get<Referral[]>(KEYS.REFERRALS, []);
      }

      return (data || []).map((r: any) => ({
        id: r.id,
        patientId: r.patient_id,
        patientName: r.patient_name,
        fromFacility: r.from_facility,
        toFacility: r.to_facility,
        reason: r.reason,
        status: r.status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }

    // Fallback to localStorage
    return storage.get<Referral[]>(KEYS.REFERRALS, []);
  }

  public async createFromTriage(
    patientId: string,
    reason: string,
    toFacility: string
  ): Promise<Referral> {
    // Get patient name
    let patientName = "Unknown";
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('patients')
        .select('name')
        .eq('id', patientId)
        .single();
      patientName = data?.name || "Unknown";
    } else {
      const patients = storage.get<Patient[]>(KEYS.PATIENTS, DEFAULT_PATIENTS);
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

    // Save to Supabase or localStorage
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('referrals')
        .insert({
          patient_id: patientId,
          patient_name: patientName,
          from_facility: referral.fromFacility,
          to_facility: toFacility,
          reason,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating referral:', error);
        throw error;
      }

      return {
        id: data.id,
        patientId: data.patient_id,
        patientName: data.patient_name,
        fromFacility: data.from_facility,
        toFacility: data.to_facility,
        reason: data.reason,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    // Fallback to localStorage
    const existing = storage.get<Referral[]>(KEYS.REFERRALS, []);
    storage.set(KEYS.REFERRALS, [referral, ...existing]);
    return referral;
  }

  public async updateStatus(
    id: string,
    status: Referral["status"]
  ): Promise<void> {
    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('referrals')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating referral:', error);
        throw error;
      }
      return;
    }

    // Fallback to localStorage
    const referrals = storage.get<Referral[]>(KEYS.REFERRALS, []);
    const updated = referrals.map((r) =>
      r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
    );
    storage.set(KEYS.REFERRALS, updated);
  }
}

