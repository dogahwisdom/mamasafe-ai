
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

export interface Patient {
  id: string;
  name: string;
  age: number;
  gestationalWeeks: number;
  location: string;
  phone: string;
  lastCheckIn: string; // ISO date
  riskStatus: RiskLevel;
  nextAppointment: string; // ISO date
  alerts: Alert[];
  medications?: Medication[];
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
  | 'superadmin';
