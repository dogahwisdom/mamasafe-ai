import { ClinicVisit, ClinicalHistory, LabRequest, Diagnosis, Payment } from "../../types";
import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { storage, KEYS } from "./shared";
import { UserProfile } from "../../types";

export class ClinicWorkflowService {
  /**
   * Create a new clinic visit (Registration/Reception)
   */
  public async createVisit(
    patientId: string,
    patientName: string,
    visitType: 'outpatient' | 'inpatient' | 'emergency' | 'followup',
    receptionNotes?: string
  ): Promise<ClinicVisit> {
    if (isSupabaseConfigured()) {
      const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
      
      if (!currentUser || (currentUser.role !== 'clinic' && currentUser.role !== 'pharmacy')) {
        throw new Error('Only clinics can create visits');
      }

      const { data, error } = await supabase
        .from('clinic_visits')
        .insert({
          patient_id: patientId,
          patient_name: patientName,
          facility_id: currentUser.id,
          visit_type: visitType,
          reception_notes: receptionNotes || null,
          registered_by: currentUser.id,
          status: 'registered',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating visit:', error);
        throw error;
      }

      return this.mapVisitFromDB(data);
    }

    throw new Error('Supabase not configured');
  }

  /**
   * Get all visits for the current facility
   */
  public async getVisits(
    status?: 'registered' | 'in_progress' | 'completed' | 'cancelled',
    startDate?: string,
    endDate?: string
  ): Promise<ClinicVisit[]> {
    if (isSupabaseConfigured()) {
      const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
      
      if (!currentUser || (currentUser.role !== 'clinic' && currentUser.role !== 'pharmacy')) {
        return [];
      }

      let query = supabase
        .from('clinic_visits')
        .select('*')
        .eq('facility_id', currentUser.id)
        .order('visit_date', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (startDate) {
        query = query.gte('visit_date', startDate);
      }

      if (endDate) {
        query = query.lte('visit_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching visits:', error);
        return [];
      }

      return (data || []).map(this.mapVisitFromDB);
    }

    return [];
  }

  /**
   * Get visit by ID with all related data
   */
  public async getVisitById(visitId: string): Promise<{
    visit: ClinicVisit;
    clinicalHistory?: ClinicalHistory;
    labRequests: LabRequest[];
    diagnoses: Diagnosis[];
    payments: Payment[];
  }> {
    if (isSupabaseConfigured()) {
      const { data: visit, error: visitError } = await supabase
        .from('clinic_visits')
        .select('*')
        .eq('id', visitId)
        .single();

      if (visitError || !visit) {
        throw new Error('Visit not found');
      }

      const [clinicalHistory, labRequests, diagnoses, payments] = await Promise.all([
        supabase.from('clinical_history').select('*').eq('visit_id', visitId).maybeSingle(),
        supabase.from('lab_requests').select('*').eq('visit_id', visitId),
        supabase.from('diagnoses').select('*').eq('visit_id', visitId),
        supabase.from('payments').select('*').eq('visit_id', visitId),
      ]);

      return {
        visit: this.mapVisitFromDB(visit),
        clinicalHistory: clinicalHistory.data ? this.mapClinicalHistoryFromDB(clinicalHistory.data) : undefined,
        labRequests: (labRequests.data || []).map(this.mapLabRequestFromDB),
        diagnoses: (diagnoses.data || []).map(this.mapDiagnosisFromDB),
        payments: (payments.data || []).map(this.mapPaymentFromDB),
      };
    }

    throw new Error('Supabase not configured');
  }

  /**
   * Update visit status
   */
  public async updateVisitStatus(
    visitId: string,
    status: 'registered' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('clinic_visits')
        .update({ status })
        .eq('id', visitId);

      if (error) {
        console.error('Error updating visit status:', error);
        throw error;
      }
    }
  }

  /**
   * Save clinical history
   */
  public async saveClinicalHistory(
    visitId: string,
    patientId: string,
    chiefComplaint: string,
    data: Partial<ClinicalHistory>
  ): Promise<ClinicalHistory> {
    if (isSupabaseConfigured()) {
      const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);

      // Check if history already exists
      const { data: existing } = await supabase
        .from('clinical_history')
        .select('*')
        .eq('visit_id', visitId)
        .maybeSingle();

      const historyData: any = {
        visit_id: visitId,
        patient_id: patientId,
        chief_complaint: chiefComplaint,
        history_of_present_illness: data.historyOfPresentIllness || null,
        past_medical_history: data.pastMedicalHistory || null,
        family_history: data.familyHistory || null,
        social_history: data.socialHistory || null,
        allergies: data.allergies || null,
        current_medications: data.currentMedications || null,
        vital_signs: data.vitalSigns ? JSON.parse(JSON.stringify(data.vitalSigns)) : null,
        physical_examination: data.physicalExamination || null,
        recorded_by: currentUser?.id || null,
      };

      let result;
      if (existing) {
        const { data: updated, error } = await supabase
          .from('clinical_history')
          .update(historyData)
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        result = updated;
      } else {
        const { data: inserted, error } = await supabase
          .from('clinical_history')
          .insert(historyData)
          .select()
          .single();
        
        if (error) throw error;
        result = inserted;
      }

      return this.mapClinicalHistoryFromDB(result);
    }

    throw new Error('Supabase not configured');
  }

