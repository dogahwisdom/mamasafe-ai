import React, { useEffect, useState } from 'react';
import { UserProfile, InventoryItem } from '../types';
import { backend } from '../services/backend';
import { downloadInventoryStockPdf } from '../services/pdfReports';
import { ArrowLeft, BookOpen, Download, Loader2, Package, Plus, Save, FileText } from 'lucide-react';
import { InventoryTableRow, type InventoryDraft } from '../components/inventory/InventoryTableRow';

interface InventoryViewProps {
  user: UserProfile;
  onBack: () => void;
}

// InventoryDraft is defined in InventoryTableRow for reuse.

/** FEFO-style expiry hint (expired / within 30 days). */
function expiryStatusLabel(iso: string): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'Expired';
  if (diff === 0) return 'Due today';
  if (diff <= 30) return `${diff}d to expiry`;
  return null;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ user, onBack }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, InventoryDraft>>({});
  const [addForm, setAddForm] = useState({
    name: '',
    unit: 'tablets',
    stock: '0',
    minLevel: '0',
    unitPriceKes: '',
    supplier: '',
    expiryDate: '',
  });
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await backend.pharmacy.getInventory();
      setItems(data);
      const d: Record<string, InventoryDraft> = {};
      for (const row of data) {
        d[row.id] = {
          name: row.name,
          unit: row.unit,
          stock: String(row.stock),
          minLevel: String(row.minLevel),
          unitPriceKes:
            row.unitPriceKes != null && !Number.isNaN(Number(row.unitPriceKes))
              ? String(row.unitPriceKes)
              : '',
          supplier: row.supplier ?? '',
          expiryDate: row.expiryDate ?? '',
        };
      }
      setDrafts(d);
    } catch (e) {
      console.error(e);
      alert('Could not load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDraft = (id: string, field: keyof InventoryDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSaveRow = async (item: InventoryItem) => {
    const d = drafts[item.id];
    if (!d) return;
    const name = d.name.trim();
    const unit = d.unit.trim() || 'units';
    if (!name) {
      alert('Medication name is required.');
      return;
    }
    const stock = parseInt(d.stock, 10);
    const minLevel = parseInt(d.minLevel, 10);
    if (Number.isNaN(stock) || stock < 0 || Number.isNaN(minLevel) || minLevel < 0) {
      alert('Enter valid non-negative numbers for stock and min level.');
      return;
    }
    const priceRaw = d.unitPriceKes.trim();
    let unitPriceKes: number | null = null;
    if (priceRaw !== '') {
      const p = parseFloat(priceRaw.replace(/,/g, ''));
      if (Number.isNaN(p) || p < 0) {
        alert('Enter a valid unit price (KES) or leave blank.');
        return;
      }
      unitPriceKes = p;
    }
    const supplier = d.supplier.trim() || null;
    const expiryDate = d.expiryDate.trim() || null;

    setSavingId(item.id);
    try {
      await backend.pharmacy.updateInventoryItem(item.id, {
        name,
        unit,
        stock,
        minLevel,
        unitPriceKes,
        supplier,
        expiryDate,
      });
      await load();
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Failed to update inventory.';
      alert(msg);
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteRow = async (item: InventoryItem) => {
    if (!confirm(`Remove "${item.name}" from inventory?\n\nThis cannot be undone.`)) return;
    setSavingId(item.id);
    try {
      await backend.pharmacy.deleteInventoryItem(item.id);
      await load();
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Failed to remove item.';
      alert(msg);
    } finally {
      setSavingId(null);
    }
  };

  const handleExportPdf = () => {
    downloadInventoryStockPdf(user, items);
  };

  const handleAddMedication = async () => {
    const name = addForm.name.trim();
    if (!name) {
      alert('Enter a medication name.');
      return;
    }
    const stock = parseInt(addForm.stock, 10);
    const minLevel = parseInt(addForm.minLevel, 10);
    if (Number.isNaN(stock) || stock < 0 || Number.isNaN(minLevel) || minLevel < 0) {
      alert('Enter valid stock and min level (0 or more).');
      return;
    }
    let unitPriceKes: number | null = null;
    const pr = addForm.unitPriceKes.trim();
    if (pr !== '') {
      const p = parseFloat(pr.replace(/,/g, ''));
      if (Number.isNaN(p) || p < 0) {
        alert('Enter a valid unit price (KES) or leave blank.');
        return;
      }
      unitPriceKes = p;
    }

    setAdding(true);
    try {
      await backend.pharmacy.addInventoryItem({
        name,
        unit: addForm.unit.trim() || 'units',
        stock,
        minLevel,
        unitPriceKes,
        supplier: addForm.supplier.trim() || null,
        expiryDate: addForm.expiryDate.trim() || null,
      });
      setAddForm({
        name: '',
        unit: 'tablets',
        stock: '0',
        minLevel: '0',
        unitPriceKes: '',
        supplier: '',
        expiryDate: '',
      });
      await load();
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Failed to add medication.';
      alert(msg);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              <Package className="text-brand-600" size={28} />
              Stock & inventory
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Update levels for dispensing and export a printable stock list (PDF).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={loading || items.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm disabled:opacity-50"
        >
          <Download size={18} />
          Download PDF
        </button>
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40">
          <div className="flex flex-col lg:flex-row gap-5 lg:items-start">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <BookOpen size={18} className="text-brand-600 shrink-0" />
                Reference layout (price list layout sample)
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Use this familiar <strong className="text-slate-800 dark:text-slate-200">code + product + table</strong> format as a guide when updating stock.
                You create inventory rows in the platform using <strong>Add medication</strong>; the reference download is only for layout/price-sheet reconciliation.
                Your <strong>Download PDF</strong> export uses the same kind of header and bordered grid; see{' '}
                <code className="text-xs bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.5 rounded">docs/INVENTORY_REFERENCE_PRICE_LIST.md</code> for details.
              </p>
              <a
                href="/inventory-reference/comprehensive-price-list-2023.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-2 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                <FileText size={16} />
                Open comprehensive price list PDF (2023)
              </a>
            </div>
            <a
              href="/inventory-reference/price-list-layout-reference.png"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 block w-full max-w-sm mx-auto lg:mx-0 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white shadow-sm hover:opacity-95 transition-opacity"
              title="Open reference image full size"
            >
              <img
                src="/inventory-reference/price-list-layout-reference.png"
                alt="Sample professional price list layout: branded header and three-column table"
                className="w-full h-auto object-contain max-h-48 object-top"
                loading="lazy"
              />
              <div className="px-3 py-2 text-[11px] text-center text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                Tap to open full size · example layout only
              </div>
            </a>
          </div>
        </div>

        <div className="p-4 md:p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1c1c1e]">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Add medication</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Register a new line in stock (name must be unique). Optional: unit trade price, supplier, and expiry for
            procurement and FEFO monitoring—then fine-tune in the table.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-4">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Medication name *
              </label>
              <input
                type="text"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-slate-900 dark:text-white"
                placeholder="e.g. Paracetamol 500mg"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Unit</label>
              <input
                type="text"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-slate-900 dark:text-white"
                placeholder="tablets, bottles…"
                value={addForm.unit}
                onChange={(e) => setAddForm((f) => ({ ...f, unit: e.target.value }))}
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Initial stock</label>
              <input
                type="number"
                min={0}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-slate-900 dark:text-white"
                value={addForm.stock}
                onChange={(e) => setAddForm((f) => ({ ...f, stock: e.target.value }))}
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Min level</label>
              <input
                type="number"
                min={0}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-slate-900 dark:text-white"
                value={addForm.minLevel}
                onChange={(e) => setAddForm((f) => ({ ...f, minLevel: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end mt-3">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Unit price (KES)
              </label>
              <input
                type="text"
                inputMode="decimal"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-slate-900 dark:text-white"
                placeholder="e.g. 120.00"
                value={addForm.unitPriceKes}
                onChange={(e) => setAddForm((f) => ({ ...f, unitPriceKes: e.target.value }))}
              />
            </div>
            <div className="lg:col-span-4">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Supplier</label>
              <input
                type="text"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-slate-900 dark:text-white"
                placeholder="Vendor or wholesaler"
                value={addForm.supplier}
                onChange={(e) => setAddForm((f) => ({ ...f, supplier: e.target.value }))}
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Expiry</label>
              <input
                type="date"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-slate-900 dark:text-white"
                value={addForm.expiryDate}
                onChange={(e) => setAddForm((f) => ({ ...f, expiryDate: e.target.value }))}
              />
            </div>
            <div className="lg:col-span-4">
              <button
                type="button"
                onClick={handleAddMedication}
                disabled={adding || loading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm disabled:opacity-50 min-h-[42px]"
              >
                {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Add medication
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
            <Loader2 className="animate-spin" size={24} />
            Loading inventory…
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No inventory rows yet. Add a medication above to create your first line.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[72rem]">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#2c2c2e] text-left border-b border-slate-200 dark:border-slate-700">
                  <th className="px-3 py-3 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">Code</th>
                  <th className="px-3 py-3 font-bold text-slate-700 dark:text-slate-200 min-w-[10rem]">Medication</th>
                  <th className="px-3 py-3 font-bold text-slate-700 dark:text-slate-200 text-right whitespace-nowrap">
                    Unit price (KES)
                  </th>
                  <th className="px-3 py-3 font-bold text-slate-700 dark:text-slate-200 min-w-[8rem]">Supplier</th>
                  <th className="px-3 py-3 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">Expiry</th>
                  <th className="px-3 py-3 font-bold text-slate-700 dark:text-slate-200 text-right whitespace-nowrap">
                    Current stock
                  </th>
                  <th className="px-3 py-3 font-bold text-slate-700 dark:text-slate-200 text-right whitespace-nowrap">
                    Min level
                  </th>
                  <th className="px-3 py-3 font-bold text-slate-700 dark:text-slate-200 w-28"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const d =
                    drafts[item.id] ||
                    ({
                      name: item.name,
                      unit: item.unit,
                      stock: String(item.stock),
                      minLevel: String(item.minLevel),
                      unitPriceKes:
                        item.unitPriceKes != null && !Number.isNaN(Number(item.unitPriceKes))
                          ? String(item.unitPriceKes)
                          : '',
                      supplier: item.supplier ?? '',
                      expiryDate: item.expiryDate ?? '',
                    } satisfies InventoryDraft);
                  const low = item.stock <= item.minLevel;
                  const expHint = expiryStatusLabel(d.expiryDate);
                  const expired = expHint === 'Expired';
                  const soon = expHint !== null && expHint !== 'Expired';
                  return (
                    <InventoryTableRow
                      key={item.id}
                      item={item}
                      draft={d}
                      saving={savingId === item.id}
                      expiryHint={expHint}
                      expired={expired}
                      soon={soon}
                      low={low}
                      onDraft={(field, value) => handleDraft(item.id, field, value)}
                      onSave={() => handleSaveRow(item)}
                      onDelete={() => handleDeleteRow(item)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
