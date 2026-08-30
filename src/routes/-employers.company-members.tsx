/**
 * Company workspace — Team members. Own page in the employer menu (ADR-0109
 * amendment): one members table (approved members then pending invites),
 * admin role/remove/revoke controls, last_admin inline. Header matches
 * the sibling Jobs page.
 */
import { useEffect, useRef, useState } from 'react';

import { PlusIcon } from 'lucide-react';

import { CompanyMembersTable } from '../components/employer/company-members-table';
import { InviteMemberDialog } from '../components/employer/invite-member-dialog';
import {
  handleEmployerLoaderError,
  isReauthRetry,
} from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getSessionUser } from '../server/account';
import {
  createCompanyInvite,
  getCompanyWorkspace,
  leaveCompany,
  listCompanyInvites,
  listCompanyMembers,
  removeCompanyMember,
  revokeCompanyInvite,
  updateCompanyMemberRole,
} from '../server/employers';
import { getSeoBase } from '../server/queries';

import { Page, PageContent } from '@/components/layout/page';
import { Text } from '@/components/text';
import { Button } from '@/components/ui/button';
import type { UrlSearchInput } from '@/lib/pagination';
import type { CompanyMember, CompanyMemberInvite } from '@cavuno/board';

function isJoinedFlag(search: UrlSearchInput | undefined): boolean {
  const value = search?.joined;
  return value === true || value === 'true' || value === '1' || value === 1;
}

function teamMembersSubtitle(count: number) {
  if (count === 0) return m.employerMembers_countZero();
  const locale = getLocale();
  return m.employerMembers_count({
    count,
    countLabel: count.toLocaleString(locale),
  });
}

export type CompanyMembersLoaderDependencies = {
  getCompanyWorkspace: (
    ...args: Parameters<typeof getCompanyWorkspace>
  ) => ReturnType<typeof getCompanyWorkspace>;
  listCompanyMembers: (
    ...args: Parameters<typeof listCompanyMembers>
  ) => ReturnType<typeof listCompanyMembers>;
  listCompanyInvites: (
    ...args: Parameters<typeof listCompanyInvites>
  ) => ReturnType<typeof listCompanyInvites>;
  getSessionUser: (
    ...args: Parameters<typeof getSessionUser>
  ) => ReturnType<typeof getSessionUser>;
  getSeoBase: (
    ...args: Parameters<typeof getSeoBase>
  ) => ReturnType<typeof getSeoBase>;
  handleEmployerLoaderError: typeof handleEmployerLoaderError;
};

const companyMembersLoaderDependencies: CompanyMembersLoaderDependencies = {
  getCompanyWorkspace,
  listCompanyMembers,
  listCompanyInvites,
  getSessionUser,
  getSeoBase,
  handleEmployerLoaderError,
};

export function createCompanyMembersLoader(
  dependencies?: CompanyMembersLoaderDependencies,
) {
  return async ({
    params,
    location,
  }: {
    params: { slug: string };
    location: { search?: UrlSearchInput; searchStr?: string };
  }) => {
    const loaderDependencies = dependencies ?? companyMembersLoaderDependencies;
    try {
      const [workspace, members, invites, user, seo] = await Promise.all([
        loaderDependencies.getCompanyWorkspace({ data: { slug: params.slug } }),
        loaderDependencies.listCompanyMembers({ data: { slug: params.slug } }),
        loaderDependencies.listCompanyInvites({ data: { slug: params.slug } }),
        loaderDependencies.getSessionUser(),
        loaderDependencies.getSeoBase(),
      ]);
      return {
        workspace,
        members,
        invites,
        user,
        seo,
        joined: isJoinedFlag(location.search),
      };
    } catch (error) {
      return await loaderDependencies.handleEmployerLoaderError(
        error,
        `/employers/companies/${params.slug}/members`,
        {
          retried: isReauthRetry(location),
          incomingSearch: location.searchStr ?? location.search,
        },
      );
    }
  };
}

export type CompanyMembersLoaderData = Awaited<
  ReturnType<ReturnType<typeof createCompanyMembersLoader>>
>;

export type CompanyMembersViewData = {
  workspace: {
    slug: string;
    membership: { role: string; company: { name: string } } | null;
  };
  members: { data: CompanyMember[] };
  invites: { data: CompanyMemberInvite[] };
  user: { id: string } | null;
  joined: boolean;
};

export type CompanyMembersViewActions = {
  createCompanyInvite: (
    ...args: Parameters<typeof createCompanyInvite>
  ) => Promise<
    | { ok: true; data?: object | null }
    | { ok: false; code: string; message: string }
  >;
  leaveCompany: (
    ...args: Parameters<typeof leaveCompany>
  ) => Promise<
    | { ok: true; data?: object | null }
    | { ok: false; code: string; message: string }
  >;
  removeCompanyMember: (
    ...args: Parameters<typeof removeCompanyMember>
  ) => Promise<
    | { ok: true; data?: object | null }
    | { ok: false; code: string; message: string }
  >;
  revokeCompanyInvite: (
    ...args: Parameters<typeof revokeCompanyInvite>
  ) => Promise<
    | { ok: true; data?: object | null }
    | { ok: false; code: string; message: string }
  >;
  updateCompanyMemberRole: (
    ...args: Parameters<typeof updateCompanyMemberRole>
  ) => Promise<
    | { ok: true; data?: object | null }
    | { ok: false; code: string; message: string }
  >;
  invalidate: () => Promise<void>;
  navigateToDashboard: () => Promise<void>;
  navigateToMembers: (slug: string) => Promise<void>;
  toastError: (message: string) => void;
  toastSuccess: (message: string) => void;
};

function JoinedToast({
  joined,
  slug,
  actions,
}: {
  joined: boolean;
  slug: string;
  actions: CompanyMembersViewActions;
}) {
  const shown = useRef(false);

  useEffect(() => {
    if (!joined || shown.current) return;
    shown.current = true;
    actions.toastSuccess(m.employerMembers_joinedToast());
    void actions.navigateToMembers(slug);
  }, [actions, joined, slug]);

  return null;
}

export function CompanyMembersPageView({
  data,
  actions,
}: {
  data: CompanyMembersViewData;
  actions: CompanyMembersViewActions;
}) {
  const { workspace, members, invites, user, joined } = data;
  const companyName = workspace.membership?.company.name ?? workspace.slug;
  const isAdmin = workspace.membership?.role === 'admin';
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <Page width="content">
      <PageContent>
        <JoinedToast joined={joined} slug={workspace.slug} actions={actions} />
        <div className="space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <Text as="h1" variant="heading1">
                {m.employerMembers_companyHeading({ company: companyName })}
              </Text>
              <p className="text-muted-foreground text-sm">
                {teamMembersSubtitle(members.data.length)}
              </p>
            </div>
            {isAdmin ? (
              <Button type="button" onClick={() => setInviteOpen(true)}>
                <PlusIcon data-icon="inline-start" aria-hidden />
                {m.employerMembers_inviteLabel()}
              </Button>
            ) : null}
          </header>
          <CompanyMembersTable
            slug={workspace.slug}
            companyName={companyName}
            locale={getLocale()}
            members={members.data}
            invites={invites.data}
            isAdmin={isAdmin}
            currentUserId={user?.id ?? ''}
            actions={actions}
          />
          {isAdmin ? (
            <InviteMemberDialog
              slug={workspace.slug}
              open={inviteOpen}
              onOpenChange={setInviteOpen}
              actions={actions}
            />
          ) : null}
        </div>
      </PageContent>
    </Page>
  );
}
