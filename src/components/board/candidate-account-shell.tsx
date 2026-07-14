import type { ReactNode } from 'react';

import { Link } from '@tanstack/react-router';

import { Page, PageContent } from '@/components/layout/page';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type CandidateAccountIdentity = {
  avatarUrl?: string | null;
  title: string;
  subtitle?: string | null;
  badge?: ReactNode;
};

export type CandidateAccountNavigationItem = {
  id: string;
  label: string;
  href:
    | '/account'
    | '/account/saved'
    | '/account/access'
    | '/me/alerts'
    | '/me/applications'
    | '/settings';
};

export function CandidateAccountShell({
  identity,
  navigation,
  navigationLabel,
  activeSection,
  rail,
  children,
}: {
  identity: CandidateAccountIdentity;
  navigation: CandidateAccountNavigationItem[];
  navigationLabel: string;
  activeSection: string;
  rail?: ReactNode;
  children: ReactNode;
}) {
  const sidebar = (
    <div
      data-slot="candidate-account-sidebar"
      className="bg-card ring-foreground/5 min-w-0 rounded-3xl p-4 shadow-sm ring-1"
    >
      <div className="flex min-w-0 items-center gap-3 px-1 py-1">
        <Avatar size="lg">
          {identity.avatarUrl ? (
            <AvatarImage src={identity.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback>{initials(identity.title)}</AvatarFallback>
        </Avatar>
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

      <div aria-hidden className="border-border my-4 border-t" />

      <nav
        aria-label={navigationLabel}
        className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1"
      >
        {navigation.map((item) => {
          const current = item.id === activeSection;
          return (
            <Link
              key={item.id}
              to={item.href}
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
        <div className="border-border mt-4 border-t pt-4">{rail}</div>
      ) : null}
    </div>
  );

  return (
    <Page width="wide">
      <PageContent
        aside={sidebar}
        asideLabel={navigationLabel}
        asideOrder="before"
      >
        <div data-slot="candidate-account-content" className="min-w-0">
          {children}
        </div>
      </PageContent>
    </Page>
  );
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  );
}