  /**
   * Create lab request
   */
  public async createLabRequest(
    visitId: string,
    patientId: string,
    testName: string,
    testType: 'blood' | 'urine' | 'stool' | 'imaging' | 'other',
    priority: 'routine' | 'urgent' | 'stat' = 'routine',
    clinicalIndication?: string
  ): Promise<LabRequest> {
    if (isSupabaseConfigured()) {
      const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
      
      if (!currentUser || (currentUser.role !== 'clinic' && currentUser.role !== 'pharmacy')) {
        throw new Error('Only clinics can create lab requests');
      }

      const { data, error } = await supabase
        .from('lab_requests')
        .insert({
          visit_id: visitId,
          patient_id: patientId,
          facility_id: currentUser.id,
          test_name: testName,
          test_type: testType,
          priority: priority,
          clinical_indication: clinicalIndication || null,
          status: 'requested',
          ordered_by: currentUser.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating lab request:', error);
        throw error;
      }

      return this.mapLabRequestFromDB(data);
    }

    throw new Error('Supabase not configured');
  }

  /**
   * Create diagnosis
   */
  public async createDiagnosis(
    visitId: string,
    patientId: string,
    diagnosisName: string,
    diagnosisType: 'primary' | 'secondary' | 'differential' | 'provisional' = 'primary',
    data?: Partial<Diagnosis>
  ): Promise<Diagnosis> {
    if (isSupabaseConfigured()) {
      const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);

      const diagnosisData: any = {
        visit_id: visitId,
        patient_id: patientId,
        diagnosis_name: diagnosisName,
        diagnosis_type: diagnosisType,
        diagnosis_code: data?.diagnosisCode || null,
        description: data?.description || null,
        severity: data?.severity || null,
        status: data?.status || 'active',
        diagnosed_by: currentUser?.id || null,
      };

      const { data: result, error } = await supabase
        .from('diagnoses')
        .insert(diagnosisData)
        .select()
        .single();

      if (error) {
        console.error('Error creating diagnosis:', error);
        throw error;
      }

      return this.mapDiagnosisFromDB(result);
    }

    throw new Error('Supabase not configured');
  }

  /**
   * Create payment
   */
  public async createPayment(
    visitId: string | undefined,
    patientId: string,
    paymentType: 'consultation' | 'lab' | 'pharmacy' | 'procedure' | 'other',
    amount: number,
    paymentMethod: 'cash' | 'mpesa' | 'card' | 'insurance' | 'nhif' | 'waiver',
    data?: Partial<Payment>
  ): Promise<Payment> {
    if (isSupabaseConfigured()) {
      const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
      
      if (!currentUser || (currentUser.role !== 'clinic' && currentUser.role !== 'pharmacy')) {
        throw new Error('Only facilities can create payments');
      }

      const paymentData: any = {
        visit_id: visitId || null,
        patient_id: patientId,
        facility_id: currentUser.id,
        payment_type: paymentType,
        amount: amount,
        currency: data?.currency || 'KES',
        payment_method: paymentMethod,
        payment_status: data?.paymentStatus || 'paid',
        transaction_reference: data?.transactionReference || null,
        insurance_provider: data?.insuranceProvider || null,
        insurance_number: data?.insuranceNumber || null,
        nhif_number: data?.nhifNumber || null,
        notes: data?.notes || null,
        paid_by: currentUser.id,
      };

      const { data: result, error } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (error) {
        console.error('Error creating payment:', error);
        throw error;
      }

      return this.mapPaymentFromDB(result);
    }

    throw new Error('Supabase not configured');
  }

  // Mapper functions
  private mapVisitFromDB(data: any): ClinicVisit {
    return {
      id: data.id,
      patientId: data.patient_id,
      patientName: data.patient_name,
      facilityId: data.facility_id,
      visitType: data.visit_type,
      visitDate: data.visit_date,
      registrationTime: data.registration_time,
      receptionNotes: data.reception_notes,
      registeredBy: data.registered_by,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapClinicalHistoryFromDB(data: any): ClinicalHistory {
    return {
      id: data.id,
      visitId: data.visit_id,
      patientId: data.patient_id,
      chiefComplaint: data.chief_complaint,
      historyOfPresentIllness: data.history_of_present_illness,
      pastMedicalHistory: data.past_medical_history,
      familyHistory: data.family_history,
      socialHistory: data.social_history,
      allergies: data.allergies,
      currentMedications: data.current_medications,
      vitalSigns: data.vital_signs,
      physicalExamination: data.physical_examination,
      recordedBy: data.recorded_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapLabRequestFromDB(data: any): LabRequest {
    return {
      id: data.id,
      visitId: data.visit_id,
      patientId: data.patient_id,
      facilityId: data.facility_id,
      testName: data.test_name,
      testType: data.test_type,
      testCategory: data.test_category,
      clinicalIndication: data.clinical_indication,
      priority: data.priority,
      status: data.status,
      results: data.results,
      resultsFileUrl: data.results_file_url,
      orderedBy: data.ordered_by,
      completedBy: data.completed_by,
      orderedAt: data.ordered_at,
      completedAt: data.completed_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapDiagnosisFromDB(data: any): Diagnosis {
    return {
      id: data.id,
      visitId: data.visit_id,
      patientId: data.patient_id,
      diagnosisCode: data.diagnosis_code,
      diagnosisName: data.diagnosis_name,
      diagnosisType: data.diagnosis_type,
      description: data.description,
      severity: data.severity,
      status: data.status,
      diagnosedBy: data.diagnosed_by,
      diagnosisDate: data.diagnosis_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapPaymentFromDB(data: any): Payment {
    return {
      id: data.id,
      visitId: data.visit_id,
      patientId: data.patient_id,
      facilityId: data.facility_id,
      paymentType: data.payment_type,
      amount: parseFloat(data.amount),
      currency: data.currency,
      paymentMethod: data.payment_method,
      paymentStatus: data.payment_status,
      transactionReference: data.transaction_reference,
      insuranceProvider: data.insurance_provider,
      insuranceNumber: data.insurance_number,
      nhifNumber: data.nhif_number,
      notes: data.notes,
      paidBy: data.paid_by,
      paymentDate: data.payment_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
