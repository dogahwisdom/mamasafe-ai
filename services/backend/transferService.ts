import { PatientTransfer } from "../../types";
import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { storage, KEYS } from "./shared";
import { UserProfile } from "../../types";

export class TransferService {
  /**
   * Check if a patient with the given phone number already exists in the system
   */
  public async findPatientByPhone(phone: string): Promise<{
    exists: boolean;
    patientId?: string;
    patientName?: string;
    facilityId?: string;
    facilityName?: string;
  }> {
    if (isSupabaseConfigured()) {
      // Normalize phone number for comparison
      const normalizedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
      
      // Try multiple phone formats
      const phoneVariations = [
        phone,
        phone.replace(/\s+/g, ''),
        phone.replace(/^\+/, ''),
        `+${phone.replace(/^\+/, '')}`,
        normalizedPhone,
        `+${normalizedPhone}`,
      ];

      let foundPatient: any = null;
      let facilityName = 'Unknown Facility';

      // Try each phone variation
      for (const phoneVar of phoneVariations) {
        const { data, error } = await supabase
          .from('patients')
          .select('id, name, facility_id')
          .eq('phone', phoneVar)
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          foundPatient = data;
          // Get facility name if facility_id exists
          if (data.facility_id) {
            const { data: facilityData } = await supabase
              .from('users')
              .select('name')
              .eq('id', data.facility_id)
              .maybeSingle();
            
            if (facilityData) {
              facilityName = facilityData.name;
            }
          }
          break;
        }
      }

      if (foundPatient) {
        return {
          exists: true,
          patientId: foundPatient.id,
          patientName: foundPatient.name,
          facilityId: foundPatient.facility_id,
          facilityName: facilityName,
        };
      }
    }

    return { exists: false };
  }

  /**
   * Create a transfer request
   */
  public async requestTransfer(
    patientId: string,
    patientName: string,
    patientPhone: string,
    fromFacilityId: string,
    fromFacilityName: string,
    toFacilityId: string,
    toFacilityName: string,
    reason?: string
  ): Promise<PatientTransfer> {
    if (isSupabaseConfigured()) {
      const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
      
      const { data, error } = await supabase
        .from('patient_transfers')
        .insert({
          patient_id: patientId,
          patient_name: patientName,
          patient_phone: patientPhone,
          from_facility_id: fromFacilityId,
          from_facility_name: fromFacilityName,
          to_facility_id: toFacilityId,
          to_facility_name: toFacilityName,
          reason: reason || null,
          status: 'pending',
          requested_by: currentUser?.id || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating transfer request:', error);
        throw error;
      }

      return this.mapTransferFromDB(data);
    }

    throw new Error('Supabase not configured');
  }

  /**
   * Get all transfer requests for the current facility
   */
  public async getTransfers(status?: 'pending' | 'approved' | 'rejected' | 'cancelled'): Promise<PatientTransfer[]> {
    if (isSupabaseConfigured()) {
      const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
      
      if (!currentUser || (currentUser.role !== 'clinic' && currentUser.role !== 'pharmacy')) {
        return [];
      }

      let query = supabase
        .from('patient_transfers')
        .select('*')
        .or(`from_facility_id.eq.${currentUser.id},to_facility_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching transfers:', error);
        return [];
      }

      return (data || []).map(this.mapTransferFromDB);
    }

    return [];
  }

  /**
   * Approve a transfer request
   */
  public async approveTransfer(
    transferId: string,
    approvedBy: string
  ): Promise<void> {
    if (isSupabaseConfigured()) {
      // Get the transfer to find patient_id
      const { data: transfer, error: fetchError } = await supabase
        .from('patient_transfers')
        .select('patient_id, to_facility_id')
        .eq('id', transferId)
        .single();

      if (fetchError || !transfer) {
        throw new Error('Transfer request not found');
      }

      // Update transfer status
      const { error: updateError } = await supabase
        .from('patient_transfers')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
        })
        .eq('id', transferId);

      if (updateError) {
        console.error('Error approving transfer:', updateError);
        throw updateError;
      }

      // Update patient's facility_id to the new facility
      const { error: patientUpdateError } = await supabase
        .from('patients')
        .update({ facility_id: transfer.to_facility_id })
        .eq('id', transfer.patient_id);

      if (patientUpdateError) {
        console.error('Error updating patient facility:', patientUpdateError);
        throw patientUpdateError;
      }
    }
  }

  /**
   * Reject a transfer request
   */
  public async rejectTransfer(
    transferId: string,
    rejectedBy: string,
    rejectionReason?: string
  ): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('patient_transfers')
        .update({
          status: 'rejected',
          rejected_by: rejectedBy,
          rejection_reason: rejectionReason || null,
          rejected_at: new Date().toISOString(),
        })
        .eq('id', transferId);

      if (error) {
        console.error('Error rejecting transfer:', error);
        throw error;
      }
    }
  }

  private mapTransferFromDB(data: any): PatientTransfer {
    return {
      id: data.id,
      patientId: data.patient_id,
      patientName: data.patient_name,
      patientPhone: data.patient_phone,
      fromFacilityId: data.from_facility_id,
      fromFacilityName: data.from_facility_name,
      toFacilityId: data.to_facility_id,
      toFacilityName: data.to_facility_name,
      reason: data.reason,
      status: data.status,
      requestedBy: data.requested_by,
      approvedBy: data.approved_by,
      rejectedBy: data.rejected_by,
      rejectionReason: data.rejection_reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      approvedAt: data.approved_at,
      rejectedAt: data.rejected_at,
    };
  }
}
