'use client';

import { Link, useRouter } from '@tanstack/react-router';
import { Check } from 'lucide-react';

import { initialsOf } from '../lib/initials';
import { m } from '../paraglide/messages';
import { signOut } from '../server/auth';

import { EmployerIdentityAvatar } from '@/components/account-shell';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toastActionError } from '@/lib/action-toast';
import { cn } from '@/lib/utils';
import type { BoardUser, CompanyMembership } from '@cavuno/board';

export type SignOutAction = () => Promise<void | { ok: true }>;

/** Authenticated-only header UI, split out of the anonymous public shell. */
export function HeaderAccountMenu({
  user,
  hasAccessGrant,
  nativeApplications,
  jobRecommendationsEnabled,
  employerCompanies,
  activeCompany = null,
  hasProductsPage = false,
  onSignOut,
  onSignOutPendingChange,
  signOutAction = signOut,
}: {
  user: BoardUser;
  hasAccessGrant: boolean;
  nativeApplications: boolean;
  jobRecommendationsEnabled: boolean;
  employerCompanies: CompanyMembership[] | null;
  /**
   * The company the header's employer links point at: the trigger shows its
   * logo and name, and the menu links back to the public board.
   */
  activeCompany?: {
    name: string;
    slug: string | null;
    logoUrl: string | null;
  } | null;
  /** The board sells digital products: show the Purchases library. */
  hasProductsPage?: boolean;
  onSignOut: () => void;
  onSignOutPendingChange: (pending: boolean) => void;
  signOutAction?: SignOutAction;
}) {
  const companyWorkspaces = (employerCompanies ?? []).filter(
    (membership) =>
      membership.status === 'approved' && membership.company.slug !== null,
  );
  const router = useRouter();
  // Matches, saved jobs and applications need a candidate profile (hosted
  // parity); profile, job alerts and settings work for every account.
  const isCandidate = user.role === 'candidate';
  const companiesGroup = (
    <DropdownMenuGroup>
      <DropdownMenuLabel>
        {m.employerOnboarding_yourCompaniesTitle()}
      </DropdownMenuLabel>
      {companyWorkspaces.map((membership) => {
        const current = membership.company.slug === activeCompany?.slug;
        return (
          <DropdownMenuItem
            key={membership.id}
            nativeButton={false}
            aria-current={current ? 'true' : undefined}
            render={
              <Link
                to="/employers/companies/$slug"
                params={{ slug: membership.company.slug! }}
                // The current company is marked below; the router would
                // otherwise call it the current page on all its pages.
                activeOptions={{ exact: true }}
              />
            }
          >
            <span className="min-w-0 flex-1 truncate">
              {membership.company.name}
            </span>
            {current ? <Check aria-hidden="true" /> : null}
          </DropdownMenuItem>
        );
      })}
      <DropdownMenuItem
        nativeButton={false}
        render={<Link to="/employers/dashboard" search={{ add: true }} />}
      >
        {m.siteHeader_addNewCompanyLabel()}
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );

  return (
    <DropdownMenu>
      {activeCompany ? (
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              className="h-auto gap-2 rounded-full py-1 pr-1 pl-1 sm:pr-3"
              aria-label={m.siteHeader_accountLabel()}
              data-test="account-menu"
            />
          }
        >
          <EmployerIdentityAvatar
            name={activeCompany.name}
            logoUrl={activeCompany.logoUrl}
            size="default"
          />
          <AccountIdentity
            name={user.displayName ?? user.email}
            company={activeCompany.name}
            className="hidden max-w-40 sm:grid"
          />
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label={m.siteHeader_accountLabel()}
              data-test="account-menu"
            />
          }
        >
          <Avatar size="sm">
            <AvatarFallback>
              {initialsOf(user.displayName ?? user.email)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent align="end" className="min-w-56">
        {activeCompany ? (
          <>
            {/* Who and which company, as on the button, then the switcher. */}
            <div className="flex items-center gap-3 px-2 py-2">
              <EmployerIdentityAvatar
                name={activeCompany.name}
                logoUrl={activeCompany.logoUrl}
                size="default"
              />
              <AccountIdentity
                name={user.displayName ?? user.email}
                company={activeCompany.name}
                className="grid"
              />
            </div>
            <DropdownMenuSeparator />
            {companiesGroup}
            <DropdownMenuSeparator />
            <DropdownMenuItem nativeButton={false} render={<Link to="/" />}>
              {m.employerNav_viewBoardLabel()}
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuItem nativeButton={false} render={<Link to="/account" />}>
          {m.accountShell_profileNav()}
        </DropdownMenuItem>
        {isCandidate && jobRecommendationsEnabled ? (
          <DropdownMenuItem
            nativeButton={false}
            render={<Link to="/matches" />}
          >
            {m.accountShell_recommendedJobsNav()}
          </DropdownMenuItem>
        ) : null}
        {isCandidate ? (
          <DropdownMenuItem
            nativeButton={false}
            render={<Link to="/saved-jobs" />}
          >
            {m.accountShell_savedJobsNav()}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          nativeButton={false}
          render={<Link to="/me/alerts" />}
        >
          {m.accountShell_jobAlertsNav()}
        </DropdownMenuItem>
        {isCandidate && nativeApplications ? (
          <DropdownMenuItem
            nativeButton={false}
            render={<Link to="/me/applications" />}
          >
            {m.accountShell_applicationsNav()}
          </DropdownMenuItem>
        ) : null}
        {hasProductsPage ? (
          <DropdownMenuItem
            nativeButton={false}
            render={<Link to="/me/purchases" />}
          >
            {m.accountShell_purchasesNav()}
          </DropdownMenuItem>
        ) : null}
        {hasAccessGrant ? (
          <DropdownMenuItem
            nativeButton={false}
            render={<Link to="/account/access" />}
          >
            {m.accountShell_subscriptionNav()}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem nativeButton={false} render={<Link to="/settings" />}>
          {m.accountShell_settingsNav()}
        </DropdownMenuItem>
        {activeCompany ? null : (
          <>
            <DropdownMenuSeparator />
            {companiesGroup}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-test="account-menu-sign-out"
          onClick={async () => {
            onSignOutPendingChange(true);
            try {
              await signOutAction();
            } catch {
              // Keep the truthful signed-in state so the user can retry.
              onSignOutPendingChange(false);
              void toastActionError();
              return;
            }
            onSignOut();
            onSignOutPendingChange(false);
            try {
              await router.navigate({ to: '/' });
              await router.invalidate();
            } catch {
              // The cookie is already cleared. Reconcile with a hard reload
              // instead of presenting a retryable sign-out failure.
              window.location.assign('/');
            }
          }}
        >
          {m.accountHome_signOutLabel()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The viewer's name over the company they are working on. */
function AccountIdentity({
  name,
  company,
  className,
}: {
  name: string;
  company: string;
  className: string;
}) {
  return (
    <span className={cn('min-w-0 text-left leading-tight', className)}>
      <span className="truncate text-sm font-medium">{name}</span>
      <span className="text-muted-foreground truncate text-xs font-normal">
        {company}
      </span>
    </span>
  );
}
