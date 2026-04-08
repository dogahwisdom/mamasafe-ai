export type LabTestType = 'blood' | 'urine' | 'stool' | 'imaging' | 'other';

export interface LabTestCatalogItem {
  id: string;
  name: string;
  type: LabTestType;
  /** e.g. hematology, biochemistry, microbiology */
  category?: string;
  /** Optional hint used in UI for fast selection. */
  tags?: string[];
}

/**
 * Pragmatic starter catalog of common tests.
 * Clinicians can still free-type anything not in the list.
 */
export const LAB_TEST_CATALOG: LabTestCatalogItem[] = [
  // Hematology
  { id: 'cbc', name: 'Complete Blood Count (CBC)', type: 'blood', category: 'hematology', tags: ['anemia', 'infection'] },
  { id: 'hb', name: 'Hemoglobin (Hb)', type: 'blood', category: 'hematology', tags: ['anemia'] },
  { id: 'esr', name: 'ESR', type: 'blood', category: 'hematology', tags: ['inflammation'] },
  { id: 'blood_group', name: 'Blood group & Rhesus (ABO/Rh)', type: 'blood', category: 'hematology', tags: ['anc'] },

  // Biochemistry
  { id: 'rbs', name: 'Random Blood Sugar (RBS)', type: 'blood', category: 'biochemistry', tags: ['diabetes'] },
  { id: 'fbs', name: 'Fasting Blood Sugar (FBS)', type: 'blood', category: 'biochemistry', tags: ['diabetes'] },
  { id: 'hba1c', name: 'HbA1c', type: 'blood', category: 'biochemistry', tags: ['diabetes'] },
  { id: 'lft', name: 'Liver Function Tests (LFT)', type: 'blood', category: 'biochemistry' },
  { id: 'rft', name: 'Renal Function Tests (Urea/Creatinine)', type: 'blood', category: 'biochemistry' },
  { id: 'lipid', name: 'Lipid Profile', type: 'blood', category: 'biochemistry' },

  // Infectious disease / serology
  { id: 'hiv', name: 'HIV Test', type: 'blood', category: 'serology', tags: ['anc'] },
  { id: 'hbsag', name: 'HBsAg (Hepatitis B)', type: 'blood', category: 'serology', tags: ['anc'] },
  { id: 'vdrl', name: 'VDRL/RPR (Syphilis)', type: 'blood', category: 'serology', tags: ['anc'] },
  { id: 'malaria', name: 'Malaria Test', type: 'blood', category: 'parasitology' },

  // Urine
  { id: 'urinalysis', name: 'Urinalysis (dipstick + microscopy)', type: 'urine', category: 'urinalysis', tags: ['uti', 'anc'] },
  { id: 'upt', name: 'Urine Pregnancy Test (UPT)', type: 'urine', category: 'urinalysis' },
  { id: 'urine_culture', name: 'Urine Culture & Sensitivity (C/S)', type: 'urine', category: 'microbiology', tags: ['uti'] },

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

