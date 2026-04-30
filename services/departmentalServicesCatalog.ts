/**
 * Facility departmental services and sub-categories for patient intake.
 * Aligns with common Kenyan clinic/hospital front-door routing (OPD, maternity, lab, etc.).
 */

export interface DepartmentSubCategory {
  id: string;
  label: string;
}

export interface DepartmentService {
  id: string;
  label: string;
  subCategories: DepartmentSubCategory[];
}

export const DEPARTMENTAL_SERVICES: DepartmentService[] = [
  {
    id: "reception_triage",
    label: "Reception & triage",
    subCategories: [
      { id: "registration", label: "Registration & intake" },
      { id: "emergency_triage", label: "Emergency triage" },
    ],
  },
  {
    id: "outpatient",
    label: "Outpatient (OPD)",
    subCategories: [
      { id: "general", label: "General clinic" },
      { id: "chronic", label: "Chronic disease review" },
      { id: "pediatric", label: "Pediatric clinic" },
      { id: "ent_eye", label: "ENT & eye" },
    ],
  },
  {
    id: "maternity",
    label: "Maternity & reproductive health",
    subCategories: [
      { id: "anc", label: "Antenatal care (ANC)" },
      { id: "pnc", label: "Postnatal care (PNC)" },
      { id: "labour", label: "Labour & delivery" },
      { id: "fp", label: "Family planning" },
    ],
  },
  {
    id: "laboratory",
    label: "Laboratory",
    subCategories: [
      { id: "blood", label: "Haematology / chemistry" },
      { id: "micro", label: "Microbiology / TB" },
      { id: "other_lab", label: "Other investigations" },
    ],
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    subCategories: [
      { id: "dispensing", label: "Dispensing & counselling" },
      { id: "pmtct", label: "PMTCT / prophylaxis" },
    ],
  },
  {
    id: "imaging",
    label: "Radiology / imaging",
    subCategories: [
      { id: "ultrasound", label: "Ultrasound" },
      { id: "xray", label: "X-ray / CT" },
    ],
  },
  {
    id: "mental_health",
    label: "Mental health & psychosocial",
    subCategories: [
      { id: "counselling", label: "Counselling" },
      { id: "support", label: "Support groups" },
    ],
  },
  {
    id: "tb_hiv",
    label: "TB & HIV care",
    subCategories: [
      { id: "tb", label: "TB clinic" },
      { id: "hiv", label: "HIV / CCC" },
    ],
  },
  {
    id: "gynaecology_clinic",
    label: "Gynaecological Clinic",
    subCategories: [
      { id: "gyne_routine", label: "Routine consultation" },
      { id: "gyne_followup", label: "Follow-up visit" },
      { id: "gyne_procedure", label: "Procedure / minor theatre" },
      { id: "gyne_other", label: "Other" },
    ],
  },
  {
    id: "dental_services",
    label: "Dental Services",
    subCategories: [
      { id: "dental_preventive", label: "Preventive / check-up" },
      { id: "dental_restorative", label: "Restorative / fillings" },
      { id: "dental_oral_surgery", label: "Oral surgery / extractions" },
      { id: "dental_other", label: "Other" },
    ],
  },
  {
    id: "eye_clinic_ophthalmology",
    label: "Eye Clinic (Ophthalmology)",
    subCategories: [
      { id: "eye_consult", label: "Ophthalmology consultation" },
      { id: "eye_refraction", label: "Refraction / vision assessment" },
      { id: "eye_surgical_review", label: "Surgical review / post-op" },
      { id: "eye_other", label: "Other" },
    ],
  },
  {
    id: "orthopedic_clinic",
    label: "Orthopedic Clinic",
    subCategories: [
      { id: "ortho_fracture", label: "Fracture / trauma care" },
      { id: "ortho_joint", label: "Joint / musculoskeletal" },
      { id: "ortho_followup", label: "Follow-up / cast review" },
      { id: "ortho_other", label: "Other" },
    ],
  },
  {
    id: "dermatology_clinic",
    label: "Dermatology Clinic",
    subCategories: [
      { id: "derm_consult", label: "Dermatology consultation" },
      { id: "derm_chronic", label: "Chronic skin condition review" },
      { id: "derm_procedure", label: "Minor procedure / biopsy" },
      { id: "derm_other", label: "Other" },
    ],
  },
  {
    id: "physiotherapy_clinic",
    label: "Physiotherapy Clinic",
    subCategories: [
      { id: "physio_assessment", label: "Initial assessment" },
      { id: "physio_treatment", label: "Treatment session" },
      { id: "physio_rehab", label: "Rehabilitation programme" },
      { id: "physio_other", label: "Other" },
    ],
  },
  {
    id: "general_surgery_clinic",
    label: "General Surgery Clinic",
    subCategories: [
      { id: "gsurg_consult", label: "Surgical consultation" },
      { id: "gsurg_preop", label: "Pre-operative review" },
      { id: "gsurg_postop", label: "Post-operative follow-up" },
      { id: "gsurg_other", label: "Other" },
    ],
  },
  {
    id: "plastic_surgery_clinic",
    label: "Plastic Surgery Clinic",
    subCategories: [
      { id: "plast_consult", label: "Plastic surgery consultation" },
      { id: "plast_reconstructive", label: "Reconstructive care" },
      { id: "plast_aesthetic", label: "Aesthetic / cosmetic review" },
      { id: "plast_other", label: "Other" },
    ],
  },
  {
    id: "spine_clinic",
    label: "Spine Clinic",
    subCategories: [
      { id: "spine_consult", label: "Spine consultation" },
      { id: "spine_pain", label: "Back / neck pain management" },
      { id: "spine_surgical_review", label: "Surgical review / post-op" },
      { id: "spine_other", label: "Other" },
    ],
  },
  {
    id: "other",
    label: "Other / specialist",
    subCategories: [{ id: "unspecified", label: "General specialist" }],
  },
];

export class DepartmentalServicesCatalog {
  static getDepartment(id: string | undefined): DepartmentService | undefined {
    if (!id) return undefined;
    return DEPARTMENTAL_SERVICES.find((d) => d.id === id);
  }

  static formatIntakeLine(
    departmentId: string | undefined,
    subcategoryId: string | undefined
  ): string | null {
    const dept = DepartmentalServicesCatalog.getDepartment(departmentId);
    if (!dept) return null;
    const sub = dept.subCategories.find((s) => s.id === subcategoryId);
    return sub ? `${dept.label} - ${sub.label}` : dept.label;
  }

  /** ANC intake uses pregnancy-specific enrollment fields (LMP, gravida, etc.). */
  static requiresPregnancyDetails(
    departmentId: string | undefined,
    subcategoryId: string | undefined
  ): boolean {
    return departmentId === "maternity" && subcategoryId === "anc";
  }
}
