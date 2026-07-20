import type { ReactNode } from 'react';

import { Link } from '@tanstack/react-router';

import { Page, PageContent } from '@/components/layout/page';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
  const sidebar = (
    <Card size="sm" data-slot="employer-account-sidebar">
      <CardContent>
        <div className="flex min-w-0 items-center gap-3">
          <EmployerIdentityAvatar
            name={identity.title}
            logoUrl={identity.avatarUrl}
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="text-foreground min-w-0 truncate font-medium">
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
        </div>

        <Separator className="my-4" />

        <nav
          aria-label={identity.title}
          className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1"
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
                  'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                  current && 'bg-muted text-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {rail ? (
          <div
            className="border-border mt-4 border-t pt-4"
            data-slot="employer-account-rail"
          >
            {rail}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  return (
    <Page width="wide">
      <PageContent
        aside={sidebar}
        asideLabel={identity.title}
        asideOrder="before"
      >
        <div data-slot="employer-account-content" className="min-w-0">
          {children}
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
