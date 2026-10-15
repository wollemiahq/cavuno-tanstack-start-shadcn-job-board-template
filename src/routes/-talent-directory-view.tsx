/**
 * The talent directory screen shared by `/talent` and the talent location
 * pages (`/talent/locations/$location`): the restricted gate, or the search
 * results with the selected profile's detail pane. Navigation updates the
 * current route's search params, so the place in a location page's path is
 * kept while the other filters change.
 */
import { getRouteApi, useLocation, useNavigate } from '@tanstack/react-router';

import { getLocale } from '../paraglide/runtime';
import { RestrictedTalentDirectory } from './-restricted-talent-directory';
import { TALENT_PAGE_SIZE } from './-talent-loaders';

import { getTalentSearchLabels } from '@/board/talent-search-labels';
import {
  employerCanStartMessage,
  sellsTalentProfileUnlocks,
  toTalentCardVM,
  type TalentDetailViewer,
} from '@/board/talent-view-model';
import { NotFound } from '@/components/app-not-found';
import { TalentSearchPage } from '@/components/board/talent-search-page';
import { Page, PageContent } from '@/components/layout/page';
import { useRootSession } from '@/components/root-session';
import { candidateSignInHref } from '@/lib/candidate-return-to';
import type { CustomFilterField } from '@/lib/custom-field-filters';
import { localizePath } from '@/lib/localized-path';
import { pageSearchValue, type UrlSearchInput } from '@/lib/pagination';
import type { TalentSearch } from '@/lib/talent-search';
import { SelectedTalentDetail } from '@/routes/-selected-talent-detail';
import { useSelectedTalent } from '@/routes/-use-selected-talent';
import { startConversation } from '@/server/messaging';
import type { TalentPlaceRadius } from '@/server/talent-pages';
import type { TalentDirectoryListEnvelope } from '@cavuno/board';

const rootApi = getRouteApi('__root__');

type LooseNavigate = (opts: {
  to?: string;
  search?: (previous: UrlSearchInput) => UrlSearchInput;
  replace?: boolean;
  resetScroll?: boolean;
}) => void;

export type TalentDirectoryViewData = {
  seo: { boardName: string };
  /** `null` when `restricted`. */
  page: TalentDirectoryListEnvelope | null;
  restricted: boolean;
  customFilterFields: CustomFilterField[];
  placeRadius: TalentPlaceRadius | null;
};

export function TalentDirectoryView({
  data,
  search,
  heading,
}: {
  data: TalentDirectoryViewData;
  /** The directory filters, the location page's place included. */
  search: TalentSearch;
  /** The results heading; the directory's own heading when omitted. */
  heading?: string;
}) {
  const { seo, page, restricted, customFilterFields, placeRadius } = data;
  const { board } = rootApi.useLoaderData();
  const { user, talentAccess } = useRootSession();
  const location = useLocation();
  const routeNavigate = useNavigate();
  // SAFETY: Only search-object updates on the current route; route-specific
  // typing is erased at this view, shared by the directory routes.
  const navigate = routeNavigate as LooseNavigate;
  // Gate the detail-pane Message CTA by the viewer's role. A candidate cannot
  // cold-message another candidate; eligible employers compose by the
  // candidate's board-user id (see resolveTalentDetailCta for the matrix).
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
    search.saved || selectedOnPage ? search.selectedTalent : undefined,
  );

  if (restricted) {
    return (
      <RestrictedTalentDirectory
        boardName={seo.boardName}
        signedIn={user !== null}
      />
    );
  }

  if (!page) throw new Error('Public Talent directory data is missing');

  return (
    <TalentSearchPage
      ads={board.ads}
      heading={heading}
      search={search}
      customFilterFields={customFilterFields}
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
      placeRadius={placeRadius}
      onWithinChange={(within) =>
        navigate({
          search: (previous) => ({
            ...previous,
            within,
            page: undefined,
            selectedTalent: undefined,
          }),
        })
      }
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
  );
}

/**
 * The directory API 404s only when the board has no talent directory (Off),
 * so this is the site's ordinary 404, not an empty directory: no talent
 * wording, matching the head's not-found title. The route owns `<main>`, so
 * the shared page frame supplies the landmark the root shell leaves out.
 */
export function TalentDirectoryNotFound() {
  return (
    <Page width="wide">
      <PageContent>
        <NotFound />
      </PageContent>
    </Page>
  );
}
