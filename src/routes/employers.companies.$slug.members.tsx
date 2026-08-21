/**
 * Company workspace — Team members. Own page in the employer menu (ADR-0109
 * amendment): one members table (approved members then pending invites),
 * admin role/remove/revoke controls, last_admin inline. Header matches
 * the sibling Jobs page.
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { createFileRoute, useRouter } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import { CompanyMembersTable } from '../components/employer/company-members-table';
import {
  handleEmployerLoaderError,
  isReauthRetry,
} from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getSessionUser } from '../server/account';
import {
  getCompanyWorkspace,
  listCompanyInvites,
  listCompanyMembers,
} from '../server/employers';
import { getSeoBase } from '../server/queries';

import { Page, PageContent } from '@/components/layout/page';
import { Text } from '@/components/text';
import { Button } from '@/components/ui/button';
import { headTitle } from '@/lib/page-title';

/**
 * The invite dialog drags in the Base UI dialog graph, which is pure
 * behind-a-button work — it pushed this route past its bundle budget while
 * nobody had opened it. Lazy like the other dialog/combobox surfaces; it only
 * mounts once an admin actually opens it.
 */
const LazyInviteMemberDialog = lazy(() =>
  import('../components/employer/invite-member-dialog').then(
    ({ InviteMemberDialog }) => ({ default: InviteMemberDialog }),
  ),
);

function isJoinedFlag(search: unknown): boolean {
  const value = (search as Record<string, unknown> | undefined)?.joined;
  return value === true || value === 'true' || value === '1' || value === 1;
}

function teamMembersSubtitle(count: number) {
  if (count === 0) return m.employerMembers_countZero();
  const locale = getLocale();
  if (new Intl.PluralRules(locale).select(count) === 'one') {
    return m.employerMembers_countOne();
  }
  return m.employerMembers_countMany({
    count: count.toLocaleString(locale),
  });
}

export const Route = createFileRoute('/employers/companies/$slug/members')({
  loader: async ({ params, location }) => {
    try {
      const [workspace, members, invites, user, seo] = await Promise.all([
        getCompanyWorkspace({ data: { slug: params.slug } }),
        listCompanyMembers({ data: { slug: params.slug } }),
        listCompanyInvites({ data: { slug: params.slug } }),
        getSessionUser(),
        getSeoBase(),
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
      return await handleEmployerLoaderError(
        error,
        `/employers/companies/${params.slug}/members`,
        { retried: isReauthRetry(location) },
      );
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(loaderData?.seo.boardName, m.employerMembers_title()),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  staticData: { ownsMain: true },
  component: CompanyMembersPage,
});

function JoinedToast({ joined, slug }: { joined: boolean; slug: string }) {
  const shown = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (!joined || shown.current) return;
    shown.current = true;
    toast.success(m.employerMembers_joinedToast());
    void router.navigate({
      to: '/employers/companies/$slug/members',
      params: { slug },
      replace: true,
    });
  }, [joined, router, slug]);

  return null;
}

function CompanyMembersPage() {
  const { workspace, members, invites, user, joined } = Route.useLoaderData();
  const companyName = workspace.membership?.company.name ?? workspace.slug;
  const isAdmin = workspace.membership?.role === 'admin';
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <Page width="content">
      <PageContent>
        <JoinedToast joined={joined} slug={workspace.slug} />
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
            members={members.data}
            invites={invites.data}
            isAdmin={isAdmin}
            currentUserId={user?.id ?? ''}
          />
          {isAdmin && inviteOpen ? (
            <Suspense fallback={null}>
              <LazyInviteMemberDialog
                slug={workspace.slug}
                open={inviteOpen}
                onOpenChange={setInviteOpen}
              />
            </Suspense>
          ) : null}
        </div>
      </PageContent>
    </Page>
  );
}
