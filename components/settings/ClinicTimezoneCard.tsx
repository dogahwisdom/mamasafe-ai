import React from "react";
import { Globe, Loader2 } from "lucide-react";

type Props = {
  value: string;
  onChange: (next: string) => void;
  saving?: boolean;
  disabled?: boolean;
};

export const ClinicTimezoneCard: React.FC<Props> = ({ value, onChange, saving, disabled }) => {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1c1c1e] overflow-hidden">
      <div className="p-4 border-b border-slate-50 dark:border-slate-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Globe size={18} />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">Clinic timezone</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Controls how dates/times appear in Outreach and reminders.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin text-slate-400" /> : null}
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled || saving}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#2c2c2e] text-sm disabled:opacity-60"
            >
              <option value="">Auto (from country)</option>
              <option value="Africa/Nairobi">Africa/Nairobi (KE)</option>
              <option value="Africa/Accra">Africa/Accra (GH)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

