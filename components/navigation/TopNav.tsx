import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
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
  moreLabel?: string;
  /** Optional explicit number of primary items before "More". */
  primaryCount?: number;
  className?: string;
};

class OutsideClickManager {
  private readonly container: HTMLElement;
  private readonly onOutsideClick: () => void;
  private readonly onDocumentMouseDown: (event: MouseEvent) => void;

  constructor(container: HTMLElement, onOutsideClick: () => void) {
    this.container = container;
    this.onOutsideClick = onOutsideClick;
    this.onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!this.container.contains(target)) this.onOutsideClick();
    };
  }

  start() {
    document.addEventListener('mousedown', this.onDocumentMouseDown);
    document.addEventListener('touchstart', this.onDocumentMouseDown, { passive: true } as AddEventListenerOptions);
  }

  stop() {
    document.removeEventListener('mousedown', this.onDocumentMouseDown);
    document.removeEventListener('touchstart', this.onDocumentMouseDown);
  }
}

export function TopNav<TView extends string>({
  items,
  currentView,
  onNavigate,
  moreLabel = 'More',
  primaryCount,
  className,
}: TopNavProps<TView>) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const effectivePrimaryCount = useResponsivePrimaryCount(items.length, primaryCount);
  const primaryItems = useMemo(() => items.slice(0, effectivePrimaryCount), [items, effectivePrimaryCount]);
  const overflowItems = useMemo(() => items.slice(effectivePrimaryCount), [items, effectivePrimaryCount]);
  const hasOverflow = overflowItems.length > 0;

  useEffect(() => {
    if (!containerRef.current) return;
    const manager = new OutsideClickManager(containerRef.current, () => setIsMoreOpen(false));
    manager.start();
    return () => manager.stop();
  }, []);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [currentView]);

  return (
    <div ref={containerRef} className={className}>
      <div
        role="tablist"
        aria-label="Primary navigation"
        className="flex w-full max-w-full items-center justify-center gap-1 rounded-xl bg-slate-100/90 p-1 dark:bg-slate-800/70 ring-1 ring-slate-200/60 dark:ring-slate-700/60 overflow-hidden flex-nowrap"
      >
        {primaryItems.map((item) => {
          const isActive = currentView === (item.id as TView);
          const Icon = item.icon;
          return (
            <button
              key={item.id}
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
              <span>{item.label}</span>
            </button>
          );
        })}

        {hasOverflow && (
          <div className="relative">
            <button
              type="button"
              data-topnav-more="true"
              aria-haspopup="menu"
              aria-expanded={isMoreOpen}
              onClick={() => setIsMoreOpen((v) => !v)}
              className={[
                'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-semibold leading-none transition-colors duration-200',
                isMoreOpen
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90 dark:bg-[#2c2c2e] dark:text-white dark:ring-slate-600/70'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-100',
              ].join(' ')}
            >
              <span>{moreLabel}</span>
              <ChevronDown size={14} absoluteStrokeWidth className="text-slate-500 dark:text-slate-300" />
            </button>

            {isMoreOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xl dark:border-slate-700/70 dark:bg-[#1c1c1e] z-50"
              >
                {overflowItems.map((item) => {
                  const isActive = currentView === (item.id as TView);
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      onClick={() => onNavigate(item.id as TView)}
                      className={[
                        'w-full px-3 py-2.5 text-left text-sm font-semibold flex items-center gap-2 transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5',
                      ].join(' ')}
                    >
                      <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                        <Icon
                          size={17}
                          absoluteStrokeWidth
                          strokeWidth={isActive ? 2.6 : 2.3}
                          className={isActive ? 'text-brand-600 dark:text-brand-300' : 'text-slate-500 dark:text-slate-300'}
                        />
                      </span>
                      <span className="flex-1">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function useResponsivePrimaryCount(totalItems: number, primaryCount?: number): number {
  const [width, setWidth] = useState<number>(() => (typeof window === 'undefined' ? 1024 : window.innerWidth));

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return useMemo(() => {
    if (primaryCount != null) return clampPrimary(primaryCount, totalItems);
    // Tailwind-ish breakpoints: md 768, lg 1024, xl 1280, 2xl 1536
    if (width >= 1536) return totalItems;
    if (width >= 1280) return clampPrimary(8, totalItems);
    if (width >= 1024) return clampPrimary(7, totalItems);
    return clampPrimary(6, totalItems);
  }, [primaryCount, totalItems, width]);
}

function clampPrimary(count: number, total: number) {
  return Math.max(0, Math.min(total, count));
}

