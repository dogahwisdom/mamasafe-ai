
export type UserRole = 'patient' | 'clinic' | 'pharmacy' | 'superadmin';

export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string; // Facility Name or Patient Name
  phone: string;
  email?: string; // Added email field
  location: string;
  avatar?: string;
  countryCode?: string;
  subscriptionPlan?: string;
  // Role specific data
  patientData?: PatientExtension;
  facilityData?: FacilityExtension;
  pin?: string; // Hashed in backend
}

export interface PatientExtension {
  gestationWeeks: number;
  dob: string;
  nextOfKin: { name: string; phone: string };
  medicalHistory: string[];
  allergies: string[];
  medications: Medication[];
  nextAppointment: string;
  riskStatus: RiskLevel;
}

export interface FacilityExtension {
  managerName: string;
  licenseNumber?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  adherenceRate: number;
  // Enhanced fields for tracking
  time: string; // e.g. "08:00 AM"
  instructions: string;
  taken: boolean;
  type: 'morning' | 'afternoon' | 'evening';
}

export type ConditionType = 'pregnancy' | 'diabetes' | 'hypertension' | 'tuberculosis' | 'other' | null;

export interface Patient {
  id: string;
  name: string;
  age: number;
  gestationalWeeks?: number; // Optional - not all patients are pregnant
  location: string;
  phone: string;
  lastCheckIn: string; // ISO date
  riskStatus: RiskLevel;
  nextAppointment: string; // ISO date
  nextFollowUpDate?: string; // ISO date - for pharmacy/clinic follow-up
  conditionType?: ConditionType; // Primary condition
  patientType?: 'outpatient' | 'inpatient'; // Patient type
  medicalConditions?: Array<{
    type: ConditionType;
    diagnosisDate?: string;
    severity?: 'mild' | 'moderate' | 'severe';
    notes?: string;
  }>; // Multiple conditions support
  alerts: Alert[];
  medications?: Medication[];
  facilityId?: string; // Current facility managing this patient
}

export interface Alert {
  id: string;
  type: 'symptom' | 'missed_appointment' | 'system' | 'medication';
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  resolved: boolean;
}

// Pharmacy Specific Types
export interface RefillRequest {
  id: string;
  patientName: string;
  initials: string;
  medication: string;
  dosage: string;
  duration: string;
  status: 'pending' | 'dispensed';
  requestTime: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  minLevel: number;
  unit: string;
}

// Patient Transfer Types
export interface PatientTransfer {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  fromFacilityId: string;
  fromFacilityName: string;
  toFacilityId: string;
  toFacilityName: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedBy?: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
}

// Dispensing Record Types
export interface DispensingRecord {
  id: string;
  patientId: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  quantity: number;
  unit: string;
  dispensedBy?: string;
  pharmacyId: string;
  nextFollowUpDate?: string; // ISO date
  notes?: string;
  dispensedAt: string; // ISO datetime
  createdAt: string;
  updatedAt: string;
}

// Clinic Specific Types
export interface Task {
  id: string;
  patientName: string;
  patientId: string;
  type: 'High Risk' | 'Missed Visit' | 'No Consent' | 'Triage Alert';
  deadline: string; // Display string like "Due in 2h"
  resolved: boolean;
  notes?: string;
  timestamp: number; // For sorting
  resolvedAt?: number;
}

export interface TriageResult {
  riskLevel: RiskLevel;
  reasoning: string;
  recommendedAction: string;
  draftResponse: string;
}

export interface Reminder {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  channel: 'whatsapp' | 'sms';
  type: 'appointment' | 'medication' | 'symptom_checkin';
  message: string;
  scheduledFor: string; // ISO datetime
  sent: boolean;
  sentAt?: string;
}

export interface Referral {
  id: string;
  patientId: string;
  patientName: string;
  fromFacility: string;
  toFacility: string;
  reason: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// Clinic Workflow Types
export interface ClinicVisit {
  id: string;
  patientId: string;
  patientName: string;
  facilityId: string;
  visitType: 'outpatient' | 'inpatient' | 'emergency' | 'followup';
  visitDate: string; // ISO datetime
  registrationTime: string; // ISO datetime
  receptionNotes?: string;
  registeredBy?: string;
  status: 'registered' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalHistory {
  id: string;
  visitId: string;
  patientId: string;
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  familyHistory?: string;
  socialHistory?: string;
  allergies?: string;
  currentMedications?: string;
  vitalSigns?: {
    temperature?: number;
    bp?: string; // e.g., "120/80"
    pulse?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
    bmi?: number;
  };
  physicalExamination?: string;
  recordedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabRequest {
  id: string;
  visitId: string;
  patientId: string;
  facilityId: string;
  testName: string;
  testType: 'blood' | 'urine' | 'stool' | 'imaging' | 'other';
  testCategory?: string;
  clinicalIndication?: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'requested' | 'in_progress' | 'completed' | 'cancelled';
  results?: string;
  resultsFileUrl?: string;
  orderedBy?: string;
  completedBy?: string;
  orderedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Diagnosis {
  id: string;
  visitId: string;
  patientId: string;
  diagnosisCode?: string; // ICD-10
  diagnosisName: string;
  diagnosisType: 'primary' | 'secondary' | 'differential' | 'provisional';
  description?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  status: 'active' | 'resolved' | 'chronic' | 'ruled_out';
  diagnosedBy?: string;
  diagnosisDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  visitId?: string;
  patientId: string;
  facilityId: string;
  paymentType: 'consultation' | 'lab' | 'pharmacy' | 'procedure' | 'other';
  amount: number;
  currency: string;
  paymentMethod: 'cash' | 'mpesa' | 'card' | 'insurance' | 'nhif' | 'waiver';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  transactionReference?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  nhifNumber?: string;
  notes?: string;
  paidBy?: string;
  paymentDate: string;
  createdAt: string;
  updatedAt: string;
}

export type ViewState =
  | 'dashboard'
  | 'enrollment'
  | 'triage'
  | 'patients'
  | 'pharmacy_inventory'
  | 'profile'
  | 'education'
  | 'medications'
  | 'settings'
  | 'referrals'
  | 'superadmin'
  | 'visits'
  | 'workflow';
