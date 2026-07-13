/**
 * Sidebar-nav logged-in shell (Paper "B — Sidebar Nav"): identity block +
 * section nav in a left rail, content on the right. The public header and
 * footer stay — this renders inside the root <main>. On mobile the rail
 * stacks on top and the nav scrolls horizontally.
 */
import { Link, getRouteApi } from "@tanstack/react-router";

import { CompanyAvatar } from "@/components/board/company-avatar";
import { cx } from "@/utils/cx";
import { m } from "../paraglide/messages";

export interface ShellNavItem {
  key: string;
  to: string;
  params?: Record<string, string>;
  label: string;
}

export interface ShellIdentity {
  avatarUrl?: string | null;
  title: string;
  badge?: React.ReactNode;
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
  /** Extra rail content below the nav (e.g. the profile-strength meter). */
  rail?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8 md:flex-row md:gap-10">
      <aside className="w-full shrink-0 md:w-60">
        <div className="flex items-center gap-3 md:block md:space-y-3">
          <CompanyAvatar
            name={identity.title || "?"}
            logoUrl={identity.avatarUrl}
            size="lg"
          />
          <div>
            <p className="text-primary flex flex-wrap items-center gap-2 font-semibold">
              {identity.title}
              {identity.badge}
            </p>
            {identity.subtitle ? (
              <p className="text-tertiary mt-0.5 text-sm break-all">
                {identity.subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="my-5 border-t border-secondary" />

        <nav className="-mx-1 flex flex-row gap-1 overflow-x-auto md:mx-0 md:flex-col">
          {nav.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              params={item.params}
              className={cx(
                "rounded-md px-3 py-2 text-[15px] whitespace-nowrap hover:no-underline",
                item.key === active
                  ? "bg-secondary text-primary font-medium"
                  : "text-tertiary hover:text-primary",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {rail}
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const rootApi = getRouteApi("__root__");

/**
 * Candidate shell (Paper "Candidate — Sidebar"): Profile / Saved jobs /
 * Job alerts / Applications / Subscription (paywall boards only) /
 * Settings. Identity falls back to the session user; /account passes the
 * richer profile identity + strength meter.
 */
export function CandidateShell({
  active,
  identity,
  rail,
  children,
}: {
  active: string;
  identity?: Partial<ShellIdentity>;
  rail?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { board, user } = rootApi.useLoaderData();
  const title = identity?.title ?? user?.displayName ?? user?.email ?? "";
  const nav: ShellNavItem[] = [
    { key: "profile", to: "/account", label: m.accountShell_profileNav() },
    {
      key: "saved",
      to: "/account/saved",
      label: m.accountShell_savedJobsNav(),
    },
    { key: "alerts", to: "/me/alerts", label: m.accountShell_jobAlertsNav() },
    {
      key: "applications",
      to: "/me/applications",
      label: m.accountShell_applicationsNav(),
    },
    ...(board.features.candidatePaywall
      ? [
          {
            key: "subscription",
            to: "/account/access",
            label: m.accountShell_subscriptionNav(),
          },
        ]
      : []),
    { key: "settings", to: "/settings", label: m.accountShell_settingsNav() },
  ];
  return (
    <AccountShell
      identity={{
        avatarUrl: identity?.avatarUrl ?? null,
        title,
        subtitle: identity?.subtitle ?? user?.email ?? null,
        badge: identity?.badge,
      }}
      nav={nav}
      active={active}
      rail={rail}
    >
      {children}
    </AccountShell>
  );
}

/**
 * Employer company shell (Paper "Employer Sidebar"): the company identity
 * + Jobs / Company profile nav for one connected company. Team and
 * Settings from the Paper design are deliberately absent — the v1 API has
 * no team or company-settings surface yet.
 */
export function EmployerCompanyShell({
  slug,
  company,
  active,
  children,
}: {
  slug: string;
  company: { name: string; website: string | null; logoUrl: string | null };
  active: string;
  children: React.ReactNode;
}) {
  const nav: ShellNavItem[] = [
    {
      key: "jobs",
      to: "/employers/companies/$slug",
      params: { slug },
      label: m.accountShell_jobsNav(),
    },
    {
      key: "profile",
      to: "/employers/companies/$slug/profile",
      params: { slug },
      label: m.accountShell_companyProfileNav(),
    },
  ];
  return (
    <AccountShell
      identity={{
        avatarUrl: company.logoUrl,
        title: company.name,
        subtitle: company.website,
      }}
      nav={nav}
      active={active}
    >
      {children}
    </AccountShell>
  );
}
