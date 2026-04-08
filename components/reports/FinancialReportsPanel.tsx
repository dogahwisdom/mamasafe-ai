import React, { useMemo, useState } from "react";
import { formatPaymentMethodLabel } from "../../services/paymentMethodLabels";

export type PaymentMethodKey =
  | "cash"
  | "mpesa"
  | "card"
  | "insurance"
  | "shif"
  | "waiver"
  | string;

export type FinancialPeriodKey = "week" | "month" | "year";

export interface FinancialBreakdown {
  totalKes: number;
  byMethod: Record<PaymentMethodKey, number>;
}

export interface FinancialReportsData {
  week: FinancialBreakdown;
  month: FinancialBreakdown;
  year: FinancialBreakdown;
}

interface FinancialReportsPanelProps {
  data: FinancialReportsData;
  title?: string;
  subtitle?: string;
}

function formatKes(n: number): string {
  return n.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const FinancialReportsPanel: React.FC<FinancialReportsPanelProps> = ({
  data,
  title = "Financial reports",
  subtitle = "Weekly, monthly, and annual totals by payment method.",
}) => {
  const [period, setPeriod] = useState<FinancialPeriodKey>("week");

  const row = data[period];
  const sortedMethods = useMemo(() => {
    const entries = Object.entries(row.byMethod).filter(([, v]) => v > 0);
    return entries.sort((a, b) => b[1] - a[1]);
  }, [row.byMethod]);

  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {subtitle}
          </p>
        </div>

        <div className="inline-flex rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#2c2c2e]">
          {([
            { k: "week", label: "Week" },
            { k: "month", label: "Month" },
            { k: "year", label: "Year" },
          ] as const).map((p) => (
            <button
              key={p.k}
              type="button"
              onClick={() => setPeriod(p.k)}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                period === p.k
                  ? "bg-slate-900 text-white dark:bg-white dark:text-black"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#3a3a3c]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total collected (KES)
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatKes(row.totalKes)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Paid payments only
          </div>
        </div>

        <div className="lg:col-span-2 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Breakdown by payment method
          </div>
          {sortedMethods.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              No payments recorded for this period.
            </div>
          ) : (
            <div className="space-y-2">
              {sortedMethods.map(([method, amount]) => (
                <div
                  key={method}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="font-semibold text-slate-700 dark:text-slate-200">
                    {formatPaymentMethodLabel(method)}
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatKes(amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

