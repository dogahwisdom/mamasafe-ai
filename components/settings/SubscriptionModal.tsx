import React from "react";
import { Check, X } from "lucide-react";

export type SubscriptionPlan = {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
};

type Props = {
  open: boolean;
  plans: SubscriptionPlan[];
  currentPlanId: string;
  busy?: boolean;
  onClose: () => void;
  onSelectPlan: (planId: string) => void;
};

export const SubscriptionModal: React.FC<Props> = ({
  open,
  plans,
  currentPlanId,
  busy,
  onClose,
  onSelectPlan,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Subscription</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select a plan. Changes apply immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <button
                key={plan.id}
                type="button"
                disabled={busy}
                onClick={() => onSelectPlan(plan.id)}
                className={`w-full text-left rounded-2xl border px-4 py-4 transition-colors ${
                  isCurrent
                    ? "border-brand-300 bg-brand-50/60 dark:border-brand-800 dark:bg-brand-950/30"
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/30"
                } disabled:opacity-60`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-slate-900 dark:text-white">{plan.name}</div>
                      {isCurrent ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-600 text-white">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">{plan.price}</span>{" "}
                      <span className="text-slate-500 dark:text-slate-400">{plan.period}</span>
                    </div>
                  </div>
                  {isCurrent ? (
                    <div className="shrink-0 rounded-full bg-brand-600 text-white p-1.5">
                      <Check size={14} />
                    </div>
                  ) : null}
                </div>

                <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-slate-600 dark:text-slate-300">
                  {plan.features.slice(0, 6).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
                      <span className="leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

