import React from "react";
import { CreditCard, Edit2 } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
};

type Props = {
  plan: Plan;
  onManage: () => void;
};

export const SubscriptionSummaryCard: React.FC<Props> = ({ plan, onManage }) => {
  const badge = plan.id === "basic" ? "Free" : plan.id === "pro" ? "Pro" : "Enterprise";

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1c1c1e] p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <CreditCard size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Subscription</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Current plan</div>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
          {badge}
        </span>
      </div>

      <div className="mt-5">
        <div className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          <span className="font-semibold">{plan.price}</span>{" "}
          <span className="text-slate-500 dark:text-slate-400">{plan.period}</span>
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-[12px] text-slate-600 dark:text-slate-300">
        {plan.features.slice(0, 4).map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
            <span className="leading-snug">{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onManage}
        className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700 transition-colors"
      >
        <Edit2 size={16} />
        Manage subscription
      </button>
    </div>
  );
};

