import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onClick?: () => void;
  variant?: 'default' | 'alert' | 'brand';
}

export const ActionCard: React.FC<ActionCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue, 
  onClick,
  variant = 'default' 
}) => {
  
  const bgColors = {
    default: 'bg-white dark:bg-[#1c1c1e] hover:bg-slate-50 dark:hover:bg-[#2c2c2e]',
    alert: 'bg-white dark:bg-[#1c1c1e] hover:bg-red-50 dark:hover:bg-red-900/10',
    brand: 'bg-white dark:bg-[#1c1c1e] hover:bg-brand-50 dark:hover:bg-brand-900/10'
  };

  const iconStyles = {
    default: 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-500 dark:text-slate-400',
    alert: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    brand: 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
  };

  // Border logic mostly removed for cleaner look, relying on shadow and bg
  
  return (
    <button 
      onClick={onClick}
      className={`
        w-full p-6 rounded-[1.5rem]
        shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-black/20 
        transition-all duration-300 ease-out transform hover:-translate-y-1 hover:shadow-[0_12px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-black/30
        flex flex-col items-start justify-between h-44 text-left group
        border border-transparent hover:border-slate-100 dark:hover:border-slate-800
        ${bgColors[variant]}
      `}
    >
      <div className="w-full flex justify-between items-start">
        <div className={`p-3 rounded-2xl ${iconStyles[variant]} transition-colors`}>
          <Icon className="w-6 h-6" strokeWidth={2.5} />
        </div>
        
        {trend && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
            trend === 'up' ? 'text-green-600 bg-green-100/50 dark:bg-green-900/20' : 
            trend === 'down' ? 'text-red-600 bg-red-100/50 dark:bg-red-900/20' : 
            'text-slate-500 bg-slate-100 dark:bg-slate-800'
          }`}>
             {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '–'} {trendValue}
          </span>
        )}
      </div>
      
      <div className="mt-4">
        <h3 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tighter">
          {value}
        </h3>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
          {title}
        </p>
      </div>

      {subtitle && (
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-auto pt-2">
          {subtitle}
        </p>
      )}
    </button>
  );
};