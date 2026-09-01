import {
  createFileRoute,
  getRouteApi,
  useLocation,
  useNavigate,
} from '@tanstack/react-router';
import { Users } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { RestrictedTalentDirectory } from './-restricted-talent-directory';
import {
  createTalentDirectoryLoader,
  TALENT_PAGE_SIZE,
} from './-talent-loaders';

import { getTalentSearchLabels } from '@/board/talent-search-labels';
import {
  employerCanStartMessage,
  sellsTalentProfileUnlocks,
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
import { localizePath } from '@/lib/localized-path';
import { pageSearchValue } from '@/lib/pagination';
import {
  parseTalentSearch,
  talentListingLoaderDeps,
} from '@/lib/talent-search';
import { SelectedTalentDetail } from '@/routes/-selected-talent-detail';
import { useSelectedTalent } from '@/routes/-use-selected-talent';
import { startConversation } from '@/server/messaging';

const rootApi = getRouteApi('__root__');
export const Route = createFileRoute('/talent/')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseTalentSearch,
  loaderDeps: ({ search }) => talentListingLoaderDeps(search),
  loader: createTalentDirectoryLoader(),
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
  const { board } = rootApi.useLoaderData();
  const { user, talentAccess } = useRootSession();
  const search = Route.useSearch();
  const location = useLocation();
  const navigate = useNavigate({ from: '/talent/' });
  // Gate the detail-pane Message CTA by the viewer's role. A candidate cannot
  // cold-message another candidate; eligible employers compose by public
  // candidate handle (see resolveTalentDetailCta for the full matrix).
  const viewer: TalentDetailViewer =
    user === null
      ? { kind: 'anonymous' }
      : user.role === 'employer'
        ? {
            kind: 'employer',
            hasTalentAccess: talentAccess.hasTalentAccess,
            canStartMessage: employerCanStartMessage(talentAccess),
          }
        : { kind: 'candidate' };
  const profileUnlocks = sellsTalentProfileUnlocks(talentAccess.accessModel);
  const signInHref = candidateSignInHref(location.href);
  const selectedOnPage = page?.data.some(
    (candidate) =>
      candidate.handle === search.selectedTalent ||
      candidate.id === search.selectedTalent,
  );
  const selectedTalent = useSelectedTalent(
    search.sourced || selectedOnPage ? search.selectedTalent : undefined,
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
        ads={board.ads}
        search={search}
        candidates={page.data.map((candidate) =>
          toTalentCardVM(candidate, getTalentSearchLabels(), {
            profileUnlocks,
          }),
        )}
        q={search.q}
        skill={search.skill}
        count={page.count ?? page.data.length}
        page={search.page ?? 1}
        pageSize={TALENT_PAGE_SIZE}
        language={getLocale()}
        profileUnlocks={profileUnlocks}
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
            // Default-first-result sync after a header click. `resetScroll:
            // false` here re-applies the previous /talent window scroll and
            // lands the listing mid-page. User row clicks use onPush below.
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
            profileUnlocks={profileUnlocks}
            onStartConversation={(input) => startConversation({ data: input })}
            onConversationStarted={(conversationId) =>
              window.location.assign(
                localizePath(`/messages/${encodeURIComponent(conversationId)}`),
              )
            }
          />
        }
      />
    </>
  );
}
