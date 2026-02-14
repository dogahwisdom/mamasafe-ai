import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  subtitle?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  variant = 'default',
  onClick,
}) => {
  const variantStyles = {
    default: 'bg-white dark:bg-[#1c1c1e] border-slate-200 dark:border-slate-800',
    primary: 'bg-brand-50 dark:bg-brand-900/10 border-brand-200 dark:border-brand-800',
    success: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800',
    warning: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800',
    danger: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
  };

  const iconColors = {
    default: 'text-slate-600 dark:text-slate-400',
    primary: 'text-brand-600 dark:text-brand-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-orange-600 dark:text-orange-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-slate-600 dark:text-slate-400',
  };

  return (
    <div
      onClick={onClick}
      className={`
        p-6 rounded-2xl border transition-all
        ${variantStyles[variant]}
        ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-100' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${iconColors[variant]}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={`text-sm font-bold flex items-center gap-1 ${trendColors[trend.direction]}`}>
            {trend.direction === 'up' && '↑'}
            {trend.direction === 'down' && '↓'}
            {trend.direction === 'neutral' && '→'}
            {trend.value}
          </div>
        )}
      </div>
      
      <div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
          {title}
        </p>
        <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
