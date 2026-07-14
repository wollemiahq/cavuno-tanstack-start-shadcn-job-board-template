import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Page, PageContent } from "@/components/layout/page";
import { cn } from "@/lib/utils";

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
    | "/account"
    | "/account/saved"
    | "/account/access"
    | "/me/alerts"
    | "/me/applications"
    | "/settings";
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
      className="min-w-0 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5"
    >
      <div className="flex min-w-0 items-center gap-3 px-1 py-1">
        <Avatar size="lg">
          {identity.avatarUrl ? <AvatarImage src={identity.avatarUrl} alt="" /> : null}
          <AvatarFallback>{initials(identity.title)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="min-w-0 truncate font-medium text-foreground">{identity.title}</p>
            {identity.badge}
          </div>
          {identity.subtitle ? (
            <p className="mt-0.5 break-words text-sm text-muted-foreground">{identity.subtitle}</p>
          ) : null}
        </div>
      </div>

      <div aria-hidden className="my-4 border-t border-border" />

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
              aria-current={current ? "page" : undefined}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                current && "bg-muted text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {rail ? <div className="mt-4 border-t border-border pt-4">{rail}</div> : null}
    </div>
  );

  return (
    <Page width="wide">
      <PageContent aside={sidebar} asideLabel={navigationLabel} asideOrder="before">
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
      .join("")
      .toUpperCase() || "?"
  );
}
