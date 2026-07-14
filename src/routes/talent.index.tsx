import { boardCopy } from '#/copy';
import { isBoardApiError, isNotFound } from '@cavuno/board';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { LockKeyhole, Users } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getSeoBase, listTalent } from '../server/queries';

import { TalentSearchPage } from '@/components/board/talent-search-page';
import { JsonLd } from '@/components/json-ld';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  parseTalentSearch,
  talentListingLoaderDeps,
  talentSearchSubmission,
} from '@/lib/talent-search';
import { SelectedTalentDetail } from '@/routes/-selected-talent-detail';
import { useSelectedTalent } from '@/routes/-use-selected-talent';

const TALENT_PAGE_SIZE = 24;

export const Route = createFileRoute('/talent/')({
  staticData: { fullBleed: true, ownsMain: true },
  validateSearch: parseTalentSearch,
  loaderDeps: ({ search }) => talentListingLoaderDeps(search),
  loader: async ({ deps }) => {
    const seo = await getSeoBase();

    try {
      const page = await listTalent({
        data: {
          cursor: deps.cursor,
          q: deps.q,
          skill: deps.skill,
          limit: TALENT_PAGE_SIZE,
        },
      });
      return { seo, page, restricted: false as const };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      if (
        isBoardApiError(error) &&
        error.status === 403 &&
        error.code === 'talent_directory_restricted'
      ) {
        return { seo, page: null, restricted: true as const };
      }
      throw error;
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: m.talentDirectory_title() },
            {
              name: 'description',
              content: m.talentDirectory_metaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            { rel: 'canonical', href: `${loaderData.seo.origin}/talent` },
          ],
        }
      : { meta: [{ title: m.talentDirectory_title() }] },
  component: TalentDirectoryPage,
  notFoundComponent: TalentDirectoryNotFound,
});

function TalentDirectoryNotFound() {
  return (
    <Page width="content">
      <PageContent header={<PageHeader title={m.talentDirectory_title()} />}>
        <Empty className="min-h-80 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{m.talentDirectory_notFoundText()}</EmptyTitle>
            <EmptyDescription>{m.talentDirectory_emptyText()}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <a href="/jobs" className={buttonVariants({ variant: 'outline' })}>
              {m.meApplications_browseJobsLink()}
            </a>
          </EmptyContent>
        </Empty>
      </PageContent>
    </Page>
  );
}

function RestrictedTalentDirectory({ boardName }: { boardName: string }) {
  return (
    <Page width="content">
      <PageContent header={<PageHeader title={m.talentDirectory_title()} />}>
        <Empty className="min-h-80 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LockKeyhole aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{m.talentDirectory_restrictedHeading()}</EmptyTitle>
            <EmptyDescription>
              {m.talentDirectory_restrictedBody({ boardName })}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <a href="/auth/sign-in" className={buttonVariants()}>
              {m.talentDirectory_signInLabel()}
            </a>
          </EmptyContent>
        </Empty>
      </PageContent>
    </Page>
  );
}

function TalentDirectoryPage() {
  const { seo, page, restricted } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/talent/' });
  const copy = boardCopy(seo.language, seo.labels);
  const selectedTalent = useSelectedTalent(
    page?.data.some((candidate) => candidate.handle === search.selectedTalent)
      ? search.selectedTalent
      : undefined,
  );
  const jsonLd = [
    createBreadcrumbJsonLd([
      { label: copy.breadcrumbs.home, href: seo.origin },
      { label: copy.breadcrumbs.talent },
    ]),
  ].filter((entry): entry is Record<string, unknown> => entry !== null);

  if (restricted) {
    return (
      <>
        <JsonLd data={jsonLd} />
        <RestrictedTalentDirectory boardName={seo.boardName} />
      </>
    );
  }

  if (!page) throw new Error('Public Talent directory data is missing');

  return (
    <>
      <JsonLd data={jsonLd} />
      <TalentSearchPage
        candidates={page.data}
        heading={m.talentDirectory_title()}
        description={m.talentDirectory_metaDescription({
          boardName: seo.boardName,
        })}
        breadcrumb={{
          ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
          items: [
            { name: copy.breadcrumbs.home, href: '/' },
            { name: copy.breadcrumbs.talent },
          ],
        }}
        q={search.q}
        skill={search.skill}
        hasMore={page.hasMore}
        onNextResults={
          page.hasMore && page.nextCursor
            ? () =>
                navigate({
                  search: (previous) => ({
                    ...previous,
                    cursor: page.nextCursor ?? undefined,
                    selectedTalent: undefined,
                  }),
                })
            : undefined
        }
        onSearchSubmit={(next) =>
          navigate({
            search: (previous) => talentSearchSubmission(previous, next),
          })
        }
        selectedTalent={search.selectedTalent}
        onSelectedTalentReplace={(handle) =>
          navigate({
            search: (previous) => ({
              ...previous,
              selectedTalent: handle,
            }),
            replace: true,
            resetScroll: false,
          })
        }
        onSelectedTalentPush={(handle) =>
          navigate({
            search: (previous) => ({
              ...previous,
              selectedTalent: handle,
            }),
            resetScroll: false,
          })
        }
        detail={
          <SelectedTalentDetail state={selectedTalent} locale={seo.language} />
        }
      />
    </>
  );
}
