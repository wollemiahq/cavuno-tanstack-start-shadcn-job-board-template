'use client';

import type { ReactNode } from 'react';

import { Link } from '@tanstack/react-router';
import { X } from 'lucide-react';

import { Box } from '@/components/layout/box';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const mobileNavItemClassName =
  'flex items-center rounded-xl px-4 py-3 text-lg font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

type MobileNavDestination = '/jobs' | '/companies' | '/talent' | '/blog';

export function HeaderMobileMenu({
  headerLeft,
  accountActions,
  navLinks,
  showPostJob,
  navigationLabel,
  closeLabel,
  postJobLabel,
  onOpenChange,
}: {
  headerLeft: ReactNode;
  accountActions: ReactNode;
  navLinks: ReadonlyArray<{ to: MobileNavDestination; label: string }>;
  showPostJob: boolean;
  navigationLabel: string;
  closeLabel: string;
  postJobLabel: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent
        id="mobile-navigation-dialog"
        side="top"
        showCloseButton={false}
        className="bg-background text-foreground inset-0 z-50 w-full gap-0 overflow-y-auto overscroll-contain rounded-none p-0 shadow-none data-[side=top]:inset-0 data-[side=top]:h-dvh data-[side=top]:max-w-none data-[side=top]:border-0 xl:hidden"
      >
        <SheetTitle className="sr-only">{navigationLabel}</SheetTitle>
        <Box paddingX={{ base: '4', md: '8' }}>
          <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
            {headerLeft}
            <div
              data-slot="header-actions"
              data-test="header-actions"
              className="col-start-2 row-start-1 flex shrink-0 items-center gap-2 justify-self-end"
            >
              {accountActions}
              <SheetClose
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-foreground"
                    aria-label={closeLabel}
                  />
                }
              >
                <X aria-hidden="true" />
              </SheetClose>
            </div>
          </div>
        </Box>

        <nav
          aria-label={navigationLabel}
          className="border-border min-h-0 flex-1 overflow-y-auto border-t px-4 py-6"
        >
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
      </SheetContent>
    </Sheet>
  );
}
