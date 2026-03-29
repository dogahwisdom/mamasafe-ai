import React from "react";
import { User, Calendar, FileText } from "lucide-react";
import { EnrollmentInputGroup } from "./EnrollmentInputGroup";
import type { EnrollmentFormData } from "./enrollmentFormTypes";

interface EnrollmentStepIdentityProps {
  step: number;
  formData: EnrollmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<EnrollmentFormData>>;
  inputClasses: string;
}

export const EnrollmentStepIdentity: React.FC<EnrollmentStepIdentityProps> = ({
  step,
  formData,
  setFormData,
  inputClasses,
}) => (
  <div
    className={`transition-all duration-500 absolute inset-0 p-6 md:p-10 overflow-y-auto pb-24 ${
      step === 1
        ? "translate-x-0 opacity-100 z-10"
        : "-translate-x-full opacity-0 z-0 pointer-events-none"
    }`}
  >
    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
      <User className="text-brand-500" /> Identity Details
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <EnrollmentInputGroup label="First Name" icon={User}>
        <input
          type="text"
          required
          className={inputClasses}
          placeholder="e.g. Amani"
          value={formData.firstName}
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        />
      </EnrollmentInputGroup>
      <EnrollmentInputGroup label="Last Name" icon={User}>
        <input
          type="text"
          required
          className={inputClasses}
          placeholder="e.g. Kamau"
          value={formData.lastName}
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
        />
      </EnrollmentInputGroup>
      <EnrollmentInputGroup label="National ID / Passport" icon={FileText}>
        <input
          type="text"
          className={inputClasses}
          placeholder="ID Number (Optional)"
          value={formData.nationalId}
          onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
        />
      </EnrollmentInputGroup>
      <EnrollmentInputGroup label="Date of Birth" icon={Calendar}>
        <input
          type="date"
          required
          className={inputClasses}
          value={formData.dob}
          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
        />
      </EnrollmentInputGroup>
    </div>
  </div>
);
