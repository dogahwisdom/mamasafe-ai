import { UserProfile, Patient, RiskLevel } from "../types";
import { Permissions } from "../permissions";
import { TestPatientVisibility } from "../testPatientVisibility";
import {
  KEYS,
  normalizePhone,
  phoneLookupVariants,
  storage,
  Security,
} from "./shared";
import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { MessagingService } from "./messagingService";
import { PatientRecordPurgeCoordinator } from "./patientRecordPurgeCoordinator";

export class PatientService {
  public async getAll(options?: { includeTestPatients?: boolean }): Promise<Patient[]> {
    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      // Determine current facility (clinic / pharmacy) from local session
      const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
      const includeTest = TestPatientVisibility.includeTestInListApi(
        currentUser,
        options?.includeTestPatients === true
      );

      let query = supabase
        .from('patients')
        .select(
          `
          *,
          medications (*)
        `
        )
        .order('created_at', { ascending: false });

      // Clinic/pharmacy (including employed staff): same panel as enrolling or primary coordinating facility.
      if (currentUser && (currentUser.role === 'clinic' || currentUser.role === 'pharmacy')) {
        const scopeId = Permissions.facilityOwnerUserId(currentUser);
        if (scopeId) {
          query = query.or(Permissions.facilityPatientPrimaryOrEnrollmentFilter(scopeId));
        }
      }

      if (!includeTest) {
        query = query.eq('is_test', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching patients:', error);
        return [];
      }

      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        age: p.age,
        gestationalWeeks: p.gestational_weeks || undefined,
        location: p.location,
        phone: p.phone,
        lastCheckIn: p.last_check_in || '',
        riskStatus: p.risk_status as RiskLevel,
        nextAppointment: p.next_appointment || '',
        nextFollowUpDate: p.next_follow_up_date || undefined,
        conditionType: p.condition_type || undefined,
        medicalConditions: p.medical_conditions || undefined,
        patientType: p.patient_type || 'outpatient',
        facilityId: p.facility_id || undefined,
        primaryFacilityId: p.primary_facility_id || undefined,
        primaryFacilityName: p.primary_facility_name || undefined,
        departmentServiceId: p.department_service_id || undefined,
        departmentSubcategoryId: p.department_subcategory_id || undefined,
        paymentPlanDailyKes: p.payment_plan_daily_kes ?? null,
        paymentPlanMonthlyKes: p.payment_plan_monthly_kes ?? null,
        paymentPlanAnnualKes: p.payment_plan_annual_kes ?? null,
        isTest: p.is_test === true,
        alerts: (p.alerts as any) || [],
        medications: (p.medications || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          time: m.time,
          instructions: m.instructions || '',
          type: m.type,
          adherenceRate: m.adherence_rate,
          taken: m.taken,
        })),
      }));
    }

    // Fallback to localStorage
    const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
    const includeTest = TestPatientVisibility.includeTestInListApi(
      currentUser,
      options?.includeTestPatients === true
    );
    const stored = storage.get<Patient[]>(KEYS.PATIENTS, []);
    if (includeTest) return stored;
    return stored.filter(
      (p) =>
        !(p.isTest === true) &&
        !TestPatientVisibility.nameLooksLikeTestData(p.name)
    );
  }

  /**
   * Permanently delete a patient and related records.
   * Used when a facility removes a patient from their panel.
   */
  public async delete(id: string): Promise<void> {
    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      const phone = await PatientRecordPurgeCoordinator.fetchPatientPhone(supabase, id);
      await PatientRecordPurgeCoordinator.purgeByPatientId(supabase, id, phone);
      return;
    }

    // Fallback to localStorage
    const patients = storage.get<Patient[]>(KEYS.PATIENTS, []);
    const remainingPatients = patients.filter((p) => p.id !== id);
    storage.set(KEYS.PATIENTS, remainingPatients);

    const users = storage.get<UserProfile[]>(KEYS.USERS, []);
    const remainingUsers = users.filter((u) => u.id !== id);
    storage.set(KEYS.USERS, remainingUsers);
  }

  public async add(patient: Patient): Promise<Patient> {
    const cleanPhone = normalizePhone(patient.phone);
    const phoneVariants = phoneLookupVariants(patient.phone);
    const phoneLookupList =
      cleanPhone && phoneVariants.length > 0
        ? phoneVariants
        : cleanPhone
          ? [cleanPhone]
          : [];

    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      // Determine facility enrolling this patient (clinic or pharmacy)
      const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
      const facilityId =
        currentUser && (currentUser.role === 'clinic' || currentUser.role === 'pharmacy')
          ? currentUser.id
          : null;

      // Check if patient exists (all common KE/GH written forms + mis-saved +2540XXXXXXXXX)
      let existing: { id: string; facility_id?: string | null; primary_facility_id?: string | null } | null =
        null;
      if (phoneLookupList.length > 0) {
        const { data: found } = await supabase
          .from('patients')
          .select('*')
          .in('phone', phoneLookupList)
          .limit(1)
          .maybeSingle();
        existing = found ?? null;
      }

      const patientData: any = {
        name: patient.name,
        age: patient.age,
        gestational_weeks: patient.gestationalWeeks || null,
        location: patient.location,
        phone: cleanPhone,
        last_check_in: patient.lastCheckIn || null,
        risk_status: patient.riskStatus,
        next_appointment: patient.nextAppointment || null,
        next_follow_up_date: patient.nextFollowUpDate || null,
        condition_type: patient.conditionType || null,
        department_service_id: patient.departmentServiceId || null,
        department_subcategory_id: patient.departmentSubcategoryId || null,
        medical_conditions: patient.medicalConditions ? JSON.parse(JSON.stringify(patient.medicalConditions)) : null,
        patient_type: patient.patientType || 'outpatient',
        alerts: JSON.parse(JSON.stringify(patient.alerts || [])),
        facility_id: facilityId,
        primary_facility_id: patient.primaryFacilityId || facilityId,
        primary_facility_name: patient.primaryFacilityName || currentUser?.name || null,
        payment_plan_daily_kes: patient.paymentPlanDailyKes ?? null,
        payment_plan_monthly_kes: patient.paymentPlanMonthlyKes ?? null,
        payment_plan_annual_kes: patient.paymentPlanAnnualKes ?? null,
      };

      let finalPatientId: string;

      if (existing) {
        // Update existing patient
        const { data: updated, error } = await supabase
          .from('patients')
          .update(patientData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        finalPatientId = updated.id;
      } else {
        // Create new patient
        const { data: newPatient, error } = await supabase
          .from('patients')
          .insert(patientData)
          .select()
          .single();

        if (error) throw error;
        finalPatientId = newPatient.id;
      }

      // Create/update medications if provided
      if (patient.medications && patient.medications.length > 0) {
        // Delete existing medications for this patient
        await supabase
          .from('medications')
          .delete()
          .eq('patient_id', finalPatientId);

        // Insert new medications
        const medicationsToInsert = patient.medications.map(m => ({
          patient_id: finalPatientId,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          time: m.time,
          instructions: m.instructions || null,
          type: m.type,
          adherence_rate: m.adherenceRate,
          taken: m.taken,
        }));

        await supabase
          .from('medications')
          .insert(medicationsToInsert);
      }

      // Create user account for patient
      const defaultPassword = "1234";
      const hashedPassword = Security.hash(defaultPassword);

      let existingUser: { id: string } | null = null;
      if (phoneLookupList.length > 0) {
        const { data: foundUser } = await supabase
          .from('users')
          .select('*')
          .in('phone', phoneLookupList)
          .limit(1)
          .maybeSingle();
        existingUser = foundUser ?? null;
      }

      const userData = {
        role: 'patient' as const,
        name: patient.name,
        phone: cleanPhone,
        location: patient.location,
        country_code: 'KE',
        pin_hash: hashedPassword,
        patient_data: JSON.parse(JSON.stringify({
          gestationWeeks: patient.gestationalWeeks,
          dob: `${new Date().getFullYear() - patient.age}-01-01`,
          nextOfKin: { name: "Not Listed", phone: "" },
          medicalHistory: [],
          allergies: [],
          medications: [],
          nextAppointment: patient.nextAppointment,
          riskStatus: patient.riskStatus,
        })),
      };

      let isNewUser = false;
      if (existingUser) {
        await supabase
          .from('users')
          .update(userData)
          .eq('id', existingUser.id);
      } else {
        isNewUser = true;
        await supabase
          .from('users')
          .insert({
            ...userData,
            id: finalPatientId,
          });
      }

      // Welcome + credentials:
      // 1) New login account, or
      // 2) First patient row for this phone, or
      // 3) Existing row was unassigned and is now being formally attached to a facility (common after
      //    WhatsApp auto-created shell records).
      const isFirstPatientRowForPhone = !existing;
      const enrollingFacilityId = facilityId || patient.primaryFacilityId || null;
      const wasUnassignedToFacility = Boolean(
        existing && !existing.primary_facility_id && !existing.facility_id
      );
      const isNowAssignedToFacility = Boolean(patientData.primary_facility_id || patientData.facility_id);
      const existingFacilityLinks = existing
        ? [existing.facility_id, existing.primary_facility_id].filter(Boolean)
        : [];
      const isExistingLinkedToSameFacility = Boolean(
        existing && enrollingFacilityId && existingFacilityLinks.includes(enrollingFacilityId)
      );
      const isFirstLinkToThisFacility = Boolean(
        existing && enrollingFacilityId && !existingFacilityLinks.includes(enrollingFacilityId)
      );

      let hasPriorEnrollmentWelcome = false;
      if (existing && phoneLookupList.length > 0) {
        const { data: taggedWelcomeRows } = await supabase
          .from('whatsapp_messages')
          .select('id')
          .eq('direction', 'outbound')
          .in('phone', phoneLookupList)
          .contains('raw_payload', { outboundSource: 'enrollment_welcome' })
          .limit(1);
        hasPriorEnrollmentWelcome = (taggedWelcomeRows?.length || 0) > 0;
      }

      const shouldSendEnrollmentWelcome =
        isNewUser ||
        isFirstPatientRowForPhone ||
        (wasUnassignedToFacility && isNowAssignedToFacility && !hasPriorEnrollmentWelcome) ||
        // If the patient is now being added to this facility for the first time, send welcome for this onboarding.
        isFirstLinkToThisFacility ||
        // Backfill old missed sends: same facility link exists but no tracked enrollment welcome yet.
        (isExistingLinkedToSameFacility && !hasPriorEnrollmentWelcome);

      if (shouldSendEnrollmentWelcome) {
        try {
          const messagingService = new MessagingService();
          const portalUrl = typeof window !== 'undefined' ? window.location.origin : 'https://mamasafe.ai';
          const sendResult = await messagingService.sendEnrollmentCredentials(
            cleanPhone,
            patient.name,
            defaultPassword,
            portalUrl,
            {
              facilityName: patient.primaryFacilityName || currentUser?.name || undefined,
              whatsappOptIn: patient.whatsappMessagingOptIn !== false,
              patientId: finalPatientId,
            }
          );
          if (patient.whatsappMessagingOptIn !== false && !sendResult.whatsapp) {
            console.warn(
              '[MamaSafe] Enrollment WhatsApp did not send. Check: (1) app hosted on Netlify so /.netlify/functions/whatsapp-send exists, (2) Meta WhatsApp Cloud env vars, (3) recipient opted in / number in correct international format.',
              sendResult
            );
          }
        } catch (error) {
          console.error('Error sending enrollment credentials:', error);
          // Don't throw - enrollment should succeed even if messaging fails
        }
      }

      // Return the patient with medications
      const { data: fullPatient } = await supabase
        .from('patients')
        .select(`
          *,
          medications (*)
        `)
        .eq('id', finalPatientId)
        .single();

      return {
        id: fullPatient.id,
        name: fullPatient.name,
        age: fullPatient.age,
        gestationalWeeks: fullPatient.gestational_weeks,
        location: fullPatient.location,
        phone: fullPatient.phone,
        lastCheckIn: fullPatient.last_check_in || '',
        riskStatus: fullPatient.risk_status as any,
        nextAppointment: fullPatient.next_appointment || '',
        primaryFacilityId: fullPatient.primary_facility_id || undefined,
        primaryFacilityName: fullPatient.primary_facility_name || undefined,
        isTest: fullPatient.is_test === true,
        alerts: (fullPatient.alerts as any) || [],
        medications: (fullPatient.medications || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          time: m.time,
          instructions: m.instructions || '',
          type: m.type,
          adherenceRate: m.adherence_rate,
          taken: m.taken,
        })),
      };
    }

    // Fallback to localStorage
    const patients = storage.get<Patient[]>(KEYS.PATIENTS, []);
    const existingIndex = patients.findIndex(
      (p) => normalizePhone(p.phone) === cleanPhone
    );

    let finalPatient = patient;

    if (existingIndex >= 0) {
      const existingPatient = patients[existingIndex];
      finalPatient = {
        ...existingPatient,
        ...patient,
        id: existingPatient.id,
      };
      patients[existingIndex] = finalPatient;
      storage.set(KEYS.PATIENTS, patients);
    } else {
      const newPatients = [...patients, patient];
      storage.set(KEYS.PATIENTS, newPatients);
    }

    const users = storage.get<UserProfile[]>(KEYS.USERS, []);
    const userIndex = users.findIndex(
      (u) => normalizePhone(u.phone) === cleanPhone
    );

    const defaultPassword = "1234";
    const hashedPassword = Security.hash(defaultPassword);

    const patientUser: UserProfile = {
      id: finalPatient.id,
      role: "patient",
      name: patient.name,
      phone: cleanPhone,
      location: patient.location,
      countryCode: "KE",
      pin: hashedPassword,
      patientData: {
        gestationWeeks: patient.gestationalWeeks,
        dob: `${new Date().getFullYear() - patient.age}-01-01`,
        nextOfKin: { name: "Not Listed", phone: "" },
        medicalHistory: [],
        allergies: [],
        medications: [],
        nextAppointment: patient.nextAppointment,
        riskStatus: patient.riskStatus,
      },
    };

    if (userIndex >= 0) {
      users[userIndex] = {
        ...users[userIndex],
        ...patientUser,
        pin: users[userIndex].pin,
      };
    } else {
      users.push(patientUser);
    }

    storage.set(KEYS.USERS, users);

    const enrolledNewUserAccount = userIndex < 0;
    const insertedNewPatientRow = existingIndex < 0;
    const shouldSendEnrollmentWelcomeLocal = enrolledNewUserAccount || insertedNewPatientRow;

    if (shouldSendEnrollmentWelcomeLocal) {
      try {
        const messagingService = new MessagingService();
        const portalUrl = typeof window !== 'undefined' ? window.location.origin : 'https://mamasafe.ai';
        const enrollingFacility =
          typeof window !== 'undefined' ?
            (storage.get<UserProfile | null>(KEYS.CURRENT_USER, null)?.name ?? patient.primaryFacilityName)
          : patient.primaryFacilityName;
        const sendResult = await messagingService.sendEnrollmentCredentials(
          cleanPhone,
          patient.name,
          defaultPassword,
          portalUrl,
          {
            facilityName: patient.primaryFacilityName || enrollingFacility || undefined,
            whatsappOptIn: patient.whatsappMessagingOptIn !== false,
            patientId: finalPatient.id,
          }
        );
        if (patient.whatsappMessagingOptIn !== false && !sendResult.whatsapp) {
          console.warn(
            '[MamaSafe] Enrollment WhatsApp did not send (local mode). Deploy on Netlify with whatsapp-send configured, or check browser network tab for function errors.',
            sendResult
          );
        }
      } catch (error) {
        console.error('Error sending enrollment credentials:', error);
        // Don't throw - enrollment should succeed even if messaging fails
      }
    }

    return finalPatient;
  }

  public async updateMedicationStatus(
    patientId: string,
    medicationId: string,
    taken: boolean
  ): Promise<UserProfile | null> {
    const patients = storage.get<Patient[]>(KEYS.PATIENTS, []);
    const pIndex = patients.findIndex((p) => p.id === patientId);

    if (pIndex > -1) {
      const meds = patients[pIndex].medications || [];
      const mIndex = meds.findIndex((m) => m.id === medicationId);
      if (mIndex > -1) {
        meds[mIndex].taken = taken;
        patients[pIndex].medications = meds;
        storage.set(KEYS.PATIENTS, patients);
      }
    }

    const users = storage.get<UserProfile[]>(KEYS.USERS, []);
    const uIndex = users.findIndex((u) => u.id === patientId);
    if (uIndex > -1 && users[uIndex].patientData) {
      if (pIndex > -1) {
        users[uIndex].patientData!.medications =
          patients[pIndex].medications || [];
      }
      storage.set(KEYS.USERS, users);
      const currentUser = storage.get<UserProfile | null>(
        KEYS.CURRENT_USER,
        null
      );
      if (currentUser && currentUser.id === patientId) {
        currentUser.patientData!.medications =
          users[uIndex].patientData!.medications;
        storage.set(KEYS.CURRENT_USER, currentUser);
        return currentUser;
      }
    }
    return null;
  }
}

