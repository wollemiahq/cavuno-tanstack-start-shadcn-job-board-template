'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

const FloatingStackContext = createContext<HTMLElement | null>(null);

/**
 * Shared bottom-right stacking region for floating widgets (the job-alert
 * prompt, the messaging dock, and any future corner widget). A single fixed
 * flex column that every widget portals into, so they stack vertically with
 * consistent spacing instead of overlapping in the same corner.
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
        className="pointer-events-none fixed right-4 bottom-4 z-40 flex flex-col items-end gap-4"
      />
    </FloatingStackContext.Provider>
  );
}

/**
 * A single widget in the floating stack. Portals into the shared container
 * when one is mounted (the running app) and renders inline as a graceful
 * fallback when it is not (isolated component tests). `order` controls the
 * vertical position within the stack — a lower value renders higher up.
 */
export function FloatingStackItem({
  order,
  className,
  children,
}: {
  order?: number;
  className?: string;
  children: ReactNode;
}) {
  const container = useContext(FloatingStackContext);

  const item = (
    <div
      data-slot="floating-stack-item"
      style={order === undefined ? undefined : { order }}
      className={cn('pointer-events-auto', className)}
    >
      {children}
    </div>
  );

  return container ? createPortal(item, container) : item;
}
