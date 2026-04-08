import React from "react";

export type AgeGroupKey = "under5" | "5to18" | "above18" | "above35";

export interface AgeGroupCounts {
  under5: number;
  "5to18": number;
  above18: number;
  above35: number;
}

interface AgeGroupReportProps {
  title?: string;
  subtitle?: string;
  counts: AgeGroupCounts;
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
}) => {
  const total =
    counts.under5 + counts["5to18"] + counts.above18 + counts.above35;

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
        {GROUPS.map((g) => (
          <div
            key={g.key}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700"
          >
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {g.label}
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {counts[g.key]}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {g.hint}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-4">
        Note: “35+” is a subset of “Above 18”. If you need mutually exclusive
        age buckets, we can change this to 19–34 and 35+.
      </p>
    </div>
  );
};

