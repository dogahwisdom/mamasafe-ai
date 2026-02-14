import React from 'react';
import { CheckCircle, AlertCircle, XCircle, Activity, Database, Globe } from 'lucide-react';

interface SystemHealthCardProps {
  status: 'healthy' | 'degraded' | 'down';
  metrics: {
    database: 'online' | 'offline';
    api: 'online' | 'offline';
    messaging: 'online' | 'offline';
  };
}

export const SystemHealthCard: React.FC<SystemHealthCardProps> = ({ status, metrics }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return {
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-50 dark:bg-green-900/10',
          border: 'border-green-200 dark:border-green-800',
          icon: CheckCircle,
          label: 'All Systems Operational',
        };
      case 'degraded':
        return {
          color: 'text-orange-600 dark:text-orange-400',
          bg: 'bg-orange-50 dark:bg-orange-900/10',
          border: 'border-orange-200 dark:border-orange-800',
          icon: AlertCircle,
          label: 'Degraded Performance',
        };
      default:
        return {
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-900/10',
          border: 'border-red-200 dark:border-red-800',
          icon: XCircle,
          label: 'System Issues Detected',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`
      p-6 rounded-2xl border
      ${config.bg} ${config.border}
    `}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${config.color}`}>
            <Icon size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">System Health</h3>
            <p className={`text-sm font-semibold ${config.color}`}>
              {config.label}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-black/20 rounded-xl">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Database</span>
          </div>
          <span className={`
            px-2 py-1 rounded-lg text-xs font-bold
            ${metrics.database === 'online' 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }
          `}>
            {metrics.database === 'online' ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-black/20 rounded-xl">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">API Services</span>
          </div>
          <span className={`
            px-2 py-1 rounded-lg text-xs font-bold
            ${metrics.api === 'online' 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }
          `}>
            {metrics.api === 'online' ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-black/20 rounded-xl">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Messaging</span>
          </div>
          <span className={`
            px-2 py-1 rounded-lg text-xs font-bold
            ${metrics.messaging === 'online' 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }
          `}>
            {metrics.messaging === 'online' ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  );
};
