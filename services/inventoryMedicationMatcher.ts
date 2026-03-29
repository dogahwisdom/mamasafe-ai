import type { InventoryItem } from "../types";

/**
 * Resolves a free-text prescription name to a row in facility inventory.
 * Prefers exact (case-insensitive) matches, then longest inventory name contained
 * in the prescription text, then inventory names that contain the prescription.
 */
export class InventoryMedicationMatcher {
  static normalizeLabel(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, " ");
  }

  static findMatch(
    items: InventoryItem[],
    medicationName: string
  ): InventoryItem | null {
    const med = InventoryMedicationMatcher.normalizeLabel(medicationName);
    if (med.length < 2 || items.length === 0) {
      return null;
    }

    const exact = items.find(
      (i) => InventoryMedicationMatcher.normalizeLabel(i.name) === med
    );
    if (exact) return exact;

    const medContainsInv = [...items]
      .filter((i) => {
        const inv = InventoryMedicationMatcher.normalizeLabel(i.name);
        return inv.length >= 3 && med.includes(inv);
      })
      .sort(
        (a, b) =>
          InventoryMedicationMatcher.normalizeLabel(b.name).length -
          InventoryMedicationMatcher.normalizeLabel(a.name).length
      );
    if (medContainsInv.length > 0) return medContainsInv[0];

    const invContainsMed = [...items]
      .filter((i) => {
        const inv = InventoryMedicationMatcher.normalizeLabel(i.name);
        return med.length >= 3 && inv.includes(med);
      })
      .sort(
        (a, b) =>
          InventoryMedicationMatcher.normalizeLabel(a.name).length -
          InventoryMedicationMatcher.normalizeLabel(b.name).length
      );
    if (invContainsMed.length > 0) return invContainsMed[0];

    return null;
  }
}
