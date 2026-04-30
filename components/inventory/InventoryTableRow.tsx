import React from "react";
import { InventoryItem } from "../../types";
import { Loader2, Save, Trash2 } from "lucide-react";

export type InventoryDraft = {
  name: string;
  unit: string;
  stock: string;
  minLevel: string;
  unitPriceKes: string;
  supplier: string;
  expiryDate: string;
};

interface InventoryTableRowProps {
  item: InventoryItem;
  draft: InventoryDraft;
  saving: boolean;
  expiryHint: string | null;
  expired: boolean;
  soon: boolean;
  low: boolean;
  onDraft: (field: keyof InventoryDraft, value: string) => void;
  onSave: () => void;
  onDelete: () => void;
}

export const InventoryTableRow: React.FC<InventoryTableRowProps> = ({
  item,
  draft,
  saving,
  expiryHint,
  expired,
  soon,
  low,
  onDraft,
  onSave,
  onDelete,
}) => {
  return (
    <tr
      className={`border-b border-slate-100 dark:border-slate-800 ${
        low ? "bg-amber-50/60 dark:bg-amber-900/10" : ""
      } ${expired ? "bg-red-50/50 dark:bg-red-950/20" : ""}`}
    >
      <td className="px-3 py-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
        {item.id.replace(/-/g, "").slice(0, 12).toUpperCase()}
      </td>

      <td className="px-3 py-3 text-slate-900 dark:text-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="w-full min-w-[220px] max-w-[320px] px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-sm"
            value={draft.name}
            onChange={(e) => onDraft("name", e.target.value)}
            aria-label="Medication name"
          />
          <input
            type="text"
            className="w-28 min-w-[7rem] px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-sm"
            value={draft.unit}
            onChange={(e) => onDraft("unit", e.target.value)}
            aria-label="Unit"
          />
        </div>
      </td>

      <td className="px-3 py-3 text-right">
        <input
          type="text"
          inputMode="decimal"
          className="w-28 min-w-[7rem] px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-right text-sm"
          placeholder="N/A"
          value={draft.unitPriceKes}
          onChange={(e) => onDraft("unitPriceKes", e.target.value)}
          aria-label="Unit price KES"
        />
      </td>

      <td className="px-3 py-3">
        <input
          type="text"
          className="w-full min-w-[140px] max-w-[220px] px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-sm"
          placeholder="N/A"
          value={draft.supplier}
          onChange={(e) => onDraft("supplier", e.target.value)}
          aria-label="Supplier"
        />
      </td>

      <td className="px-3 py-3 align-top">
        <input
          type="date"
          className="w-36 max-w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-sm"
          value={draft.expiryDate}
          onChange={(e) => onDraft("expiryDate", e.target.value)}
          aria-label="Expiry date"
        />
        {expiryHint && (
          <p
            className={`text-[10px] mt-1 font-semibold ${
              expired
                ? "text-red-600 dark:text-red-400"
                : soon
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-500"
            }`}
          >
            {expiryHint}
          </p>
        )}
      </td>

      <td className="px-3 py-3 text-right">
        <input
          type="number"
          min={0}
          className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-right"
          value={draft.stock}
          onChange={(e) => onDraft("stock", e.target.value)}
        />
      </td>

      <td className="px-3 py-3 text-right">
        <input
          type="number"
          min={0}
          className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2c2c2e] text-right"
          value={draft.minLevel}
          onChange={(e) => onDraft("minLevel", e.target.value)}
        />
      </td>

      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
            title="Remove medication from inventory"
          >
            <Trash2 size={14} />
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
};

