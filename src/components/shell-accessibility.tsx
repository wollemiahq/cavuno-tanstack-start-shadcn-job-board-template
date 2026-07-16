import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

const MAIN_CONTENT_ID = 'main-content';

export function SkipToContentLink({ label }: { label: string }) {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="bg-background text-foreground focus-visible:ring-ring sr-only z-[100] rounded-xl px-4 py-2 text-sm font-medium shadow-lg outline-none focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus-visible:ring-3"
    >
      {label}
    </a>
  );
}

export function MainContentTarget({
  className,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className={cn('min-w-0 outline-none', className)}
    />
  );
}
