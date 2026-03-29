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
    return sub ? `${dept.label} — ${sub.label}` : dept.label;
  }

  /** ANC intake uses pregnancy-specific enrollment fields (LMP, gravida, etc.). */
  static requiresPregnancyDetails(
    departmentId: string | undefined,
    subcategoryId: string | undefined
  ): boolean {
    return departmentId === "maternity" && subcategoryId === "anc";
  }
}
