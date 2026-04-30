import React from "react";
import {
  MapPin,
  Phone,
  User,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { UserProfile } from "../../types";
import { EnrollmentInputGroup } from "./EnrollmentInputGroup";
import type { EnrollmentFormData } from "./enrollmentFormTypes";

export type ExistingPatientLookup = {
  exists: boolean;
  patientId?: string;
  patientName?: string;
  facilityId?: string;
  facilityName?: string;
  location?: string | null;
};

interface EnrollmentStepContactProps {
  step: number;
  formData: EnrollmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<EnrollmentFormData>>;
  inputClasses: string;
  checkingPatient: boolean;
  existingPatient: ExistingPatientLookup | null;
  currentFacility?: UserProfile | null;
  primaryFacilityChoice: "current" | "existing";
  setPrimaryFacilityChoice: (v: "current" | "existing") => void;
  onOpenTransferModal: () => void;
}

export const EnrollmentStepContact: React.FC<EnrollmentStepContactProps> = ({
  step,
  formData,
  setFormData,
  inputClasses,
  checkingPatient,
  existingPatient,
  currentFacility,
  primaryFacilityChoice,
  setPrimaryFacilityChoice,
  onOpenTransferModal,
}) => (
  <div
    className={`transition-all duration-500 absolute inset-0 p-6 md:p-10 overflow-y-auto pb-24 ${
      step === 2
        ? "translate-x-0 opacity-100 z-10"
        : step < 2
          ? "translate-x-full opacity-0 pointer-events-none"
          : "-translate-x-full opacity-0 pointer-events-none"
    }`}
  >
    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
      <MapPin className="text-brand-500" /> Contact & Location
    </h3>
    <div className="space-y-6">
      <EnrollmentInputGroup label="Patient WhatsApp Number" icon={Phone}>
        <div className="relative">
          <input
            type="tel"
            required
            className={inputClasses}
            placeholder="+254 7..."
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          {checkingPatient && (
            <div className="absolute right-4 top-4">
              <Loader2 className="animate-spin text-brand-500" size={18} />
            </div>
          )}
        </div>
        {existingPatient?.exists && existingPatient.facilityId && (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-900/30 flex items-start gap-3">
            <AlertCircle className="text-blue-500 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Existing record found at {existingPatient.facilityName}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                Enrollment is still allowed here. If needed, you can optionally request a transfer to
                keep care records aligned.
              </p>
              <button
                type="button"
                onClick={onOpenTransferModal}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Request transfer (optional)
                <ArrowRight size={14} />
              </button>
              <div className="mt-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-1">
                  Primary facility for care coordination
                </label>
                <select
                  className="w-full p-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#2c2c2e] text-sm text-slate-900 dark:text-white"
                  value={primaryFacilityChoice}
                  onChange={(e) =>
                    setPrimaryFacilityChoice(e.target.value as "current" | "existing")
                  }
                >
                  <option value="current">
                    {currentFacility?.name || "Current facility"} (recommended for this intake)
                  </option>
                  <option value="existing">
                    {existingPatient.facilityName || "Existing facility"} (continuity owner)
                  </option>
                </select>
                <p className="text-[11px] text-blue-700/90 dark:text-blue-300/90 mt-1">
                  This setting is for coordination only and does not restrict where the patient can
                  receive care.
                </p>
              </div>
            </div>
          </div>
        )}
      </EnrollmentInputGroup>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EnrollmentInputGroup label="County" icon={MapPin}>
          <input
            type="text"
            required
            className={inputClasses}
            placeholder="e.g. Nairobi"
            value={formData.county}
            onChange={(e) => setFormData({ ...formData, county: e.target.value })}
          />
        </EnrollmentInputGroup>
        <EnrollmentInputGroup label="Sub-County / Estate" icon={MapPin}>
          <input
            type="text"
            required
            className={inputClasses}
            placeholder="e.g. Westlands"
            value={formData.subCounty}
            onChange={(e) => setFormData({ ...formData, subCounty: e.target.value })}
          />
        </EnrollmentInputGroup>
      </div>
      {existingPatient?.exists && existingPatient.location && (
        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
          Location pre-filled from the existing patient record when available N/A you can edit if
          needed.
        </p>
      )}

      <div>
        <EnrollmentInputGroup label="Patient Type" icon={User}>
          <select
            required
            className={inputClasses}
            value={formData.patientType}
            onChange={(e) =>
              setFormData({
                ...formData,
                patientType: e.target.value as "outpatient" | "inpatient",
              })
            }
          >
            <option value="outpatient">Outpatient</option>
            <option value="inpatient">Inpatient</option>
          </select>
        </EnrollmentInputGroup>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-1">
          Outpatient and inpatient both require county and sub-county above. Inpatient also requires
          next of kin below.
        </p>
      </div>

      {formData.patientType === "inpatient" && (
        <div className="p-5 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20">
          <h4 className="text-orange-800 dark:text-orange-400 font-bold text-sm mb-4 flex items-center gap-2">
            <ShieldAlert size={16} /> Emergency Contact (Next of Kin) - Required for Inpatient
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              required
              className="w-full p-3 rounded-xl bg-white dark:bg-[#2c2c2e] border border-orange-200 dark:border-orange-900/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              placeholder="NOK Name"
              value={formData.nokName}
              onChange={(e) => setFormData({ ...formData, nokName: e.target.value })}
            />
            <input
              type="tel"
              required
              className="w-full p-3 rounded-xl bg-white dark:bg-[#2c2c2e] border border-orange-200 dark:border-orange-900/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              placeholder="NOK Phone"
              value={formData.nokPhone}
              onChange={(e) => setFormData({ ...formData, nokPhone: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  </div>
);
