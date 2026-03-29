import React from "react";
import { Activity, Calendar, FileText, Heart, MapPin, Baby } from "lucide-react";
import {
  DEPARTMENTAL_SERVICES,
  DepartmentalServicesCatalog,
} from "../../services/departmentalServicesCatalog";
import type { EnrollmentFormData } from "./enrollmentFormTypes";

interface InputGroupProps {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children?: React.ReactNode;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, icon: Icon, children }) => (
  <div className="group">
    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
      {label}
    </label>
    <div className="relative">
      <Icon
        className="absolute left-4 top-4 text-slate-400 group-focus-within:text-brand-500 transition-colors pointer-events-none"
        size={20}
      />
      {children}
    </div>
  </div>
);

interface EnrollmentDepartmentPanelsProps {
  step: number;
  formData: EnrollmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<EnrollmentFormData>>;
  inputClasses: string;
}

export const EnrollmentDepartmentPanels: React.FC<EnrollmentDepartmentPanelsProps> = ({
  step,
  formData,
  setFormData,
  inputClasses,
}) => {
  const selectedDept = DepartmentalServicesCatalog.getDepartment(formData.departmentServiceId);
  const subs = selectedDept?.subCategories ?? [];
  const ancPath = DepartmentalServicesCatalog.requiresPregnancyDetails(
    formData.departmentServiceId,
    formData.departmentSubcategoryId
  );

  return (
    <>
      <div
        className={`transition-all duration-500 absolute inset-0 p-6 md:p-10 overflow-y-auto pb-24 ${
          step === 3
            ? "translate-x-0 opacity-100 z-10"
            : step < 3
              ? "translate-x-full opacity-0 pointer-events-none"
              : "-translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <FileText className="text-brand-500" /> Departmental services
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Select the service desk or clinical stream for this intake, then the sub-category that best
          matches the visit.
        </p>
        <div className="space-y-6">
          <InputGroup label="Department" icon={MapPin}>
            <select
              required
              className={inputClasses}
              value={formData.departmentServiceId}
              onChange={(e) => {
                const id = e.target.value;
                const dept = DepartmentalServicesCatalog.getDepartment(id);
                const firstSub = dept?.subCategories[0]?.id ?? "";
                setFormData((prev) => ({
                  ...prev,
                  departmentServiceId: id,
                  departmentSubcategoryId: firstSub,
                }));
              }}
            >
              <option value="">Select department...</option>
              {DEPARTMENTAL_SERVICES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </InputGroup>

          <InputGroup label="Sub-category" icon={Activity}>
            <select
              required
              className={inputClasses}
              value={formData.departmentSubcategoryId}
              disabled={!formData.departmentServiceId}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  departmentSubcategoryId: e.target.value,
                }))
              }
            >
              <option value="">
                {formData.departmentServiceId ? "Select sub-category..." : "Choose a department first"}
              </option>
              {subs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </InputGroup>

          {ancPath && (
            <div className="grid grid-cols-2 gap-6">
              <InputGroup label="Gravida (total pregnancies)" icon={Activity}>
                <input
                  type="number"
                  min="1"
                  required
                  className={inputClasses}
                  placeholder="e.g. 2"
                  value={formData.gravida}
                  onChange={(e) => setFormData((prev) => ({ ...prev, gravida: e.target.value }))}
                />
              </InputGroup>
              <InputGroup label="Parity (viable births)" icon={Baby}>
                <input
                  type="number"
                  min="0"
                  required
                  className={inputClasses}
                  placeholder="e.g. 1"
                  value={formData.parity}
                  onChange={(e) => setFormData((prev) => ({ ...prev, parity: e.target.value }))}
                />
              </InputGroup>
            </div>
          )}
        </div>
      </div>

      <div
        className={`transition-all duration-500 absolute inset-0 p-6 md:p-10 overflow-y-auto pb-24 ${
          step === 4
            ? "translate-x-0 opacity-100 z-10"
            : step < 4
              ? "translate-x-full opacity-0 pointer-events-none"
              : "-translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Heart className="text-brand-500" />
          {ancPath ? "ANC / pregnancy details" : "Intake details"}
        </h3>
        <div className="space-y-6">
          {ancPath ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup label="Last menstrual period (LMP)" icon={Calendar}>
                  <input
                    type="date"
                    required
                    className={inputClasses}
                    value={formData.lmp}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lmp: e.target.value }))}
                  />
                </InputGroup>
                <InputGroup label="Expected delivery (EDD)" icon={Calendar}>
                  <input
                    type="date"
                    readOnly
                    className={`${inputClasses} bg-slate-100 dark:bg-slate-800 cursor-not-allowed text-slate-500`}
                    value={formData.edd}
                  />
                </InputGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup label="Gestational age (weeks)" icon={Activity}>
                  <input
                    type="number"
                    min="0"
                    max="45"
                    required
                    className={inputClasses}
                    placeholder="From LMP"
                    value={formData.gestationalWeeks}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, gestationalWeeks: e.target.value }))
                    }
                  />
                </InputGroup>
                <InputGroup label="ANC profile status" icon={FileText}>
                  <select
                    className={inputClasses}
                    value={formData.ancProfile}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ancProfile: e.target.value }))
                    }
                  >
                    <option value="Not Started">Not started</option>
                    <option value="Started">Started</option>
                    <option value="Defaulted">Defaulted</option>
                  </select>
                </InputGroup>
              </div>
            </>
          ) : formData.departmentServiceId ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputGroup label="Visit / diagnosis date" icon={Calendar}>
                <input
                  type="date"
                  required
                  className={inputClasses}
                  value={formData.diagnosisDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, diagnosisDate: e.target.value }))
                  }
                />
              </InputGroup>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};
