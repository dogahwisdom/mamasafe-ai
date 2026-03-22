import React, { useEffect, useState } from 'react';
import { UserProfile, InventoryItem } from '../types';
import { backend } from '../services/backend';
import { downloadInventoryStockPdf } from '../services/pdfReports';
import { ArrowLeft, BookOpen, Download, Loader2, Package, Save, FileText } from 'lucide-react';

interface InventoryViewProps {
  user: UserProfile;
  onBack: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ user, onBack }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { stock: string; minLevel: string }>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await backend.pharmacy.getInventory();
      setItems(data);
      const d: Record<string, { stock: string; minLevel: string }> = {};
      for (const row of data) {
        d[row.id] = { stock: String(row.stock), minLevel: String(row.minLevel) };
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

  const handleDraft = (id: string, field: 'stock' | 'minLevel', value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSaveRow = async (item: InventoryItem) => {
    const d = drafts[item.id];
    if (!d) return;
    const stock = parseInt(d.stock, 10);
    const minLevel = parseInt(d.minLevel, 10);
    if (Number.isNaN(stock) || stock < 0 || Number.isNaN(minLevel) || minLevel < 0) {
      alert('Enter valid non-negative numbers for stock and min level.');
      return;
    }
    setSavingId(item.id);
    try {
      await backend.pharmacy.updateInventoryItem(item.id, { stock, minLevel });
      await load();
    } catch (e) {
      console.error(e);
      alert('Failed to update stock.');
    } finally {
      setSavingId(null);
    }
  };

  const handleExportPdf = () => {
    downloadInventoryStockPdf(user, items);
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
                Reference layout (Nila Pharmaceuticals–style sample)
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Use this familiar <strong className="text-slate-800 dark:text-slate-200">code + product + table</strong> format as a guide when updating stock.
                Your <strong>Download PDF</strong> export uses the same kind of header and bordered grid; see{' '}
                <code className="text-xs bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.5 rounded">docs/INVENTORY_REFERENCE_NILA.md</code> for details.
              </p>
              <a
                href="/inventory-reference/nila-pharmaceutical-comprehensive-price-list-2023.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-2 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                <FileText size={16} />
                Open Nila Pharmaceuticals PDF price list (2023)
              </a>
            </div>
            <a
              href="/inventory-reference/nila-pharmaceuticals-price-list-reference.png"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 block w-full max-w-sm mx-auto lg:mx-0 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white shadow-sm hover:opacity-95 transition-opacity"
              title="Open reference image full size"
            >
              <img
                src="/inventory-reference/nila-pharmaceuticals-price-list-reference.png"
                alt="Sample professional pharmacy price list layout: branded header and three-column table"
                className="w-full h-auto object-contain max-h-48 object-top"
                loading="lazy"
              />
              <div className="px-3 py-2 text-[11px] text-center text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                Tap to open full size · example layout only
              </div>
            </a>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
            <Loader2 className="animate-spin" size={24} />
            Loading inventory…
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No inventory rows yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#2c2c2e] text-left border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Code</th>
                  <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Product</th>
                  <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200 text-right">Current stock</th>
                  <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200 text-right">Min level</th>
                  <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200 w-28"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const d = drafts[item.id] || {
                    stock: String(item.stock),
                    minLevel: String(item.minLevel),
                  };
                  const low = item.stock <= item.minLevel;
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-100 dark:border-slate-800 ${
                        low ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {item.id.replace(/-/g, '').slice(0, 12).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-slate-900 dark:text-white">
                        {item.name}
                        <span className="text-slate-500 dark:text-slate-400"> · {item.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-right"
                          value={d.stock}
                          onChange={(e) => handleDraft(item.id, 'stock', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-right"
                          value={d.minLevel}
                          onChange={(e) => handleDraft(item.id, 'minLevel', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleSaveRow(item)}
                          disabled={savingId === item.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50"
                        >
                          {savingId === item.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Save size={14} />
                          )}
                          Save
                        </button>
                      </td>
                    </tr>
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
