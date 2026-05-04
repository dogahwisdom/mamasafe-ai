import React, { useEffect, useMemo, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';

export type TopNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type TopNavProps<TView extends string> = {
  items: TopNavItem[];
  currentView: TView;
  onNavigate: (view: TView) => void;
  className?: string;
};

export function TopNav<TView extends string>({
  items,
  currentView,
  onNavigate,
  className,
}: TopNavProps<TView>) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const normalizedItems = useMemo(() => items, [items]);

  useEffect(() => {
    const activeTab = tabRefs.current[String(currentView)];
    if (!activeTab) return;
    activeTab.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [currentView]);

  return (
    <div className={className}>
      <div
        ref={railRef}
        className="w-full overflow-x-auto overflow-y-hidden no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none]"
      >
        <div
          role="tablist"
          aria-label="Primary navigation"
          className="flex w-max min-w-full items-center gap-1 rounded-xl bg-slate-100/90 p-1 dark:bg-slate-800/70 ring-1 ring-slate-200/60 dark:ring-slate-700/60"
        >
          {normalizedItems.map((item) => {
          const isActive = currentView === (item.id as TView);
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[item.id] = node;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onNavigate(item.id as TView)}
              title={item.label}
              className={[
                'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-semibold leading-none transition-colors duration-200',
                isActive
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90 dark:bg-[#2c2c2e] dark:text-white dark:ring-slate-600/70'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-100',
              ].join(' ')}
            >
              <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                <Icon
                  size={17}
                  absoluteStrokeWidth
                  strokeWidth={isActive ? 2.6 : 2.3}
                  className={isActive ? 'text-brand-600 dark:text-brand-300' : 'text-slate-600 dark:text-slate-300'}
                />
              </span>
              <span className="text-[13px]">{item.label}</span>
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}

