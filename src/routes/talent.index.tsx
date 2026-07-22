import { boardCopy } from '#/copy';

import { isNotFound } from '@cavuno/board';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import {
  createFileRoute,
  getRouteApi,
  notFound,
  useLocation,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
import { Users } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getSeoBase, listTalent } from '../server/queries';
import { RestrictedTalentDirectory } from './-restricted-talent-directory';

import { getTalentSearchLabels } from '@/board/talent-search-labels';
import {
  toTalentCardVM,
  type TalentDetailViewer,
} from '@/board/talent-view-model';
import { TalentSearchPage } from '@/components/board/talent-search-page';
import { EmptyState } from '@/components/empty-state';
import { JsonLd } from '@/components/json-ld';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { buttonVariants } from '@/components/ui/button';
import { candidateSignInHref } from '@/lib/candidate-return-to';
import { headTitle } from '@/lib/page-title';
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
  head: ({ loaderData, match }) =>
    loaderData
      ? {
          meta: [
            {
              title: headTitle(
                loaderData?.seo.boardName,
                m.talentDirectory_title(),
              ),
            },
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
      : {
          meta: [
            {
              // A loader that threw notFound() still runs this head, so a
              // page that does not exist would otherwise advertise itself as
              // the talent directory. No loader data means no board name, so
              // the seam degrades to a bare title either way.
              title: headTitle(
                undefined,
                match.status === 'notFound'
                  ? m.notFound_heading()
                  : m.talentDirectory_title(),
              ),
            },
          ],
        },
  component: TalentDirectoryPage,
  notFoundComponent: TalentDirectoryNotFound,
});

function TalentDirectoryNotFound() {
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

function TalentDirectoryPage() {
  const { seo, page, restricted } = Route.useLoaderData();
  const { user, board } = rootApi.useLoaderData();
  const search = Route.useSearch();
  const location = useLocation();
  const navigate = useNavigate({ from: '/talent/' });
  const router = useRouter();
  const copy = boardCopy(seo.language, seo.labels);
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
      <JsonLd data={jsonLd} />
      <TalentSearchPage
        candidates={page.data.map((candidate) =>
          toTalentCardVM(candidate, getTalentSearchLabels()),
        )}
        q={search.q}
        skill={search.skill}
        hasPreviousResults={Boolean(search.cursor)}
        nextCursor={page.hasMore ? page.nextCursor : null}
        onPreviousResults={() => router.history.back()}
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
            locale={seo.language}
            viewer={viewer}
            signInHref={signInHref}
            messagingEnabled={board.features.messaging}
          />
        }
      />
    </>
  );
}
