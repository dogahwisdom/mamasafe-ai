export type LabTestType = 'blood' | 'urine' | 'stool' | 'imaging' | 'other';

export interface LabTestCatalogItem {
  id: string;
  name: string;
  type: LabTestType;
  /** e.g. hematology, biochemistry, microbiology */
  category?: string;
  /** Optional hint used in UI for fast selection. */
  tags?: string[];
  /**
   * Optional standard parameters to help labs record structured results.
   * When present, UI can render parameter inputs.
   */
  parameters?: Array<{
    name: string;
    unit?: string;
    reference?: string;
  }>;
}

/**
 * Pragmatic starter catalog of common tests.
 * Clinicians can still free-type anything not in the list.
 */
export const LAB_TEST_CATALOG: LabTestCatalogItem[] = [
  // Hematology
  {
    id: 'cbc',
    name: 'Complete Blood Count (CBC)',
    type: 'blood',
    category: 'hematology',
    tags: ['anemia', 'infection'],
    parameters: [
      { name: 'Hb', unit: 'g/dL' },
      { name: 'WBC', unit: '×10^9/L' },
      { name: 'Platelets', unit: '×10^9/L' },
      { name: 'RBC', unit: '×10^12/L' },
      { name: 'HCT/PCV', unit: '%' },
      { name: 'MCV', unit: 'fL' },
      { name: 'MCH', unit: 'pg' },
      { name: 'MCHC', unit: 'g/dL' },
    ],
  },
  { id: 'hb', name: 'Hemoglobin (Hb)', type: 'blood', category: 'hematology', tags: ['anemia'], parameters: [{ name: 'Hb', unit: 'g/dL' }] },
  { id: 'esr', name: 'ESR', type: 'blood', category: 'hematology', tags: ['inflammation'] },
  { id: 'blood_group', name: 'Blood group & Rhesus (ABO/Rh)', type: 'blood', category: 'hematology', tags: ['anc'], parameters: [{ name: 'ABO group' }, { name: 'Rhesus (Rh)' }] },

  // Biochemistry
  { id: 'rbs', name: 'Random Blood Sugar (RBS)', type: 'blood', category: 'biochemistry', tags: ['diabetes'], parameters: [{ name: 'Glucose (Random)', unit: 'mmol/L' }] },
  { id: 'fbs', name: 'Fasting Blood Sugar (FBS)', type: 'blood', category: 'biochemistry', tags: ['diabetes'], parameters: [{ name: 'Glucose (Fasting)', unit: 'mmol/L' }] },
  { id: 'hba1c', name: 'HbA1c', type: 'blood', category: 'biochemistry', tags: ['diabetes'], parameters: [{ name: 'HbA1c', unit: '%' }] },
  {
    id: 'lft',
    name: 'Liver Function Tests (LFT)',
    type: 'blood',
    category: 'biochemistry',
    parameters: [
      { name: 'ALT', unit: 'U/L' },
      { name: 'AST', unit: 'U/L' },
      { name: 'ALP', unit: 'U/L' },
      { name: 'Total bilirubin', unit: 'µmol/L' },
      { name: 'Albumin', unit: 'g/L' },
    ],
  },
  { id: 'rft', name: 'Renal Function Tests (Urea/Creatinine)', type: 'blood', category: 'biochemistry', parameters: [{ name: 'Urea', unit: 'mmol/L' }, { name: 'Creatinine', unit: 'µmol/L' }] },
  { id: 'lipid', name: 'Lipid Profile', type: 'blood', category: 'biochemistry', parameters: [{ name: 'Total cholesterol', unit: 'mmol/L' }, { name: 'HDL', unit: 'mmol/L' }, { name: 'LDL', unit: 'mmol/L' }, { name: 'Triglycerides', unit: 'mmol/L' }] },

  // Infectious disease / serology
  { id: 'hiv', name: 'HIV Test', type: 'blood', category: 'serology', tags: ['anc'], parameters: [{ name: 'Result' }] },
  { id: 'hbsag', name: 'HBsAg (Hepatitis B)', type: 'blood', category: 'serology', tags: ['anc'], parameters: [{ name: 'Result' }] },
  { id: 'vdrl', name: 'VDRL/RPR (Syphilis)', type: 'blood', category: 'serology', tags: ['anc'], parameters: [{ name: 'Result' }] },
  { id: 'malaria', name: 'Malaria Test', type: 'blood', category: 'parasitology', parameters: [{ name: 'Result' }] },

  // Urine
  {
    id: 'urinalysis',
    name: 'Urinalysis (dipstick + microscopy)',
    type: 'urine',
    category: 'urinalysis',
    tags: ['uti', 'anc'],
    parameters: [
      { name: 'Protein' },
      { name: 'Glucose' },
      { name: 'Ketones' },
      { name: 'Blood' },
      { name: 'Nitrites' },
      { name: 'Leukocytes' },
      { name: 'pH' },
      { name: 'Specific gravity' },
    ],
  },
  { id: 'upt', name: 'Urine Pregnancy Test (UPT)', type: 'urine', category: 'urinalysis', parameters: [{ name: 'Result' }] },
  { id: 'urine_culture', name: 'Urine Culture & Sensitivity (C/S)', type: 'urine', category: 'microbiology', tags: ['uti'], parameters: [{ name: 'Organism' }, { name: 'Sensitivity' }] },

  // Stool
  { id: 'stool_ova', name: 'Stool Ova & Parasites', type: 'stool', category: 'parasitology' },
  { id: 'stool_culture', name: 'Stool Culture & Sensitivity (C/S)', type: 'stool', category: 'microbiology' },

  // Imaging
  { id: 'ob_ultrasound', name: 'Obstetric Ultrasound', type: 'imaging', category: 'ultrasound', tags: ['anc'] },
  { id: 'pelvic_ultrasound', name: 'Pelvic Ultrasound', type: 'imaging', category: 'ultrasound' },
  { id: 'chest_xray', name: 'Chest X-ray', type: 'imaging', category: 'radiology', tags: ['tb'] },
];

export class LabTestsCatalog {
  static findById(id: string): LabTestCatalogItem | undefined {
    return LAB_TEST_CATALOG.find((t) => t.id === id);
  }

  static search(query: string): LabTestCatalogItem[] {
    const q = query.trim().toLowerCase();
    if (!q) return LAB_TEST_CATALOG;
    return LAB_TEST_CATALOG.filter((t) => {
      const hay = `${t.name} ${t.category ?? ''} ${(t.tags ?? []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }
}

