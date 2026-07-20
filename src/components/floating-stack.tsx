'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

const FloatingStackContext = createContext<HTMLElement | null>(null);

/**
 * Shared bottom-right stacking region for floating widgets (the job-alert
 * prompt, the messaging dock, and any future corner widget). A single fixed
 * flex column that every widget portals into, so they stack vertically and
 * are collision-aware instead of overlapping in the same corner.
 *
 * Bottom-edge model (the flush slot): the column is anchored at `bottom-0`
 * with NO container gap. Instead, every ordinary item owns a bottom margin
 * (`mb-4`) that does double duty — it both separates the item from whatever
 * sits below it AND floats the lowest ordinary item up off the viewport
 * edge. A `flush` item drops that margin, so it sticks to the bottom edge
 * (the messaging dock's rounded-top / flush-bottom look) while any item
 * stacked above it still keeps its `mb-4` gap and never overlaps. This lets
 * the dock be flush-bottom whether or not the job-alert prompt is present,
 * without the prompt losing its float margin when the dock is absent.
 *
 * The container sits at `z-40` — below the `z-50` overlay layer — so menus,
 * popovers, and dialogs (which portal to the body at `z-50`) still render
 * above the stack. It is `pointer-events-none` so empty gaps never trap
 * clicks meant for the page; each item re-enables pointer events.
 */
export function FloatingStackProvider({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <FloatingStackContext.Provider value={container}>
      {children}
      <div
        ref={setContainer}
        data-slot="floating-stack"
        className="pointer-events-none fixed right-4 bottom-0 z-40 flex flex-col items-end"
      />
    </FloatingStackContext.Provider>
  );
}

/**
 * A single widget in the floating stack. Portals into the shared container
 * when one is mounted (the running app) and renders inline as a graceful
 * fallback when it is not (isolated component tests). `order` controls the
 * vertical position within the stack — a lower value renders higher up.
 * `flush` opts an item into the bottom-edge slot: it forgoes the standard
 * bottom margin so it sits stuck to the viewport bottom (see the provider
 * doc); at most one item should be flush.
 */
export function FloatingStackItem({
  order,
  flush = false,
  className,
  children,
}: {
  order?: number;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const container = useContext(FloatingStackContext);

  const item = (
    <div
      data-slot="floating-stack-item"
      style={order === undefined ? undefined : { order }}
      className={cn('pointer-events-auto', flush ? undefined : 'mb-4', className)}
    >
      {children}
    </div>
  );

  return container ? createPortal(item, container) : item;
}
