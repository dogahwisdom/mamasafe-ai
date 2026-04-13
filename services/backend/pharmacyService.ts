import { RefillRequest, InventoryItem, UserProfile } from "../types";
import {
  KEYS,
  storage,
  DEFAULT_REFILLS,
  pharmacyInventoryStorageKey,
} from "./shared";
import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { InventoryMedicationMatcher } from "../inventoryMedicationMatcher";
import { Permissions } from "../permissions";

export type PrescriptionInventoryCheck =
  | { ok: true; variant: "no_match" }
  | {
      ok: true;
      variant: "sufficient";
      itemId: string;
      itemName: string;
      available: number;
    }
  | {
      ok: false;
      variant: "insufficient";
      itemName: string;
      available: number;
      requested: number;
    };

export type PrescriptionInventoryDeductionResult =
  | { variant: "skipped_no_match" }
  | { variant: "skipped_not_facility_staff" }
  | { variant: "deducted"; itemName: string; newStock: number }
  | { variant: "failed_concurrent"; itemName: string };

export class PharmacyService {
  /** Facility `users.id` that owns stock (clinic/pharmacy root or staff employer). */
  private resolveInventoryFacilityId(): string | null {
    const user = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
    if (!user) return null;
    if (user.role !== "clinic" && user.role !== "pharmacy") {
      return null;
    }
    return Permissions.facilityOwnerUserId(user);
  }

  private canAdjustInventoryForPrescription(): boolean {
    const user = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
    return (
      user?.role === "clinic" ||
      user?.role === "pharmacy" ||
      user?.role === "superadmin"
    );
  }

  /**
   * Before saving a new prescription line: ensure we are not over-dispensing
   * when the medication name matches an inventory item.
   */
  public async checkPrescriptionInventory(
    medicationName: string,
    quantity: number
  ): Promise<PrescriptionInventoryCheck> {
    if (!this.canAdjustInventoryForPrescription()) {
      return { ok: true, variant: "no_match" };
    }
    const qty = Math.max(1, Math.floor(quantity));
    const items = await this.getInventory();
    const match = InventoryMedicationMatcher.findMatch(
      items,
      medicationName.trim()
    );
    if (!match) {
      return { ok: true, variant: "no_match" };
    }
    if (match.stock < qty) {
      return {
        ok: false,
        variant: "insufficient",
        itemName: match.name,
        available: match.stock,
        requested: qty,
      };
    }
    return {
      ok: true,
      variant: "sufficient",
      itemId: match.id,
      itemName: match.name,
      available: match.stock,
    };
  }

  /**
   * After a new prescription line is persisted: decrement stock when the name
   * matches inventory. Idempotent with respect to "no match" (no-op).
   */
  public async deductStockForPrescription(
    medicationName: string,
    quantity: number
  ): Promise<PrescriptionInventoryDeductionResult> {
    if (!this.canAdjustInventoryForPrescription()) {
      return { variant: "skipped_not_facility_staff" };
    }
    const facilityId = this.resolveInventoryFacilityId();
    if (!facilityId) {
      return { variant: "skipped_not_facility_staff" };
    }
    const qty = Math.max(1, Math.floor(quantity));
    const items = await this.getInventory();
    const match = InventoryMedicationMatcher.findMatch(
      items,
      medicationName.trim()
    );
    if (!match) {
      return { variant: "skipped_no_match" };
    }

    if (isSupabaseConfigured()) {
      const { data: row, error: readErr } = await supabase
        .from("inventory")
        .select("stock")
        .eq("id", match.id)
        .eq("facility_id", facilityId)
        .maybeSingle();

      if (readErr || !row) {
        console.error("inventory read before deduct:", readErr);
        return { variant: "failed_concurrent", itemName: match.name };
      }
      const current = Math.floor(Number(row.stock));
      if (current < qty) {
        return { variant: "failed_concurrent", itemName: match.name };
      }
      const next = current - qty;
      const { data: updated, error: updErr } = await supabase
        .from("inventory")
        .update({ stock: next })
        .eq("id", match.id)
        .eq("facility_id", facilityId)
        .eq("stock", current)
        .select("stock")
        .maybeSingle();

      if (updErr) {
        console.error("inventory deduct:", updErr);
        return { variant: "failed_concurrent", itemName: match.name };
      }
      if (!updated) {
        return { variant: "failed_concurrent", itemName: match.name };
      }
      return {
        variant: "deducted",
        itemName: match.name,
        newStock: Number(updated.stock),
      };
    }

    const key = pharmacyInventoryStorageKey(facilityId);
    const inventory = storage.get<InventoryItem[]>(key, []);
    const idx = inventory.findIndex((i) => i.id === match.id);
    if (idx < 0) {
      return { variant: "skipped_no_match" };
    }
    const current = Math.floor(Number(inventory[idx].stock));
    if (current < qty) {
      return { variant: "failed_concurrent", itemName: match.name };
    }
    const next = current - qty;
    const nextInv = [...inventory];
    nextInv[idx] = { ...nextInv[idx], stock: next };
    storage.set(key, nextInv);
    return { variant: "deducted", itemName: match.name, newStock: next };
  }

