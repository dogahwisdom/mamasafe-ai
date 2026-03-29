import React from "react";
import { Lock, CheckCircle } from "lucide-react";

interface EnrollmentStepConsentProps {
  step: number;
  consent: boolean;
  setConsent: (v: boolean) => void;
  whatsappOptIn: boolean;
  setWhatsappOptIn: (v: boolean) => void;
}

export const EnrollmentStepConsent: React.FC<EnrollmentStepConsentProps> = ({
  step,
  consent,
  setConsent,
  whatsappOptIn,
  setWhatsappOptIn,
}) => (
  <div
    className={`transition-all duration-500 absolute inset-0 p-6 md:p-10 overflow-y-auto pb-24 ${
      step === 5
        ? "translate-x-0 opacity-100 z-10"
        : "translate-x-full opacity-0 pointer-events-none"
    }`}
  >
    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
      <Lock className="text-brand-500" /> Data Consent
    </h3>

    <div className="space-y-6">
      <div className="p-6 bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl border border-slate-100 dark:border-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
          In compliance with the <strong>Kenya Data Protection Act</strong>, we require explicit
          consent to process the patient&apos;s personal health information. This data will be used
          solely for care coordination and emergency response.
        </p>

        <label className="flex items-start gap-4 p-4 bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-brand-500 transition-colors">
          <div
            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
              consent ? "bg-brand-500 border-brand-500" : "border-slate-300 dark:border-slate-600"
            }`}
          >
            {consent && <CheckCircle className="text-white" size={16} strokeWidth={3} />}
          </div>
          <input
            type="checkbox"
            className="hidden"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            I confirm that the patient has provided informed consent for MamaSafe AI to process their
            medical data.
          </span>
        </label>
      </div>

      <div className="p-6 bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl border border-slate-100 dark:border-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
          The platform uses WhatsApp to send automated appointment reminders and health tips.
        </p>

        <label className="flex items-start gap-4 p-4 bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-brand-500 transition-colors">
          <div
            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
              whatsappOptIn ? "bg-green-500 border-green-500" : "border-slate-300 dark:border-slate-600"
            }`}
          >
            {whatsappOptIn && <CheckCircle className="text-white" size={16} strokeWidth={3} />}
          </div>
          <input
            type="checkbox"
            className="hidden"
            checked={whatsappOptIn}
            onChange={(e) => setWhatsappOptIn(e.target.checked)}
          />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            Patient opts-in to receive health alerts via WhatsApp.
          </span>
        </label>
      </div>
    </div>
  </div>
);
