'use client';

import { useEffect, useState } from 'react';

import { useRouterState } from '@tanstack/react-router';

import { cn } from '@/lib/utils';

/**
 * Global route-loading indicator: a thin bar pinned to the viewport's top
 * edge while a navigation's loaders run (`state.isLoading` — loader work,
 * not the render commit that `isTransitioning` tracks). Client navs
 * deliberately keep the previous page visible with this bar on top instead
 * of swapping in a skeleton; preloaded navs settle inside the show delay
 * and never flash it.
 */
const SHOW_DELAY_MS = 150;
const DONE_FADE_MS = 400;

type Phase = 'idle' | 'loading' | 'done';

export function NavigationProgressIndicator({
  isLoading,
}: {
  isLoading: boolean;
}) {
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    if (isLoading) {
      const show = setTimeout(() => setPhase('loading'), SHOW_DELAY_MS);
      return () => clearTimeout(show);
    }
    setPhase((current) => (current === 'loading' ? 'done' : 'idle'));
    const settle = setTimeout(
      () => setPhase((current) => (current === 'done' ? 'idle' : current)),
      DONE_FADE_MS,
    );
    return () => clearTimeout(settle);
  }, [isLoading]);

  return (
    <div
      aria-hidden
      data-test="navigation-progress"
      data-phase={phase}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5"
    >
      <div
        className={cn(
          'bg-primary h-full motion-reduce:transition-none',
          // The crawl eases out toward 80% and holds — cold navs measure
          // ~1.9s, so the bar still reads as "in flight" when they commit.
          phase === 'idle' && 'w-0 opacity-0 transition-none',
          phase === 'loading' &&
            'w-4/5 opacity-100 [transition:width_1.6s_cubic-bezier(0.16,1,0.3,1),opacity_100ms_linear]',
          phase === 'done' &&
            'w-full opacity-0 [transition:width_150ms_ease-out,opacity_300ms_ease-in_100ms]',
        )}
      />
    </div>
  );
}

export function NavigationProgress() {
  const isLoading = useRouterState({ select: (state) => state.isLoading });
  return <NavigationProgressIndicator isLoading={isLoading} />;
}
