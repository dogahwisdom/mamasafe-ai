import { UserProfile, Patient, RiskLevel } from "../types";
import {
  KEYS,
  normalizePhone,
  storage,
  Security,
} from "./shared";
import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { MessagingService } from "./messagingService";

export class PatientService {
  public async getAll(): Promise<Patient[]> {
    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          medications (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching patients:', error);
        return [];
      }

      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        age: p.age,
        gestationalWeeks: p.gestational_weeks,
        location: p.location,
        phone: p.phone,
        lastCheckIn: p.last_check_in || '',
        riskStatus: p.risk_status as RiskLevel,
        nextAppointment: p.next_appointment || '',
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
    return storage.get<Patient[]>(KEYS.PATIENTS, []);
  }

  public async add(patient: Patient): Promise<Patient> {
    const cleanPhone = normalizePhone(patient.phone);

    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      // Check if patient exists
      const { data: existing } = await supabase
        .from('patients')
        .select('*')
        .eq('phone', cleanPhone)
        .single();

      const patientData = {
        name: patient.name,
        age: patient.age,
        gestational_weeks: patient.gestationalWeeks,
        location: patient.location,
        phone: cleanPhone,
        last_check_in: patient.lastCheckIn || null,
        risk_status: patient.riskStatus,
        next_appointment: patient.nextAppointment || null,
        alerts: JSON.parse(JSON.stringify(patient.alerts || [])),
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

      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('phone', cleanPhone)
        .single();

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
        await supabase
          .from('users')
          .insert({
            ...userData,
            id: finalPatientId,
          });
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

