import React, { useMemo, useState } from "react";

export type AgeGroupKey = "under5" | "5to18" | "above18" | "above35";

export interface AgeGroupCounts {
  under5: number;
  "5to18": number;
  above18: number;
  above35: number;
}

/** One row in the drill-down list (unique patients; visitsInBucket matches dashboard counts). */
export interface AgeGroupPatientRow {
  patientId: string;
  name: string;
  age: number;
  phone?: string;
  visitsInBucket: number;
}

interface AgeGroupReportProps {
  title?: string;
  subtitle?: string;
  counts: AgeGroupCounts;
  /** When provided, each bucket can be expanded to list patients in that age band. */
  patientsByGroup?: Partial<Record<AgeGroupKey, AgeGroupPatientRow[]>>;
  onOpenPatients?: () => void;
}

const GROUPS: Array<{ key: AgeGroupKey; label: string; hint: string }> = [
  { key: "under5", label: "Under 5", hint: "0–4 years" },
  { key: "5to18", label: "5–18", hint: "Children & adolescents" },
  { key: "above18", label: "Above 18", hint: "Adults (19+)" },
  { key: "above35", label: "35+ years", hint: "Adults 35 and above" },
];

export const AgeGroupReport: React.FC<AgeGroupReportProps> = ({
  title = "Patient report (age groups)",
  subtitle = "Derived from workflow visits (by patient age at enrollment).",
  counts,
  patientsByGroup,
  onOpenPatients,
}) => {
  const [expanded, setExpanded] = useState<AgeGroupKey | null>(null);

  const total = useMemo(
    () => counts.under5 + counts["5to18"] + counts.above18 + counts.above35,
    [counts]
  );

  const expandedRows = expanded ? patientsByGroup?.[expanded] ?? [] : [];
  const expandedLabel = GROUPS.find((g) => g.key === expanded)?.label ?? "";

  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {subtitle}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {total}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        {GROUPS.map((g) => {
          const n = counts[g.key];
          const hasDetails = !!patientsByGroup && n > 0;
          const isOpen = expanded === g.key;
          return (
            <button
              key={g.key}
              type="button"
              disabled={!hasDetails}
              onClick={() => {
                if (!hasDetails) return;
                setExpanded(isOpen ? null : g.key);
              }}
              className={`text-left p-4 rounded-2xl border transition-colors ${
                isOpen
                  ? "bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-900/50 ring-1 ring-brand-200/80 dark:ring-brand-900/40"
                  : "bg-slate-50 dark:bg-[#2c2c2e] border-slate-200 dark:border-slate-700"
              } ${
                hasDetails
                  ? "hover:bg-slate-100 dark:hover:bg-[#353535] cursor-pointer"
                  : "opacity-80 cursor-default"
              }`}
            >
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {g.label}
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {n}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {g.hint}
              </div>
              {hasDetails && (
                <div className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 mt-2">
                  {isOpen ? "Hide list" : "View patients"}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {expanded && patientsByGroup && (
        <div className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-[#252525] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/20">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {expandedLabel} — patients ({expandedRows.length} unique)
            </div>
            <div className="flex items-center gap-2">
              {onOpenPatients && (
                <button
                  type="button"
                  onClick={() => onOpenPatients()}
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Open Patients
                </button>
              )}
              <button
                type="button"
                onClick={() => setExpanded(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
          {expandedRows.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 px-4 py-6">
              No patient rows for this bucket (counts are visit-based; age may be missing for some
              visits).
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-100/95 dark:bg-[#2c2c2e] text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2 w-16">Age</th>
                    <th className="px-4 py-2">Phone</th>
                    <th className="px-4 py-2 w-24 text-right">Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {expandedRows.map((row) => (
                    <tr
                      key={row.patientId}
                      className="border-t border-slate-200/80 dark:border-slate-700/80 hover:bg-white/70 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                        {row.name}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.age}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 font-mono text-xs">
                        {row.phone || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-200">
                        {row.visitsInBucket}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-4">
        Note: “35+” is a subset of “Above 18”. If you need mutually exclusive age buckets, we can
        change this to 19–34 and 35+. Card totals count workflow visits; the list shows unique
        patients and how many of their visits fall in each band.
      </p>
    </div>
  );
};
