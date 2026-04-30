/**
 * PharmacyReportsService
 *
 * Provides reporting data for:
 *  - Dispensing history (all-time log with patient info)
 *  - Revenue summary (unit_price x quantity from dispensing_records)
 *  - Expenses (from pharmacy_expenses table)
 *  - Summary KPI stats
 *
 * Supabase SQL required (run in SQL editor):
 *
 * CREATE TABLE IF NOT EXISTS pharmacy_expenses (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   pharmacy_id UUID NOT NULL,
 *   medication_name TEXT NOT NULL,
 *   quantity INT NOT NULL DEFAULT 1,
 *   unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
 *   total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
 *   supplier TEXT,
 *   notes TEXT,
 *   purchased_at TIMESTAMPTZ DEFAULT now(),
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 * ALTER TABLE pharmacy_expenses ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Pharmacy own expenses" ON pharmacy_expenses FOR ALL USING (pharmacy_id::text = auth.uid()::text);
 */

import { DispensingRecord, PharmacyExpense } from '../../types';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { storage, KEYS } from './shared';
import { UserProfile } from '../../types';

export interface RevenueLine {
    date: string;
    medicationName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    patientName: string;
}

export interface DailyStat {
    date: string;
    dispensed: number;
    revenue: number;
}

export interface PharmacyReportSummary {
    totalDispensed: number;
    uniquePatients: number;
    revenueThisMonth: number;
    expensesThisMonth: number;
    dailyStats: DailyStat[];
}

export class PharmacyReportsService {
    private getCurrentUser(): UserProfile | null {
        return storage.get<UserProfile | null>(KEYS.CURRENT_USER, null);
    }

    /**
     * Get full dispensing history with optional date range
     */
    public async getDispensingHistory(
        startDate?: string,
        endDate?: string
    ): Promise<DispensingRecord[]> {
        if (!isSupabaseConfigured()) return [];

        const currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.role !== 'pharmacy') return [];

        let query = supabase
            .from('dispensing_records')
            .select('*')
            .eq('pharmacy_id', currentUser.id)
            .order('dispensed_at', { ascending: false });

        if (startDate) query = query.gte('dispensed_at', startDate);
        if (endDate) {
            // include the whole end day
            const end = new Date(endDate);
            end.setDate(end.getDate() + 1);
            query = query.lt('dispensed_at', end.toISOString().split('T')[0]);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching dispensing history:', error);
            return [];
        }

