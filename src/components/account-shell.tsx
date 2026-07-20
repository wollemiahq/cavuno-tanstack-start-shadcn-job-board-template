import type { ReactNode } from 'react';

import { Link } from '@tanstack/react-router';

import { Page, PageContent } from '@/components/layout/page';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initialsOf } from '@/lib/initials';
import { cn } from '@/lib/utils';

export interface ShellNavItem {
  key: string;
  to: string;
  params?: Record<string, string>;
  label: string;
}

export interface ShellIdentity {
  avatarUrl?: string | null;
  title: string;
  badge?: ReactNode;
  subtitle?: string | null;
}

export function AccountShell({
  identity,
  nav,
  active,
  rail,
  children,
}: {
  identity: ShellIdentity;
  nav: ShellNavItem[];
  active: string;
  rail?: ReactNode;
  children: ReactNode;
}) {
  // No side columns: an identity + section-nav header owns the top of the
  // page, and the content region spans the full page width beneath it.
  return (
    <Page width="wide">
      <PageContent>
        <div className="flex flex-col gap-6">
          <div
            className="flex flex-col gap-4"
            data-slot="employer-account-header"
          >
            <div className="flex min-w-0 items-center gap-3">
              <EmployerIdentityAvatar
                name={identity.title}
                logoUrl={identity.avatarUrl}
              />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="text-foreground min-w-0 truncate text-lg font-semibold">
                    {identity.title}
                  </p>
                  {identity.badge}
                </div>
                {identity.subtitle ? (
                  <p className="text-muted-foreground mt-0.5 text-sm break-words">
                    {identity.subtitle}
                  </p>
                ) : null}
              </div>
              {rail ? (
                <div
                  className="shrink-0"
                  data-slot="employer-account-rail"
                >
                  {rail}
                </div>
              ) : null}
            </div>

            <nav
              aria-label={identity.title}
              className="border-border flex gap-1 overflow-x-auto border-b"
            >
              {nav.map((item) => {
                const current = item.key === active;
                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    params={item.params}
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                      'focus-visible:ring-ring -mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none',
                      current
                        ? 'border-foreground text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div data-slot="employer-account-content" className="min-w-0">
            {children}
          </div>
        </div>
      </PageContent>
    </Page>
  );
}

export function EmployerIdentityAvatar({
  name,
  logoUrl,
  size = 'lg',
}: {
  name: string;
  logoUrl?: string | null;
  size?: 'default' | 'sm' | 'lg';
}) {
  return (
    <Avatar size={size}>
      {logoUrl ? <AvatarImage src={logoUrl} alt="" /> : null}
      <AvatarFallback>{initialsOf(name) ?? '?'}</AvatarFallback>
    </Avatar>
  );
}
