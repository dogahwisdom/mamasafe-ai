import { RefillRequest, InventoryItem } from "../types";
import {
  KEYS,
  storage,
  DEFAULT_REFILLS,
  DEFAULT_INVENTORY,
} from "./shared";
import { supabase, isSupabaseConfigured } from "../supabaseClient";

export class PharmacyService {
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
    // Use Supabase if configured
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching inventory:', error);
        return storage.get<InventoryItem[]>(KEYS.PHARMACY_INVENTORY, DEFAULT_INVENTORY);
      }

      return (data || []).map((i: any) => ({
        id: i.id,
        name: i.name,
        stock: i.stock,
        minLevel: i.min_level,
        unit: i.unit,
        unitPriceKes:
          i.unit_price_kes != null ? Number(i.unit_price_kes) : null,
        supplier: i.supplier ?? null,
        expiryDate: i.expiry_date ?? null,
      }));
    }

    // Fallback to localStorage
    return storage.get<InventoryItem[]>(
      KEYS.PHARMACY_INVENTORY,
      DEFAULT_INVENTORY
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

    if (isSupabaseConfigured()) {
      const insertRow: Record<string, unknown> = {
        name,
        unit,
        stock,
        min_level: minLevel,
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
            "An item with this medication name already exists. Use a slightly different name or edit the existing row."
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
      KEYS.PHARMACY_INVENTORY,
      DEFAULT_INVENTORY
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
    storage.set(KEYS.PHARMACY_INVENTORY, [...inventory, newItem]);
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
        .eq("id", id);

      if (error) {
        console.error("Error updating inventory:", error);
        throw error;
      }
      return;
    }

    const inventory = storage.get<InventoryItem[]>(
      KEYS.PHARMACY_INVENTORY,
      DEFAULT_INVENTORY
    );
    const next = inventory.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    storage.set(KEYS.PHARMACY_INVENTORY, next);
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

      // Update inventory
      const { data: inventory } = await supabase
        .from('inventory')
        .select('*');

      if (inventory) {
        const itemToUpdate = inventory.find((item) =>
          refill.medication.includes(item.name)
        );

        if (itemToUpdate) {
          await supabase
            .from('inventory')
            .update({ stock: Math.max(0, itemToUpdate.stock - 1) })
            .eq('id', itemToUpdate.id);
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

    const inventory = storage.get<InventoryItem[]>(
      KEYS.PHARMACY_INVENTORY,
      DEFAULT_INVENTORY
    );
    const targetRefill = refills.find((r) => r.id === refillId);

    if (targetRefill) {
      const updatedInventory = inventory.map((item) => {
        if (targetRefill.medication.includes(item.name)) {
          return { ...item, stock: Math.max(0, item.stock - 1) };
        }
        return item;
      });
      storage.set(KEYS.PHARMACY_INVENTORY, updatedInventory);
    }
  }
}

