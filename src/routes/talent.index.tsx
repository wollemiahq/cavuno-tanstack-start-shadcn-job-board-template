import { isNotFound } from '@cavuno/board';
import {
  createFileRoute,
  getRouteApi,
  notFound,
  type NotFoundRouteProps,
  useLocation,
  useNavigate,
} from '@tanstack/react-router';
import { Users } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getTalentIndexPage } from '../server/talent-pages';
import { RestrictedTalentDirectory } from './-restricted-talent-directory';

import { getTalentSearchLabels } from '@/board/talent-search-labels';
import {
  toTalentCardVM,
  type TalentDetailViewer,
} from '@/board/talent-view-model';
import { TalentSearchPage } from '@/components/board/talent-search-page';
import { EmptyState } from '@/components/empty-state';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { useRootSession } from '@/components/root-session';
import { buttonVariants } from '@/components/ui/button';
import { candidateSignInHref } from '@/lib/candidate-return-to';
import {
  exceedsOffsetPaginationWindow,
  isOutOfBoundsOffsetPage,
  pageSearchValue,
  pageToOffset,
} from '@/lib/pagination';
import {
  parseTalentSearch,
  talentListingLoaderDeps,
} from '@/lib/talent-search';
import { SelectedTalentDetail } from '@/routes/-selected-talent-detail';
import { useSelectedTalent } from '@/routes/-use-selected-talent';

const TALENT_PAGE_SIZE = 24;

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/talent/')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseTalentSearch,
  loaderDeps: ({ search }) => talentListingLoaderDeps(search),
  loader: async ({ deps }) => {
    const page = deps.page ?? 1;
    const offset = pageToOffset(page, TALENT_PAGE_SIZE);
    if (exceedsOffsetPaginationWindow(offset, TALENT_PAGE_SIZE)) {
      throw notFound({ data: { kind: 'pagination' } });
    }
    let result;
    try {
      result = await getTalentIndexPage({
        data: {
          offset,
          q: deps.q,
          skill: deps.skill,
          limit: TALENT_PAGE_SIZE,
        },
      });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
    if (
      result.page &&
      isOutOfBoundsOffsetPage({
        page,
        offset,
        count: result.page.count,
        resultCount: result.page.data.length,
      })
    ) {
      throw notFound({ data: { kind: 'pagination' } });
    }
    return result;
  },
  head: ({ loaderData, match }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {
          meta: [
            {
              // A loader that threw notFound() still runs this head, so a page
              // that does not exist would otherwise advertise itself as the
              // talent directory. No loader data means no board name.
              title:
                match.status === 'notFound'
                  ? m.notFound_heading()
                  : m.talentDirectory_title(),
            },
          ],
        },
  component: TalentDirectoryPage,
  notFoundComponent: TalentDirectoryNotFound,
});

function TalentDirectoryNotFound({ data }: NotFoundRouteProps) {
  if (
    typeof data === 'object' &&
    data !== null &&
    (data as { kind?: unknown }).kind === 'pagination'
  ) {
    return <TalentPaginationNotFound />;
  }

  return (
    <Page width="wide">
      <PageContent header={<PageHeader title={m.talentDirectory_title()} />}>
        <EmptyState
          icon={<Users aria-hidden="true" />}
          title={m.talentDirectory_notFoundText()}
          description={m.talentDirectory_emptyText()}
          action={
            <a href="/jobs" className={buttonVariants({ variant: 'outline' })}>
              {m.meApplications_browseJobsLink()}
            </a>
          }
        />
      </PageContent>
    </Page>
  );
}

function TalentPaginationNotFound() {
  const search = Route.useSearch();

  return (
    <TalentSearchPage
      candidates={[]}
      q={search.q}
      skill={search.skill}
      count={0}
      page={search.page ?? 1}
      pageSize={TALENT_PAGE_SIZE}
      language={getLocale()}
      onPageChange={() => undefined}
      selectedTalent={undefined}
      onSelectedTalentReplace={() => undefined}
      onSelectedTalentPush={() => undefined}
      detail={null}
    />
  );
}

function TalentDirectoryPage() {
  const { seo, page, restricted } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const { user } = useRootSession();
  const search = Route.useSearch();
  const location = useLocation();
  const navigate = useNavigate({ from: '/talent/' });
  // Gate the detail-pane Message CTA by the viewer's role. A candidate cannot
  // cold-message another candidate; an employer's Message hands off to the
  // canonical profile (see resolveTalentDetailCta for the full matrix).
  const viewer: TalentDetailViewer =
    user === null
      ? { kind: 'anonymous' }
      : user.role === 'employer'
      ? { kind: 'employer', hasTalentAccess: true }
      : { kind: 'candidate' };
  const signInHref = candidateSignInHref(location.href);
  const selectedTalent = useSelectedTalent(
    page?.data.some((candidate) => candidate.handle === search.selectedTalent)
      ? search.selectedTalent
      : undefined
  );

  if (restricted) {
    return (
      <>
        <RestrictedTalentDirectory
          boardName={seo.boardName}
          signedIn={user !== null}
        />
      </>
    );
  }

  if (!page) throw new Error('Public Talent directory data is missing');

  return (
    <>
      <TalentSearchPage
        candidates={page.data.map((candidate) =>
          toTalentCardVM(candidate, getTalentSearchLabels())
        )}
        q={search.q}
        skill={search.skill}
        count={page.count ?? page.data.length}
        page={search.page ?? 1}
        pageSize={TALENT_PAGE_SIZE}
        language={getLocale()}
        onPageChange={(next) =>
          navigate({
            search: (previous) => ({
              ...previous,
              page: pageSearchValue(next),
              selectedTalent: undefined,
            }),
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
          <SelectedTalentDetail
            state={selectedTalent}
            locale={getLocale()}
            viewer={viewer}
            signInHref={signInHref}
            messagingEnabled={board.features.messaging}
          />
        }
      />
    </>
  );
}
