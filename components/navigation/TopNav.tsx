import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const contentRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const normalizedItems = useMemo(() => items, [items]);

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const maxLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const epsilon = 2;
    setCanScrollLeft(rail.scrollLeft > epsilon);
    setCanScrollRight(rail.scrollLeft < maxLeft - epsilon);
  }, []);

  const scrollRail = useCallback((direction: 'left' | 'right') => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction === 'right' ? 220 : -220,
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    const activeTab = tabRefs.current[String(currentView)];
    if (!activeTab) return;
    activeTab.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
    requestAnimationFrame(updateScrollState);
  }, [currentView, updateScrollState]);

  useEffect(() => {
    const rail = railRef.current;
    const content = contentRef.current;
    if (!rail) return;
    updateScrollState();
    rail.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(rail);
    if (content) ro.observe(content);
    // Re-check after layout settles (fonts / dynamic badge width).
    const rafId = requestAnimationFrame(updateScrollState);
    const timeoutId = window.setTimeout(updateScrollState, 120);
    return () => {
      rail.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      ro.disconnect();
      cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [updateScrollState, normalizedItems]);

  const scrollButtonBase =
    'absolute top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full border border-slate-200/70 bg-white/95 text-slate-600 shadow-sm backdrop-blur transition disabled:pointer-events-none disabled:opacity-30 dark:border-slate-700/70 dark:bg-[#1c1c1e]/95 dark:text-slate-300';

  const railMaskClass = [
    'w-full overflow-x-auto overflow-y-hidden no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none]',
    canScrollLeft && canScrollRight
      ? '[mask-image:linear-gradient(to_right,transparent_0,black_16px,black_calc(100%-16px),transparent_100%)]'
      : '',
    !canScrollLeft && canScrollRight
      ? '[mask-image:linear-gradient(to_right,black_0,black_calc(100%-16px),transparent_100%)]'
      : '',
    canScrollLeft && !canScrollRight
      ? '[mask-image:linear-gradient(to_right,transparent_0,black_16px,black_100%)]'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={['relative', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        aria-label="Scroll tabs left"
        onClick={() => scrollRail('left')}
        disabled={!canScrollLeft}
        className={`${scrollButtonBase} left-1`}
      >
        <ChevronLeft size={16} absoluteStrokeWidth />
      </button>

      <div ref={railRef} className={railMaskClass}>
        <div
          ref={contentRef}
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
                  'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold leading-none transition-colors duration-200',
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90 dark:bg-[#2c2c2e] dark:text-white dark:ring-slate-600/70'
                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-100',
                ].join(' ')}
              >
                <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                  <Icon
                    size={16}
                    absoluteStrokeWidth
                    strokeWidth={isActive ? 2.6 : 2.3}
                    className={isActive ? 'text-brand-600 dark:text-brand-300' : 'text-slate-600 dark:text-slate-300'}
                  />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        aria-label="Scroll tabs right"
        onClick={() => scrollRail('right')}
        disabled={!canScrollRight}
        className={`${scrollButtonBase} right-1`}
      >
        <ChevronRight size={16} absoluteStrokeWidth />
      </button>
    </div>
  );
}

