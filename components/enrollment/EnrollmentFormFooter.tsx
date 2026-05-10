import React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface EnrollmentFormFooterProps {
  step: number;
  loading: boolean;
  consent: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export const EnrollmentFormFooter: React.FC<EnrollmentFormFooterProps> = ({
  step,
  loading,
  consent,
  onPrev,
  onNext,
}) => (
  <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex justify-between items-center p-6 pt-12 md:p-10 bg-gradient-to-t from-white via-white to-transparent dark:from-[#1c1c1e] dark:via-[#1c1c1e]">
    <button
      type="button"
      onClick={onPrev}
      disabled={step === 1 || loading}
      className={`pointer-events-auto p-4 rounded-full transition-all ${
        step === 1
          ? "opacity-0 pointer-events-none"
          : "text-slate-400 hover:bg-slate-100 dark:hover:bg-[#2c2c2e] hover:text-slate-600 dark:hover:text-slate-200"
      }`}
    >
      <ChevronLeft size={24} />
    </button>

    {step < 5 ? (
      <button
        type="button"
        onClick={onNext}
        className="pointer-events-auto group flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-xl text-sm md:text-base"
      >
        Next Step <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
      </button>
    ) : (
      <button
        type="submit"
        disabled={!consent || loading}
        className={`pointer-events-auto group flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 rounded-full font-bold transition-all shadow-lg text-sm md:text-base ${
          consent
            ? "bg-brand-600 text-white hover:bg-brand-500 active:scale-95 shadow-brand-500/30"
            : "bg-slate-200 text-slate-400 cursor-not-allowed"
        }`}
      >
        {loading ? <Loader2 className="animate-spin" /> : "Complete Enrollment"}
      </button>
    )}
  </div>
);
