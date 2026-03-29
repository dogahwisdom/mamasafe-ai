import React from "react";

export interface EnrollmentInputGroupProps {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children?: React.ReactNode;
}

export const EnrollmentInputGroup: React.FC<EnrollmentInputGroupProps> = ({
  label,
  icon: Icon,
  children,
}) => (
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
