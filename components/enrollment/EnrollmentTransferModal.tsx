import React from "react";
import { X, ArrowRight, Loader2 } from "lucide-react";
import type { ExistingPatientLookup } from "./EnrollmentStepContact";

interface EnrollmentTransferModalProps {
  open: boolean;
  existingPatient: ExistingPatientLookup | null;
  transferReason: string;
  setTransferReason: (v: string) => void;
  requestingTransfer: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export const EnrollmentTransferModal: React.FC<EnrollmentTransferModalProps> = ({
  open,
  existingPatient,
  transferReason,
  setTransferReason,
  requestingTransfer,
  onClose,
  onSubmit,
}) => {
  if (!open || !existingPatient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative animate-scale-in border border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Patient Transfer Request
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-100 dark:bg-[#2c2c2e] rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-900/30">
            <p className="text-sm text-orange-800 dark:text-orange-300 mb-2">
              <strong>{existingPatient.patientName}</strong> is already enrolled at{" "}
              <strong>{existingPatient.facilityName}</strong>.
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-400">
              This transfer is optional and is used to align records between facilities. You can
              continue enrollment without requesting it.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Reason for Transfer *
            </label>
            <textarea
              required
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#2c2c2e] border border-transparent focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 text-slate-900 dark:text-white outline-none resize-none h-32"
              placeholder="e.g. Patient moved to this area and prefers to continue care at this facility..."
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-[#3a3a3c] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={requestingTransfer || !transferReason.trim()}
              className="flex-1 px-6 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {requestingTransfer ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Sending...
                </>
              ) : (
                <>
                  <ArrowRight size={18} />
                  Request Transfer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
