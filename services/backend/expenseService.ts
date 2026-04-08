import type { Expense, UserProfile } from "../../types";
import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { storage, KEYS } from "./shared";

const LOCAL_KEY = "mamasafe_expenses_v1";

export class ExpenseService {
  public async list(portal: "clinic" | "pharmacy"): Promise<Expense[]> {
    const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
    const facilityId = currentUser?.id || null;

    if (isSupabaseConfigured() && facilityId) {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("facility_id", facilityId)
        .eq("portal", portal)
        .order("expense_date", { ascending: false });

      if (error) {
        console.error("Error fetching expenses:", error);
        throw error;
      }

      return (data || []).map((r: any) => this.mapExpenseFromDb(r));
    }

    // Local fallback
    const rows = storage.get<Expense[]>(LOCAL_KEY, []);
    return rows
      .filter((e) => e.portal === portal && (!facilityId || e.facilityId === facilityId))
      .sort((a, b) => (a.expenseDate < b.expenseDate ? 1 : -1));
  }

  public async create(input: {
    portal: "clinic" | "pharmacy";
    category: string;
    amountKes: number;
    notes?: string | null;
    expenseDate?: string;
  }): Promise<Expense> {
    const currentUser = storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
    if (!currentUser) throw new Error("Not authenticated");

    const category = input.category.trim();
    if (!category) throw new Error("Category is required.");
    const amount = Number(input.amountKes);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount (KES) must be a positive number.");
    }

    const expenseDate = input.expenseDate || new Date().toISOString();

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          facility_id: currentUser.id,
          portal: input.portal,
          category,
          amount_kes: amount,
          notes: input.notes?.trim() ? input.notes.trim() : null,
          expense_date: expenseDate,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating expense:", error);
        throw error;
      }

      return this.mapExpenseFromDb(data);
    }

    const rows = storage.get<Expense[]>(LOCAL_KEY, []);
    const now = new Date().toISOString();
    const e: Expense = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `exp-${Date.now()}`,
      facilityId: currentUser.id,
      portal: input.portal,
      category,
      amountKes: amount,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      expenseDate,
      createdAt: now,
      updatedAt: now,
    };
    storage.set(LOCAL_KEY, [e, ...rows]);
    return e;
  }

  public async delete(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) {
        console.error("Error deleting expense:", error);
        throw error;
      }
      return;
    }

    const rows = storage.get<Expense[]>(LOCAL_KEY, []);
    storage.set(
      LOCAL_KEY,
      rows.filter((e) => e.id !== id)
    );
  }

  private mapExpenseFromDb(r: any): Expense {
    return {
      id: r.id,
      facilityId: r.facility_id,
      portal: r.portal,
      category: r.category,
      amountKes: parseFloat(String(r.amount_kes)),
      notes: r.notes ?? null,
      expenseDate: r.expense_date,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}