        return (data || []).map(this.mapDispensing);
    }

    /**
     * Build revenue lines from dispensing records.
     * Unit price is stored on the record if available (unit_price column).
     * Falls back to 0 if not tracked - pharmacy can add prices later.
     */
    public async getRevenueLines(
        startDate?: string,
        endDate?: string
    ): Promise<RevenueLine[]> {
        if (!isSupabaseConfigured()) return [];

        const currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.role !== 'pharmacy') return [];

        let query = supabase
            .from('dispensing_records')
            .select('*')
            .eq('pharmacy_id', currentUser.id)
            .order('dispensed_at', { ascending: false });

        if (startDate) query = query.gte('dispensed_at', startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setDate(end.getDate() + 1);
            query = query.lt('dispensed_at', end.toISOString().split('T')[0]);
        }

        const { data, error } = await query;
        if (error) return [];

        return (data || []).map((r: any) => ({
            date: r.dispensed_at,
            medicationName: r.medication_name,
            quantity: r.quantity || 1,
            unitPrice: r.unit_price || 0,
            total: (r.unit_price || 0) * (r.quantity || 1),
            patientName: r.patient_name,
        }));
    }

    /**
     * Get expenses list
     */
    public async getExpenses(
        startDate?: string,
        endDate?: string
    ): Promise<PharmacyExpense[]> {
        if (!isSupabaseConfigured()) return [];

        const currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.role !== 'pharmacy') return [];

        let query = supabase
            .from('pharmacy_expenses')
            .select('*')
            .eq('pharmacy_id', currentUser.id)
            .order('purchased_at', { ascending: false });

        if (startDate) query = query.gte('purchased_at', startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setDate(end.getDate() + 1);
            query = query.lt('purchased_at', end.toISOString().split('T')[0]);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching expenses:', error);
            return [];
        }

        return (data || []).map(this.mapExpense);
    }

    /**
     * Create a new expense record
     */
    public async addExpense(
        medicationName: string,
        quantity: number,
        unitCost: number,
        supplier?: string,
        notes?: string,
        purchasedAt?: string
    ): Promise<PharmacyExpense> {
        if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

        const currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.role !== 'pharmacy') {
            throw new Error('Only pharmacy users can add expenses');
        }

        const { data, error } = await supabase
            .from('pharmacy_expenses')
            .insert({
                pharmacy_id: currentUser.id,
                medication_name: medicationName,
                quantity,
                unit_cost: unitCost,
                supplier: supplier || null,
                notes: notes || null,
                purchased_at: purchasedAt || new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding expense:', error);
            throw error;
        }

        return this.mapExpense(data);
    }

    /**
     * Delete an expense record
     */
    public async deleteExpense(id: string): Promise<void> {
        if (!isSupabaseConfigured()) return;
        await supabase.from('pharmacy_expenses').delete().eq('id', id);
    }

    /**
     * Get KPI summary stats
     */
    public async getSummaryStats(
        startDate?: string,
        endDate?: string
    ): Promise<PharmacyReportSummary> {
        const [records, expenses] = await Promise.all([
            this.getDispensingHistory(startDate, endDate),
            this.getExpenses(startDate, endDate),
        ]);

        // Revenue lines for calculating total revenue
        const revenueLines = await this.getRevenueLines(startDate, endDate);

        // Unique patients
        const uniquePatients = new Set(records.map((r) => r.patientId)).size;

        // Revenue & expenses this month (if no date filter)
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const revenueThisMonth = revenueLines
            .filter((l) => l.date >= monthStart)
            .reduce((acc, l) => acc + l.total, 0);

        const expensesThisMonth = expenses
            .filter((e) => e.purchasedAt >= monthStart)
            .reduce((acc, e) => acc + e.totalCost, 0);

        // Build daily stats (last 30 days)
        const daily: Record<string, DailyStat> = {};
        records.forEach((r) => {
            const day = r.dispensedAt.split('T')[0];
            if (!daily[day]) daily[day] = { date: day, dispensed: 0, revenue: 0 };
            daily[day].dispensed += 1;
        });
        revenueLines.forEach((l) => {
            const day = l.date.split('T')[0];
            if (daily[day]) daily[day].revenue += l.total;
        });

        // Sort daily stats ascending
        const dailyStats = Object.values(daily).sort((a, b) =>
            a.date.localeCompare(b.date)
        );

        return {
            totalDispensed: records.length,
            uniquePatients,
            revenueThisMonth,
            expensesThisMonth,
            dailyStats,
        };
    }

    private mapDispensing(data: any): DispensingRecord {
        return {
            id: data.id,
            patientId: data.patient_id,
            patientName: data.patient_name,
            medicationName: data.medication_name,
            dosage: data.dosage,
            quantity: data.quantity,
            unit: data.unit,
            dispensedBy: data.dispensed_by,
            pharmacyId: data.pharmacy_id,
            nextFollowUpDate: data.next_follow_up_date,
            notes: data.notes,
            dispensedAt: data.dispensed_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    }

    private mapExpense(data: any): PharmacyExpense {
        return {
            id: data.id,
            pharmacyId: data.pharmacy_id,
            medicationName: data.medication_name,
            quantity: data.quantity,
            unitCost: data.unit_cost,
            totalCost: data.total_cost ?? data.unit_cost * data.quantity,
            supplier: data.supplier,
            notes: data.notes,
            purchasedAt: data.purchased_at,
            createdAt: data.created_at,
        };
    }
}
