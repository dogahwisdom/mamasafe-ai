
import React from 'react';
import { Shield, Heart } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 32 }) => {
  return (
    <div className={`flex items-center gap-2.5 ${className} select-none`}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
         <Shield 
            className="w-full h-full text-brand-600 dark:text-brand-500 fill-brand-100 dark:fill-brand-900/20" 
            strokeWidth={2.5} 
         />
         <Heart 
            className="absolute w-[40%] h-[40%] text-brand-600 dark:text-brand-500 fill-current translate-y-[5%]" 
            strokeWidth={0}
         />
      </div>
      <span className="font-bold tracking-tight text-xl text-slate-900 dark:text-white leading-none">
        MamaSafe AI
      </span>
    </div>
  );
};
