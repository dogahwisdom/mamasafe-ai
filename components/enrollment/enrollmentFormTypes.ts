/**
 * Enrollment wizard form shape (clinic intake).
 */
export interface EnrollmentFormData {
  firstName: string;
  lastName: string;
  dob: string;
  nationalId: string;
  phone: string;
  patientType: "outpatient" | "inpatient";
  nokName: string;
  nokPhone: string;
  county: string;
  subCounty: string;
  ward: string;
  /** Departmental intake (step 3–4) */
  departmentServiceId: string;
  departmentSubcategoryId: string;
  gravida: string;
  parity: string;
  lmp: string;
  edd: string;
  gestationalWeeks: string;
  ancProfile: string;
  referralHospital: string;
  diagnosisDate: string;
}
