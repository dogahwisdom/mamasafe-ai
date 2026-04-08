import React, { useEffect, useMemo, useState } from "react";
import type { Expense, UserProfile } from "../types";
import { backend } from "../services/backend";
import { ArrowLeft, Plus, Trash2, Loader2, Receipt } from "lucide-react";

interface ExpensesViewProps {
  user: UserProfile;
  portal: "clinic" | "pharmacy";
  onBack: () => void;
}

function formatKes(n: number): string {
  return n.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ user, portal, onBack }) => {
  const [rows, setRows] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: "",
    amountKes: "",
    notes: "",
    expenseDate: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await backend.expenses.list(portal);
      setRows(data);
    } catch (e) {
      console.error(e);
      alert("Could not load expenses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal]);

  const total = useMemo(
    () => rows.reduce((s, r) => s + (Number.isFinite(r.amountKes) ? r.amountKes : 0), 0),
    [rows]
  );

  const handleCreate = async () => {
    const amount = parseFloat(form.amountKes.replace(/,/g, ""));
    if (!form.category.trim()) {
      alert("Enter a category.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Enter a valid amount (KES).");
      return;
    }
    setSaving(true);
    try {
      await backend.expenses.create({
        portal,
        category: form.category,
        amountKes: amount,
        notes: form.notes || null,
        expenseDate: form.expenseDate ? new Date(form.expenseDate).toISOString() : undefined,
      });
      setForm({ category: "", amountKes: "", notes: "", expenseDate: "" });
      await load();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to create expense.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this expense entry?")) return;
    setSaving(true);
    try {
      await backend.expenses.delete(id);
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to delete expense.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="text-brand-600" size={24} />
              Expenses
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {user.name} · {portal === "clinic" ? "Clinic" : "Pharmacy"} portal
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total (KES)</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">{formatKes(total)}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200 dark:border-slate-800 p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Add expense</h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Category *
            </label>
            <input
              type="text"
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-slate-900 dark:text-white"
              placeholder="e.g. Utilities, Supplies, Transport"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Amount (KES) *
            </label>
            <input
              type="text"
              inputMode="decimal"
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-slate-900 dark:text-white"
              placeholder="0.00"
              value={form.amountKes}
              onChange={(e) => setForm((f) => ({ ...f, amountKes: e.target.value }))}
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Date
            </label>
            <input
              type="date"
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-slate-900 dark:text-white"
              value={form.expenseDate}
              onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm disabled:opacity-50 min-h-[42px]"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Add
            </button>
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Notes
          </label>
          <textarea
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-slate-900 dark:text-white resize-none h-20"
            placeholder="Optional details"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
            <Loader2 className="animate-spin" size={22} />
            Loading expenses…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No expenses yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#2c2c2e] text-left border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Date</th>
                  <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Category</th>
                  <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200 text-right">
                    Amount (KES)
                  </th>
                  <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Notes</th>
                  <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200 w-24" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {r.expenseDate ? String(r.expenseDate).slice(0, 10) : "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {r.category}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatKes(r.amountKes)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {r.notes || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        disabled={saving}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

