import { boardCopy } from '#/copy';

import { isNotFound } from '@cavuno/board';
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
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseTalentSearch,
  loaderDeps: ({ search }) => talentListingLoaderDeps(search),
  loader: async ({ deps }) => {
    const seo = await getSeoBase();

    try {
      const result = await listTalent({
        data: {
          cursor: deps.cursor,
          q: deps.q,
          skill: deps.skill,
          limit: TALENT_PAGE_SIZE,
        },
      });
      if (result.status === 'restricted') {
        return { seo, page: null, restricted: true as const };
      }
      return { seo, page: result.page, restricted: false as const };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
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
    <Page width="wide">
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

export function RestrictedTalentDirectory({
  boardName,
}: {
  boardName: string;
}) {
  return (
    <Page width="wide" fill>
      <main className="min-w-0 overflow-x-clip">
        <div className="mx-auto w-full max-w-[var(--layout-width)] px-4 py-4 md:px-8">
          <Empty className="min-h-[calc(100dvh-12rem)] border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LockKeyhole aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>
                <h1>{m.talentDirectory_restrictedHeading()}</h1>
              </EmptyTitle>
              <EmptyDescription>
                {m.talentDirectory_restrictedBody({ boardName })}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex-row justify-center gap-2">
              <a href="/auth/employer/sign-up" className={buttonVariants()}>
                {m.siteHeader_signUpLabel()}
              </a>
              <a
                href="/auth/sign-in"
                className={buttonVariants({ variant: 'outline' })}
              >
                {m.talentDirectory_signInLabel()}
              </a>
            </EmptyContent>
          </Empty>
        </div>
      </main>
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
