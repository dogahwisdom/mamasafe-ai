import React from 'react';
import { Building2, MapPin, Users, Activity, Clock } from 'lucide-react';
import { FacilityMetrics } from '../../services/backend/superadminService';

interface FacilityCardProps {
  facility: FacilityMetrics;
  onClick?: () => void;
}

export const FacilityCard: React.FC<FacilityCardProps> = ({ facility, onClick }) => {
  const getStatusColor = (status: string) => {
    return status === 'active'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
  };

  const formatLastActivity = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        p-5 rounded-2xl border border-slate-200 dark:border-slate-800
        bg-white dark:bg-[#1c1c1e] transition-all
        ${onClick ? 'cursor-pointer hover:shadow-lg hover:border-brand-300 dark:hover:border-brand-700 hover:scale-[1.02] active:scale-100' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`
            p-3 rounded-xl
            ${facility.type === 'clinic' 
              ? 'bg-brand-100 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
              : 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
            }
          `}>
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              {facility.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <MapPin size={12} className="text-slate-400" />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {facility.location}
              </span>
            </div>
          </div>
        </div>
        <span className={`
          px-2.5 py-1 rounded-full text-xs font-bold
          ${getStatusColor(facility.status)}
        `}>
          {facility.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-slate-400" />
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Patients</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {facility.patientCount}
            </p>
          </div>
        </div>
        {facility.type === 'clinic' && (
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tasks</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {facility.activeTasks}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Clock size={12} />
        <span>Last active: {formatLastActivity(facility.lastActivity)}</span>
      </div>
    </div>
  );
};
