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
      }));
    }

    // Fallback to localStorage
    return storage.get<InventoryItem[]>(
      KEYS.PHARMACY_INVENTORY,
      DEFAULT_INVENTORY
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

