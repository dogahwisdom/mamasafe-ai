import { DispensingRecord } from "../../types";
import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { storage, KEYS } from "./shared";
import { UserProfile } from "../../types";

export class DispensingService {
  /**
   * Create a dispensing record
   */
  public async createDispensingRecord(
    patientId: string,
    patientName: string,
    medicationName: string,
    dosage: string,
    quantity: number = 1,
    unit: string = 'tablets',
    nextFollowUpDate?: string,
    notes?: string
  ): Promise<DispensingRecord> {
    if (isSupabaseConfigured()) {
      const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
      
      if (!currentUser || currentUser.role !== 'pharmacy') {
        throw new Error('Only pharmacies can create dispensing records');
      }

      const { data, error } = await supabase
        .from('dispensing_records')
        .insert({
          patient_id: patientId,
          patient_name: patientName,
          medication_name: medicationName,
          dosage: dosage,
          quantity: quantity,
          unit: unit || 'tablets',
          pharmacy_id: currentUser.id,
          dispensed_by: currentUser.id,
          next_follow_up_date: nextFollowUpDate || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating dispensing record:', error);
        throw error;
      }

      // Update patient's next_follow_up_date if provided
      if (nextFollowUpDate) {
        await supabase
          .from('patients')
          .update({ next_follow_up_date: nextFollowUpDate })
          .eq('id', patientId);
      }

      return this.mapDispensingFromDB(data);
    }

    throw new Error('Supabase not configured');
  }

  /**
   * Get all dispensing records for the current pharmacy
   */
  public async getDispensingRecords(
    patientId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<DispensingRecord[]> {
    if (isSupabaseConfigured()) {
      const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
      
      if (!currentUser || currentUser.role !== 'pharmacy') {
        return [];
      }

      let query = supabase
        .from('dispensing_records')
        .select('*')
        .eq('pharmacy_id', currentUser.id)
        .order('dispensed_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      if (startDate) {
        query = query.gte('dispensed_at', startDate);
      }

      if (endDate) {
        query = query.lte('dispensed_at', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching dispensing records:', error);
        return [];
      }

      return (data || []).map(this.mapDispensingFromDB);
    }

    return [];
  }

  /**
   * Get dispensing records for today
   */
  public async getDispensedToday(): Promise<DispensingRecord[]> {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    return this.getDispensingRecords(undefined, today, tomorrowStr);
  }

  /**
   * Get patients with upcoming follow-up dates
   */
  public async getUpcomingFollowUps(daysAhead: number = 7): Promise<Array<{
    patientId: string;
    patientName: string;
    nextFollowUpDate: string;
    lastDispensed: string;
    medication: string;
  }>> {
    if (isSupabaseConfigured()) {
      const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
      
      if (!currentUser || currentUser.role !== 'pharmacy') {
        return [];
      }

      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      // Get patients with follow-up dates within the range
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('id, name, next_follow_up_date')
        .eq('facility_id', currentUser.id)
        .not('next_follow_up_date', 'is', null)
        .gte('next_follow_up_date', today.toISOString().split('T')[0])
        .lte('next_follow_up_date', futureDate.toISOString().split('T')[0])
        .order('next_follow_up_date', { ascending: true });

      if (patientsError || !patients) {
        return [];
      }

      // Get last dispensing record for each patient
      const result = await Promise.all(
        patients.map(async (patient) => {
          const { data: lastDispensing } = await supabase
            .from('dispensing_records')
            .select('medication_name, dispensed_at')
            .eq('patient_id', patient.id)
            .order('dispensed_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            patientId: patient.id,
            patientName: patient.name,
            nextFollowUpDate: patient.next_follow_up_date,
            lastDispensed: lastDispensing?.dispensed_at || '',
            medication: lastDispensing?.medication_name || 'Unknown',
          };
        })
      );

      return result;
    }

    return [];
  }

  private mapDispensingFromDB(data: any): DispensingRecord {
    return {
      id: data.id,
      patientId: data.patient_id,
      patientName: data.patient_name,
      medicationName: data.medication_name,
      dosage: data.dosage,
      quantity: data.quantity,
      unit: data.unit,
      dispensedBy: data.dispensed_by,
      pharmacyId: data.pharmacy_id,
      nextFollowUpDate: data.next_follow_up_date,
      notes: data.notes,
      dispensedAt: data.dispensed_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
