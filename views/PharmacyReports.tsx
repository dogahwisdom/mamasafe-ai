import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, PharmacyExpense } from '../types';
import { DispensingRecord } from '../types';
import { backend } from '../services/backend';
import { RevenueLine, DailyStat, PharmacyReportSummary } from '../services/backend/pharmacyReportsService';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    ArrowLeft, BarChart2, DollarSign, Package, Users, TrendingUp,
    TrendingDown, CalendarRange, Search, PlusCircle, X, Loader2,
    CheckCircle, Trash2, Pill, ClipboardList, ReceiptText, History
} from 'lucide-react';

interface PharmacyReportsProps {
    user: UserProfile;
    onBack: () => void;
}

type ReportTab = 'reports' | 'revenue' | 'expenses' | 'history';

// ─── Date helpers ────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];
const monthStartStr = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};
const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtCurrency = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

// ─── Sub-component: Stat Card ────────────────────────────────────────────────
const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ElementType;
    sub?: string;
    accent?: string;
}> = ({ title, value, icon: Icon, sub, accent = 'text-brand-600' }) => (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
            <div className={`p-2 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] ${accent}`}>
                <Icon size={18} />
            </div>
        </div>
        <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
);

// ─── Main component ──────────────────────────────────────────────────────────
export const PharmacyReports: React.FC<PharmacyReportsProps> = ({ user, onBack }) => {
    const [activeTab, setActiveTab] = useState<ReportTab>('reports');
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(monthStartStr());
    const [endDate, setEndDate] = useState(todayStr());

    // Data states
    const [summary, setSummary] = useState<PharmacyReportSummary | null>(null);
    const [history, setHistory] = useState<DispensingRecord[]>([]);
    const [revenueLines, setRevenueLines] = useState<RevenueLine[]>([]);
    const [expenses, setExpenses] = useState<PharmacyExpense[]>([]);

    // History search
    const [historySearch, setHistorySearch] = useState('');

    // Expense modal
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        medicationName: '',
        quantity: 1,
        unitCost: 0,
        supplier: '',
        notes: '',
        purchasedAt: todayStr(),
    });
    const [savingExpense, setSavingExpense] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [sum, hist, rev, exp] = await Promise.all([
                backend.pharmacyReports.getSummaryStats(startDate, endDate),
                backend.pharmacyReports.getDispensingHistory(startDate, endDate),
                backend.pharmacyReports.getRevenueLines(startDate, endDate),
                backend.pharmacyReports.getExpenses(startDate, endDate),
            ]);
            setSummary(sum);
            setHistory(hist);
            setRevenueLines(rev);
            setExpenses(exp);
        } catch (e) {
            console.error('Error loading report data', e);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleAddExpense = async () => {
        if (!expenseForm.medicationName || expenseForm.unitCost <= 0) {
            alert('Please fill in medication name and unit cost');
            return;
        }
        setSavingExpense(true);
        try {
            await backend.pharmacyReports.addExpense(
                expenseForm.medicationName,
                expenseForm.quantity,
                expenseForm.unitCost,
                expenseForm.supplier || undefined,
                expenseForm.notes || undefined,
                expenseForm.purchasedAt
            );
            await fetchAll();
            setShowExpenseModal(false);
            setExpenseForm({ medicationName: '', quantity: 1, unitCost: 0, supplier: '', notes: '', purchasedAt: todayStr() });
            showToast('Expense recorded successfully');
        } catch (e) {
            console.error(e);
            alert('Failed to save expense');
        } finally {
            setSavingExpense(false);
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm('Delete this expense record?')) return;
        setDeletingId(id);
        try {
            await backend.pharmacyReports.deleteExpense(id);
            setExpenses(prev => prev.filter(e => e.id !== id));
            showToast('Expense deleted');
        } catch (e) {
            alert('Failed to delete');
        } finally {
            setDeletingId(null);
        }
    };

    const filteredHistory = history.filter(r =>
        r.patientName.toLowerCase().includes(historySearch.toLowerCase()) ||
        r.medicationName.toLowerCase().includes(historySearch.toLowerCase())
    );

    const totalRevenue = revenueLines.reduce((a, l) => a + l.total, 0);
    const totalExpenses = expenses.reduce((a, e) => a + e.totalCost, 0);
    const netProfit = totalRevenue - totalExpenses;

    const tabs: { id: ReportTab; label: string; icon: React.ElementType }[] = [
        { id: 'reports', label: 'Reports', icon: BarChart2 },
        { id: 'revenue', label: 'Revenue', icon: TrendingUp },
        { id: 'expenses', label: 'Expenses', icon: TrendingDown },
        { id: 'history', label: 'History', icon: History },
    ];

    return (
        <div className="space-y-6 animate-fade-in-up relative">
            {/* Toast */}
            {toast && (
                <div className="fixed top-24 right-6 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 z-50 animate-slide-in-right">
                    <CheckCircle size={18} />
                    <span className="font-semibold text-sm">{toast}</span>
                </div>
            )}

            {/* Add Expense Modal */}
            {showExpenseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
                    <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Add Expense</h2>
                            <button onClick={() => setShowExpenseModal(false)} className="p-2 bg-slate-100 dark:bg-[#2c2c2e] rounded-full text-slate-500 hover:text-slate-900">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Medication / Item Name *</label>
                                <input
                                    type="text"
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30"
                                    value={expenseForm.medicationName}
                                    onChange={e => setExpenseForm({ ...expenseForm, medicationName: e.target.value })}
                                    placeholder="e.g. Paracetamol 500mg"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quantity</label>
                                    <input
                                        type="number" min="1"
                                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30"
                                        value={expenseForm.quantity}
                                        onChange={e => setExpenseForm({ ...expenseForm, quantity: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Unit Cost (KES) *</label>
                                    <input
                                        type="number" min="0" step="0.01"
                                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30"
                                        value={expenseForm.unitCost}
                                        onChange={e => setExpenseForm({ ...expenseForm, unitCost: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300">
                                Total: <span className="text-slate-900 dark:text-white font-bold">{fmtCurrency(expenseForm.quantity * expenseForm.unitCost)}</span>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Supplier</label>
                                <input
                                    type="text"
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30"
                                    value={expenseForm.supplier}
                                    onChange={e => setExpenseForm({ ...expenseForm, supplier: e.target.value })}
                                    placeholder="Supplier name (optional)"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Purchase Date</label>
                                <input
                                    type="date"
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30"
                                    value={expenseForm.purchasedAt}
                                    onChange={e => setExpenseForm({ ...expenseForm, purchasedAt: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</label>
                                <textarea
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30 resize-none h-20"
                                    value={expenseForm.notes}
                                    onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                                    placeholder="Optional notes..."
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowExpenseModal(false)}
                                    className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-300 font-semibold"
                                >Cancel</button>
                                <button
                                    onClick={handleAddExpense}
                                    disabled={savingExpense}
                                    className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {savingExpense ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><CheckCircle size={16} /> Save Expense</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2.5 rounded-full bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white shadow-sm transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <BarChart2 size={22} className="text-brand-600" /> Pharmacy Reports
                        </h1>
                        <p className="text-slate-500 text-sm mt-0.5">{user.name}</p>
                    </div>
                </div>

                {/* Date Range Filter */}
                <div className="flex items-center gap-2 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2 shadow-sm">
                    <CalendarRange size={16} className="text-slate-400" />
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 outline-none"
                    />
                    <span className="text-slate-400 text-sm">→</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 outline-none"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-100 dark:border-slate-800">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition-colors ${activeTab === tab.id
                                    ? 'border-b-2 border-brand-600 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-900/10'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2c2c2e]'
                                }`}
                        >
                            <tab.icon size={16} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <Loader2 className="animate-spin text-brand-600" size={32} />
                        </div>
                    ) : (
                        <>
                            {/* ── REPORTS TAB ─────────────────────────────── */}
                            {activeTab === 'reports' && summary && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <StatCard
                                            title="Total Dispensed"
                                            value={summary.totalDispensed}
                                            icon={Package}
                                            sub="In selected period"
                                            accent="text-brand-600"
                                        />
                                        <StatCard
                                            title="Patients Served"
                                            value={summary.uniquePatients}
                                            icon={Users}
                                            sub="Unique patients"
                                            accent="text-blue-600"
                                        />
                                        <StatCard
                                            title="Revenue (MTD)"
                                            value={fmtCurrency(summary.revenueThisMonth)}
                                            icon={TrendingUp}
                                            sub="This month"
                                            accent="text-green-600"
                                        />
                                        <StatCard
                                            title="Expenses (MTD)"
                                            value={fmtCurrency(summary.expensesThisMonth)}
                                            icon={TrendingDown}
                                            sub="This month"
                                            accent="text-red-500"
                                        />
                                    </div>

                                    {/* Net Profit Banner */}
                                    <div className={`rounded-2xl p-5 flex items-center justify-between ${netProfit >= 0 ? 'bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20' : 'bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20'}`}>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Net Margin (Period)</p>
                                            <p className={`text-2xl font-extrabold mt-1 ${netProfit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {fmtCurrency(netProfit)}
                                            </p>
                                        </div>
                                        <DollarSign size={36} className={netProfit >= 0 ? 'text-green-300' : 'text-red-300'} />
                                    </div>

                                    {/* Daily Dispensing Chart */}
                                    {summary.dailyStats.length > 0 ? (
                                        <div>
                                            <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 text-sm uppercase tracking-wider">Daily Dispensing Activity</h3>
                                            <ResponsiveContainer width="100%" height={220}>
                                                <BarChart data={summary.dailyStats} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} />
                                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                                    <Tooltip
                                                        labelFormatter={d => `Date: ${new Date(d).toLocaleDateString('en-GB')}`}
                                                        formatter={(v: number) => [v, 'Dispensed']}
                                                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                                    />
                                                    <Bar dataKey="dispensed" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center text-slate-400">
                                            <BarChart2 size={40} className="opacity-20 mx-auto mb-3" />
                                            <p className="font-semibold">No dispensing activity in this period</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── REVENUE TAB ─────────────────────────────── */}
                            {activeTab === 'revenue' && (
                                <div className="space-y-4">
                                    {/* Total Banner */}
                                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/20">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Revenue (Period)</p>
                                            <p className="text-2xl font-extrabold text-green-700 dark:text-green-400 mt-1">{fmtCurrency(totalRevenue)}</p>
                                        </div>
                                        <TrendingUp size={32} className="text-green-300" />
                                    </div>

                                    {revenueLines.length > 0 ? (
                                        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-[#2c2c2e] text-slate-400 uppercase text-xs tracking-wider">
                                                        <th className="text-left px-4 py-3">Date</th>
                                                        <th className="text-left px-4 py-3">Patient</th>
                                                        <th className="text-left px-4 py-3">Medication</th>
                                                        <th className="text-right px-4 py-3">Qty</th>
                                                        <th className="text-right px-4 py-3">Unit Price</th>
                                                        <th className="text-right px-4 py-3">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                    {revenueLines.map((line, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#2c2c2e] transition-colors">
                                                            <td className="px-4 py-3 text-slate-500">{fmt(line.date)}</td>
                                                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{line.patientName}</td>
                                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{line.medicationName}</td>
                                                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{line.quantity}</td>
                                                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{fmtCurrency(line.unitPrice)}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-green-700 dark:text-green-400">{fmtCurrency(line.total)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-slate-50 dark:bg-[#2c2c2e] font-bold">
                                                        <td colSpan={5} className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">Total Revenue</td>
                                                        <td className="px-4 py-3 text-right text-green-700 dark:text-green-400">{fmtCurrency(totalRevenue)}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="py-16 text-center text-slate-400">
                                            <ReceiptText size={40} className="opacity-20 mx-auto mb-3" />
                                            <p className="font-semibold">No revenue data for this period</p>
                                            <p className="text-xs mt-1">Unit prices need to be set on dispensing records</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── EXPENSES TAB ─────────────────────────────── */}
                            {activeTab === 'expenses' && (
                                <div className="space-y-4">
                                    {/* Header row */}
                                    <div className="flex items-center justify-between">
                                        <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 flex-1 mr-4">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Expenses (Period)</p>
                                            <p className="text-2xl font-extrabold text-red-600 dark:text-red-400 mt-1">{fmtCurrency(totalExpenses)}</p>
                                        </div>
                                        <button
                                            onClick={() => setShowExpenseModal(true)}
                                            className="flex items-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-semibold text-sm shadow-lg shadow-brand-500/20 transition-all active:scale-95"
                                        >
                                            <PlusCircle size={18} />
                                            Add Expense
                                        </button>
                                    </div>

                                    {expenses.length > 0 ? (
                                        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-[#2c2c2e] text-slate-400 uppercase text-xs tracking-wider">
                                                        <th className="text-left px-4 py-3">Date</th>
                                                        <th className="text-left px-4 py-3">Medication / Item</th>
                                                        <th className="text-left px-4 py-3">Supplier</th>
                                                        <th className="text-right px-4 py-3">Qty</th>
                                                        <th className="text-right px-4 py-3">Unit Cost</th>
                                                        <th className="text-right px-4 py-3">Total</th>
                                                        <th className="px-4 py-3"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                    {expenses.map(exp => (
                                                        <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-[#2c2c2e] transition-colors">
                                                            <td className="px-4 py-3 text-slate-500">{fmt(exp.purchasedAt)}</td>
                                                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{exp.medicationName}</td>
                                                            <td className="px-4 py-3 text-slate-500">{exp.supplier || '—'}</td>
                                                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{exp.quantity}</td>
                                                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{fmtCurrency(exp.unitCost)}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">{fmtCurrency(exp.totalCost)}</td>
                                                            <td className="px-4 py-3 text-right">
                                                                <button
                                                                    onClick={() => handleDeleteExpense(exp.id)}
                                                                    disabled={deletingId === exp.id}
                                                                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10"
                                                                >
                                                                    {deletingId === exp.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-slate-50 dark:bg-[#2c2c2e] font-bold">
                                                        <td colSpan={5} className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">Total Expenses</td>
                                                        <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{fmtCurrency(totalExpenses)}</td>
                                                        <td />
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="py-16 text-center text-slate-400">
                                            <ClipboardList size={40} className="opacity-20 mx-auto mb-3" />
                                            <p className="font-semibold">No expenses recorded</p>
                                            <p className="text-xs mt-1">Click "Add Expense" to record a drug procurement cost</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── HISTORY TAB ─────────────────────────────── */}
                            {activeTab === 'history' && (
                                <div className="space-y-4">
                                    {/* Search */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search patient or medication..."
                                            value={historySearch}
                                            onChange={e => setHistorySearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/30 dark:text-white placeholder-slate-400"
                                        />
                                    </div>

                                    <p className="text-xs text-slate-400 font-medium">
                                        {filteredHistory.length} record{filteredHistory.length !== 1 ? 's' : ''} found
                                    </p>

                                    {filteredHistory.length > 0 ? (
                                        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-[#2c2c2e] text-slate-400 uppercase text-xs tracking-wider">
                                                        <th className="text-left px-4 py-3">Date & Time</th>
                                                        <th className="text-left px-4 py-3">Patient</th>
                                                        <th className="text-left px-4 py-3">Medication</th>
                                                        <th className="text-left px-4 py-3">Dosage</th>
                                                        <th className="text-right px-4 py-3">Qty</th>
                                                        <th className="text-left px-4 py-3">Notes</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                    {filteredHistory.map(record => (
                                                        <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-[#2c2c2e] transition-colors">
                                                            <td className="px-4 py-3">
                                                                <p className="font-semibold text-slate-700 dark:text-slate-300">{fmt(record.dispensedAt)}</p>
                                                                <p className="text-xs text-slate-400">{fmtTime(record.dispensedAt)}</p>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold shrink-0">
                                                                        {record.patientName.charAt(0)}
                                                                    </div>
                                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{record.patientName}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                                                    <Pill size={14} className="text-brand-500 shrink-0" />
                                                                    {record.medicationName}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-500">{record.dosage}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-200">
                                                                {record.quantity} <span className="text-xs font-normal text-slate-400">{record.unit}</span>
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-400 text-xs max-w-[150px] truncate">{record.notes || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="py-16 text-center text-slate-400">
                                            <History size={40} className="opacity-20 mx-auto mb-3" />
                                            <p className="font-semibold">{historySearch ? 'No results found' : 'No dispensing history in this period'}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
