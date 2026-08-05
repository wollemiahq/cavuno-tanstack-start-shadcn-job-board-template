'use client';

import { useEffect } from 'react';

import { Link } from '@tanstack/react-router';

import { cn } from '@/lib/utils';

const mobileNavItemClassName =
  'flex items-center rounded-xl px-4 py-3 text-lg font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

type MobileNavDestination = '/jobs' | '/companies' | '/talent' | '/blog';

/**
 * Mobile nav disclosure — a plain non-modal panel pinned from the header's
 * bottom edge to the viewport bottom. Deliberately NOT a Dialog/Sheet: the
 * REAL header (with the single search input) stays visible and interactive
 * above it, so there is no duplicated chrome, no focus trap hiding what the
 * user is looking at, and no full-viewport overlay blurring the page.
 */
export function HeaderMobileMenu({
  navLinks,
  showPostJob,
  navigationLabel,
  postJobLabel,
  topOffset,
  onOpenChange,
}: {
  navLinks: ReadonlyArray<{ to: MobileNavDestination; label: string }>;
  showPostJob: boolean;
  navigationLabel: string;
  postJobLabel: string;
  /** Viewport-Y of the header's bottom edge — the panel starts there. */
  topOffset: number;
  onOpenChange: (open: boolean) => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onOpenChange]);

  // Lock page scroll behind the panel for its lifetime.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      id="mobile-navigation-dialog"
      role="dialog"
      aria-label={navigationLabel}
      style={{ top: topOffset }}
      className="bg-background text-foreground fixed inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-contain xl:hidden"
    >
      {/* No border-t here — the header above already draws border-b, and
          two hairlines a few px apart read as a glitch. */}
      <nav aria-label={navigationLabel} className="px-4 py-6">
        {navLinks.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(mobileNavItemClassName, 'hover:no-underline')}
            onClick={() => onOpenChange(false)}
          >
            {item.label}
          </Link>
        ))}
        {showPostJob ? (
          <Link
            to="/post"
            className={cn(mobileNavItemClassName, 'hover:no-underline')}
            onClick={() => onOpenChange(false)}
          >
            {postJobLabel}
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