  public async getRefills(): Promise<RefillRequest[]> {
    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('refill_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching refills:', error);
        return storage.get<RefillRequest[]>(KEYS.PHARMACY_REFILLS, DEFAULT_REFILLS);
      }

      return (data || []).map((r: any) => ({
        id: r.id,
        patientName: r.patient_name,
        initials: r.initials,
        medication: r.medication,
        dosage: r.dosage,
        duration: r.duration,
        status: r.status as 'pending' | 'dispensed',
        requestTime: r.request_time,
      }));
    }

    // Fallback to localStorage
    return storage.get<RefillRequest[]>(KEYS.PHARMACY_REFILLS, DEFAULT_REFILLS);
  }

  public async getInventory(): Promise<InventoryItem[]> {
    const facilityId = this.resolveInventoryFacilityId();
    if (!facilityId) {
      return [];
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("facility_id", facilityId)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching inventory:", error);
        return storage.get<InventoryItem[]>(
          pharmacyInventoryStorageKey(facilityId),
          []
        );
      }

      return (data || []).map((i: Record<string, unknown>) => ({
        id: i.id as string,
        name: i.name as string,
        stock: i.stock as number,
        minLevel: i.min_level as number,
        unit: i.unit as string,
        unitPriceKes:
          i.unit_price_kes != null ? Number(i.unit_price_kes) : null,
        supplier: (i.supplier as string) ?? null,
        expiryDate: (i.expiry_date as string) ?? null,
      }));
    }

    return storage.get<InventoryItem[]>(
      pharmacyInventoryStorageKey(facilityId),
      []
    );
  }

  public async addInventoryItem(item: {
    name: string;
    unit: string;
    stock: number;
    minLevel: number;
    unitPriceKes?: number | null;
    supplier?: string | null;
    expiryDate?: string | null;
  }): Promise<InventoryItem> {
    const name = item.name.trim();
    if (!name) {
      throw new Error("Medication name is required");
    }
    const unit = item.unit.trim() || "units";
    const stock = Math.max(0, Math.floor(item.stock));
    const minLevel = Math.max(0, Math.floor(item.minLevel));
    let unitPriceKes: number | null = null;
    if (item.unitPriceKes != null && item.unitPriceKes !== undefined) {
      const n = Number(item.unitPriceKes);
      if (Number.isNaN(n) || n < 0) {
        throw new Error("Unit price must be a valid non-negative number.");
      }
      unitPriceKes = n;
    }
    const supplier =
      item.supplier != null && String(item.supplier).trim() !== ""
        ? String(item.supplier).trim()
        : null;
    const expiryDate =
      item.expiryDate != null && String(item.expiryDate).trim() !== ""
        ? String(item.expiryDate).trim()
        : null;

    const facilityId = this.resolveInventoryFacilityId();
    if (!facilityId) {
      throw new Error("Sign in as a clinic or pharmacy user to manage inventory.");
    }

    if (isSupabaseConfigured()) {
      const insertRow: Record<string, unknown> = {
        name,
        unit,
        stock,
        min_level: minLevel,
        facility_id: facilityId,
      };
      if (unitPriceKes != null) insertRow.unit_price_kes = unitPriceKes;
      if (supplier != null) insertRow.supplier = supplier;
      if (expiryDate != null) insertRow.expiry_date = expiryDate;

      const { data, error } = await supabase
        .from("inventory")
        .insert(insertRow)
        .select()
        .single();

      if (error) {
        console.error("Error adding inventory item:", error);
        if (error.code === "23505" || String(error.message).includes("unique")) {
          throw new Error(
            "An item with this name already exists in your facility inventory. Edit that row or use a different name."
          );
        }
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        stock: data.stock,
        minLevel: data.min_level,
        unit: data.unit,
        unitPriceKes:
          data.unit_price_kes != null ? Number(data.unit_price_kes) : null,
        supplier: data.supplier ?? null,
        expiryDate: data.expiry_date ?? null,
      };
    }

    const inventory = storage.get<InventoryItem[]>(
      pharmacyInventoryStorageKey(facilityId),
      []
    );
    const newItem: InventoryItem = {
      id: typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `inv-${Date.now()}`,
      name,
      unit,
      stock,
      minLevel,
      unitPriceKes: unitPriceKes ?? undefined,
      supplier: supplier ?? undefined,
      expiryDate: expiryDate ?? undefined,
    };
    storage.set(pharmacyInventoryStorageKey(facilityId), [...inventory, newItem]);
    return newItem;
  }

  public async updateInventoryItem(
    id: string,
    updates: Partial<
      Pick<
        InventoryItem,
        | "stock"
        | "minLevel"
        | "name"
        | "unit"
        | "unitPriceKes"
        | "supplier"
        | "expiryDate"
      >
    >
  ): Promise<void> {
    const facilityId = this.resolveInventoryFacilityId();
    if (!facilityId) {
      throw new Error("Sign in as a clinic or pharmacy user to manage inventory.");
    }

    if (isSupabaseConfigured()) {
      const payload: Record<string, unknown> = {};
      if (updates.stock !== undefined) payload.stock = updates.stock;
      if (updates.minLevel !== undefined) payload.min_level = updates.minLevel;
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.unit !== undefined) payload.unit = updates.unit;
      if (updates.unitPriceKes !== undefined) {
        payload.unit_price_kes =
          updates.unitPriceKes === null || updates.unitPriceKes === undefined
            ? null
            : updates.unitPriceKes;
      }
      if (updates.supplier !== undefined) {
        payload.supplier =
          updates.supplier === null || updates.supplier === ""
            ? null
            : String(updates.supplier).trim();
      }
      if (updates.expiryDate !== undefined) {
        payload.expiry_date =
          updates.expiryDate === null || updates.expiryDate === ""
            ? null
            : String(updates.expiryDate).trim();
      }

      if (Object.keys(payload).length === 0) return;

      const { error } = await supabase
        .from("inventory")
        .update(payload)
        .eq("id", id)
        .eq("facility_id", facilityId);

      if (error) {
        console.error("Error updating inventory:", error);
        throw error;
      }
      return;
    }

    const inventory = storage.get<InventoryItem[]>(
      pharmacyInventoryStorageKey(facilityId),
      []
    );
    const next = inventory.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    storage.set(pharmacyInventoryStorageKey(facilityId), next);
  }

  public async deleteInventoryItem(id: string): Promise<void> {
    const facilityId = this.resolveInventoryFacilityId();
    if (!facilityId) {
      throw new Error("Sign in as a clinic or pharmacy user to manage inventory.");
    }

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("id", id)
        .eq("facility_id", facilityId);
      if (error) {
        console.error("Error deleting inventory item:", error);
        throw error;
      }
      return;
    }

    const inventory = storage.get<InventoryItem[]>(
      pharmacyInventoryStorageKey(facilityId),
      []
    );
    storage.set(
      pharmacyInventoryStorageKey(facilityId),
      inventory.filter((i) => i.id !== id)
    );
  }

  public async dispense(refillId: string): Promise<void> {
    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      // Get the refill request
      const { data: refill, error: refillError } = await supabase
        .from('refill_requests')
        .select('*')
        .eq('id', refillId)
        .single();

      if (refillError || !refill) {
        throw new Error('Refill request not found');
      }

      // Update refill status
      const { error: updateError } = await supabase
        .from('refill_requests')
        .update({ status: 'dispensed' })
        .eq('id', refillId);

      if (updateError) {
        console.error('Error updating refill:', updateError);
        throw updateError;
      }

      const facilityId = this.resolveInventoryFacilityId();
      if (facilityId) {
        const { data: inventory } = await supabase
          .from("inventory")
          .select("*")
          .eq("facility_id", facilityId);

        if (inventory) {
          const itemToUpdate = inventory.find((item: { name: string }) =>
            refill.medication.includes(item.name)
          );

          if (itemToUpdate) {
            await supabase
              .from("inventory")
              .update({ stock: Math.max(0, (itemToUpdate as { stock: number }).stock - 1) })
              .eq("id", (itemToUpdate as { id: string }).id)
              .eq("facility_id", facilityId);
          }
        }
      }

      return;
    }

    // Fallback to localStorage
    const refills = storage.get<RefillRequest[]>(
      KEYS.PHARMACY_REFILLS,
      DEFAULT_REFILLS
    );
    const updatedRefills = refills.map((r) =>
      r.id === refillId ? { ...r, status: "dispensed" } : r
    ) as RefillRequest[];
    storage.set(KEYS.PHARMACY_REFILLS, updatedRefills);

    const facilityId = this.resolveInventoryFacilityId();
    if (!facilityId) return;

    const inventory = storage.get<InventoryItem[]>(
      pharmacyInventoryStorageKey(facilityId),
      []
    );
    const targetRefill = refills.find((r) => r.id === refillId);

    if (targetRefill) {
      const updatedInventory = inventory.map((item) => {
        if (targetRefill.medication.includes(item.name)) {
          return { ...item, stock: Math.max(0, item.stock - 1) };
        }
        return item;
      });
      storage.set(pharmacyInventoryStorageKey(facilityId), updatedInventory);
    }
  }
}

