import {
  UserProfile,
  Patient,
  RiskLevel,
  RefillRequest,
  InventoryItem,
  Task,
  Medication,
} from "../../types";
import CryptoJS from "crypto-js";

export const KEYS = {
  USERS: "mamasafe_users",
  CURRENT_USER: "mamasafe_current_user",
  SESSION: "mamasafe_session",
  PATIENTS: "mamasafe_patients",
  PHARMACY_REFILLS: "mamasafe_refills",
  PHARMACY_INVENTORY: "mamasafe_inventory",
  CLINIC_TASKS: "mamasafe_tasks",
  REMINDERS: "mamasafe_reminders",
  REFERRALS: "mamasafe_referrals",
};

export const normalizePhone = (phone: string) => {
  if (!phone) return "";
  let clean = phone.replace(/[^0-9+]/g, "");

  if (!clean) return "";

  if (clean.startsWith("0") && clean.length === 10) {
    return "+254" + clean.substring(1);
  }

  if (clean.startsWith("+2540")) {
    return "+254" + clean.substring(5);
  }

  if (clean.startsWith("2540")) {
    return "+254" + clean.substring(4);
  }

  if (clean.startsWith("254") && !clean.startsWith("+")) {
    return "+" + clean;
  }

  if (clean.startsWith("7") && clean.length === 9) {
    return "+254" + clean;
  }

  return clean;
};

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const STORAGE_SECRET = "mamasafe_local_secure_v1";

export const Security = {
  hash: (password: string) =>
    CryptoJS.SHA256(`salt_${password}_secure`).toString(),
  compare: (plainPassword: string, hashedPassword?: string) => {
    if (!hashedPassword) return false;
    const candidate = CryptoJS.SHA256(
      `salt_${plainPassword}_secure`
    ).toString();
    return candidate === hashedPassword;
  },
};

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      const bytes = CryptoJS.AES.decrypt(item, STORAGE_SECRET);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted ? (JSON.parse(decrypted) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key: string, value: unknown) => {
    try {
      const plaintext = JSON.stringify(value);
      const encrypted = CryptoJS.AES.encrypt(
        plaintext,
        STORAGE_SECRET
      ).toString();
      localStorage.setItem(key, encrypted);
    } catch {
      // Fallback to plain JSON if encryption fails
      localStorage.setItem(key, JSON.stringify(value));
    }
  },
  remove: (key: string) => {
    localStorage.removeItem(key);
  },
};

export const MOCK_MEDICATIONS: Medication[] = [
  {
    id: "1",
    name: "Ferrous Sulfate (Iron)",
    dosage: "200mg",
    frequency: "Daily",
    time: "08:00 AM",
    taken: false,
    instructions: "Take with orange juice",
    type: "morning",
    adherenceRate: 90,
  },
  {
    id: "2",
    name: "Folic Acid",
    dosage: "5mg",
    frequency: "Daily",
    time: "08:00 AM",
    taken: true,
    instructions: "Before breakfast",
    type: "morning",
    adherenceRate: 95,
  },
  {
    id: "3",
    name: "Calcium Carbonate",
    dosage: "500mg",
    frequency: "Daily",
    time: "08:00 PM",
    taken: false,
    instructions: "After dinner",
    type: "evening",
    adherenceRate: 85,
  },
];

export const DEFAULT_PATIENTS: Patient[] = [
  {
    id: "1",
    name: "Sarah Ochieng",
    age: 24,
    gestationalWeeks: 32,
    location: "Kiambu",
    phone: "+254700123456",
    lastCheckIn: "2023-10-27",
    riskStatus: RiskLevel.HIGH,
    nextAppointment: "2023-10-30",
    alerts: [],
    medications: MOCK_MEDICATIONS,
  },
  {
    id: "2",
    name: "Mary Kamau",
    age: 29,
    gestationalWeeks: 28,
    location: "Nairobi",
    phone: "+254711987654",
    lastCheckIn: "2023-10-27",
    riskStatus: RiskLevel.MEDIUM,
    nextAppointment: "2023-11-02",
    alerts: [],
    medications: [],
  },
  {
    id: "3",
    name: "Grace Muthoni",
    age: 22,
    gestationalWeeks: 12,
    location: "Machakos",
    phone: "+254722555555",
    lastCheckIn: "2023-10-26",
    riskStatus: RiskLevel.LOW,
    nextAppointment: "2023-11-15",
    alerts: [],
    medications: [],
  },
];

export const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: "i1", name: "Ferrous Sulfate (Iron)", stock: 12, minLevel: 20, unit: "packs" },
  { id: "i2", name: "Folic Acid 5mg", stock: 45, minLevel: 30, unit: "bottles" },
  { id: "i3", name: "Calcium Carbonate", stock: 80, minLevel: 20, unit: "packs" },
  { id: "i4", name: "Methyldopa", stock: 5, minLevel: 10, unit: "strips" },
];

export const DEFAULT_REFILLS: RefillRequest[] = [
  {
    id: "1",
    patientName: "Sarah Mwangi",
    initials: "SM",
    medication: "Prenatal Vitamins",
    dosage: "1 tablet daily",
    duration: "30 Days",
    status: "pending",
    requestTime: "10:30 AM",
  },
  {
    id: "2",
    patientName: "Jane Doe",
    initials: "JD",
    medication: "Ferrous Sulfate (Iron)",
    dosage: "200mg",
    duration: "14 Days",
    status: "pending",
    requestTime: "11:15 AM",
  },
  {
    id: "3",
    patientName: "Amina Karim",
    initials: "AK",
    medication: "Folic Acid 5mg",
    dosage: "5mg",
    duration: "30 Days",
    status: "pending",
    requestTime: "12:00 PM",
  },
  {
    id: "5",
    patientName: "Fatuma Juma",
    initials: "FJ",
    medication: "Methyldopa",
    dosage: "250mg",
    duration: "Weekly",
    status: "pending",
    requestTime: "1:20 PM",
  },
];

export const DEFAULT_TASKS: Task[] = [
  {
    id: "t1",
    patientName: "Sarah Ochieng",
    patientId: "1",
    type: "High Risk",
    deadline: "Due in 2h",
    resolved: false,
    notes: "BP 160/100 - Needs immediate follow up",
    timestamp: Date.now(),
  },
  {
    id: "t2",
    patientName: "Mary Kamau",
    patientId: "2",
    type: "Missed Visit",
    deadline: "Due Today",
    resolved: false,
    notes: "Missed ANC 3 visit yesterday",
    timestamp: Date.now() - 10000,
  },
];

