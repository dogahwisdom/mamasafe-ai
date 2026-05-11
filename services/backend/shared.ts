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

/** localStorage key for inventory scoped to a facility `users.id` */
export function pharmacyInventoryStorageKey(facilityUserId: string): string {
  return `${KEYS.PHARMACY_INVENTORY}_${facilityUserId}`;
}

export const normalizePhone = (phone: string) => {
  if (!phone) return "";
  const cleanedInput = phone.replace(/[^0-9+]/g, "");
  if (!cleanedInput) return "";

  let digits = cleanedInput.startsWith("+")
    ? cleanedInput.slice(1)
    : cleanedInput;

  if (digits.startsWith("00254")) digits = digits.slice(2);
  else if (digits.startsWith("00233")) digits = digits.slice(2);

  // Common KE keypad mistake: dial as 254 07… so digits become 2540 + (7xxxxxxxx)
  const kenyaExtraNationalZeroOn2547 = digits.match(/^2540(7\d{8})$/);
  if (kenyaExtraNationalZeroOn2547)
    digits = "254" + kenyaExtraNationalZeroOn2547[1];

  if (digits.startsWith("0") && digits.length === 10) {
    if (/^07\d{8}$/.test(digits))
      return "+254" + digits.slice(1);
    // Ghana mobiles often typed as 05… (Kenya avoids 05… for mobiles; Kenyan 020… stays +254.)
    if (/^05\d{8}$/.test(digits))
      return "+233" + digits.slice(1);
    return "+254" + digits.slice(1);
  }

  if (digits.startsWith("254"))
    return "+" + digits;

  if (digits.startsWith("233"))
    return "+" + digits;

  if (digits.startsWith("7") && digits.length === 9) {
    return "+254" + digits;
  }

  if (/^\d{10,15}$/.test(digits))
    return "+" + digits;

  return cleanedInput;
};

/**
 * Possible `users.phone` values in the database (legacy rows may omit + or use 254…).
 * Used for login lookup with the anon client.
 */
export const phoneLookupVariants = (phone: string): string[] => {
  const n = normalizePhone(phone);
  if (!n) return [];
  const v = new Set<string>([n]);
  if (n.startsWith("+254") && n.length >= 12) {
    const rest = n.slice(4);
    v.add("254" + rest);
    v.add("0" + rest);
    // Mis-saved "+2540712345678" when WhatsApp/meta sender is "+254712345678"
    if (/^7\d{8}$/.test(rest)) {
      v.add("+2540" + rest);
      v.add("2540" + rest);
    }
  }
  if (n.startsWith("+233") && n.length >= 12) {
    const rest = n.slice(4);
    v.add("233" + rest);
    v.add("0" + rest);
  }
  return [...v];
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

