'use client';

import { Link, useRouter } from '@tanstack/react-router';

import { initialsOf } from '../lib/initials';
import { m } from '../paraglide/messages';
import { signOut } from '../server/auth';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BoardUser, CompanyMembership } from '@cavuno/board';

export type SignOutAction = () => Promise<void | { ok: true }>;

/** Authenticated-only header UI, split out of the anonymous public shell. */
export function HeaderAccountMenu({
  user,
  hasAccessGrant,
  nativeApplications,
  employerCompanies,
  onSignOut,
  onSignOutPendingChange,
  signOutAction = signOut,
}: {
  user: BoardUser;
  hasAccessGrant: boolean;
  nativeApplications: boolean;
  employerCompanies: CompanyMembership[] | null;
  onSignOut: () => void;
  onSignOutPendingChange: (pending: boolean) => void;
  signOutAction?: SignOutAction;
}) {
  const companyWorkspaces = (employerCompanies ?? []).filter(
    (membership) =>
      membership.status === 'approved' && membership.company.slug !== null,
  );
  const router = useRouter();

  return (
    <DropdownMenu>
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
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem nativeButton={false} render={<Link to="/account" />}>
          {m.accountShell_profileNav()}
        </DropdownMenuItem>
        <DropdownMenuItem nativeButton={false} render={<Link to="/matches" />}>
          {m.accountShell_recommendedJobsNav()}
        </DropdownMenuItem>
        <DropdownMenuItem
          nativeButton={false}
          render={<Link to="/saved-jobs" />}
        >
          {m.accountShell_savedJobsNav()}
        </DropdownMenuItem>
        <DropdownMenuItem
          nativeButton={false}
          render={<Link to="/me/alerts" />}
        >
          {m.accountShell_jobAlertsNav()}
        </DropdownMenuItem>
        {nativeApplications ? (
          <DropdownMenuItem
            nativeButton={false}
            render={<Link to="/me/applications" />}
          >
            {m.accountShell_applicationsNav()}
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
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {m.employerOnboarding_yourCompaniesTitle()}
          </DropdownMenuLabel>
          {companyWorkspaces.map((membership) => (
            <DropdownMenuSub key={membership.id}>
              <DropdownMenuSubTrigger>
                {membership.company.name}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  nativeButton={false}
                  render={
                    <Link
                      to="/employers/companies/$slug"
                      params={{ slug: membership.company.slug! }}
                    />
                  }
                >
                  {m.accountShell_jobsNav()}
                </DropdownMenuItem>
                <DropdownMenuItem
                  nativeButton={false}
                  render={
                    <Link
                      to="/employers/companies/$slug/profile"
                      params={{ slug: membership.company.slug! }}
                    />
                  }
                >
                  {m.accountShell_companyProfileNav()}
                </DropdownMenuItem>
                <DropdownMenuItem
                  nativeButton={false}
                  render={
                    <Link
                      to="/employers/companies/$slug/jobs/new"
                      params={{ slug: membership.company.slug! }}
                    />
                  }
                >
                  {m.siteHeader_postJobLabel()}
                </DropdownMenuItem>
                <DropdownMenuItem
                  nativeButton={false}
                  render={
                    <Link
                      to="/employers/companies/$slug/members"
                      params={{ slug: membership.company.slug! }}
                    />
                  }
                >
                  {m.accountShell_membersNav()}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))}
          <DropdownMenuItem
            nativeButton={false}
            render={<Link to="/employers/dashboard" search={{ add: true }} />}
          >
            {m.siteHeader_addNewCompanyLabel()}
          </DropdownMenuItem>
        </DropdownMenuGroup>
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
              return;
            }
            onSignOut();
            onSignOutPendingChange(false);
            await router.navigate({ to: '/' });
            await router.invalidate();
          }}
        >
          {m.accountHome_signOutLabel()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
