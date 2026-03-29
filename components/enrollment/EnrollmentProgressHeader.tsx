import React from "react";

const STEP_LABELS = [
  { num: 1, label: "Identity" },
  { num: 2, label: "Contact" },
  { num: 3, label: "Department" },
  { num: 4, label: "Details" },
  { num: 5, label: "Consent" },
];

interface EnrollmentProgressHeaderProps {
  step: number;
  onStepClick: (targetStep: number) => void;
  onAdvance: () => void;
}

export const EnrollmentProgressHeader: React.FC<EnrollmentProgressHeaderProps> = ({
  step,
  onStepClick,
  onAdvance,
}) => (
  <div className="mb-6 md:mb-8 text-center">
    <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-slate-200 dark:bg-slate-800 rounded-2xl md:rounded-full mb-6 md:mb-8">
      {STEP_LABELS.map((s) => (
        <button
          key={s.num}
          type="button"
          onClick={() => {
            if (s.num < step) {
              onStepClick(s.num);
            } else if (s.num === step + 1) {
              onAdvance();
            }
          }}
          className={`
                  px-3 md:px-6 py-2 rounded-xl md:rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide transition-all duration-300 flex-1 md:flex-none
                  ${
                    step === s.num
                      ? "bg-white dark:bg-[#2c2c2e] text-slate-900 dark:text-white shadow-sm scale-105"
                      : step > s.num
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                  }
                `}
        >
          {step > s.num ? (
            <span className="flex items-center justify-center gap-1">
              ✓ <span className="hidden md:inline">{s.label}</span>
            </span>
          ) : (
            s.label
          )}
        </button>
      ))}
    </div>
    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
      Patient Intake
    </h1>
    <p className="text-slate-500 dark:text-slate-400 mt-2 text-base md:text-lg">
      Gather clinical & demographic details.
    </p>
  </div>
);
