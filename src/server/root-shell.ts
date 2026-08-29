import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { failClosedJobRecommendations } from '../board/board-feature-flags';
import { resolveSubscriptionEntryVisible } from '../lib/subscription-entry';
import { getSessionUser } from './account';
import { listCompanies } from './employers';
import { getAccessGrant } from './paywall';
import { getDataSourceFacts, resolvePreviewStateForViewer } from './preview';
import {
  getBoardSeo,
  getEmployerOfferGate,
  getFreshBoardContext,
  getStaleBoardContext,
} from './queries';
import { EMPTY_GRANT, getTalentAccessGrant } from './talent-access';

/**
 * Public root shell only — board identity, SEO, footer gate.
 *
 * Fully viewer-anonymous: the document must render byte-identically for
 * consented and undecided visitors so the edge cache can reuse one copy.
 * Consent is resolved client-side after paint (CookieConsentProvider).
 *
 * Session / employer / paywall / preview used to fan out here on EVERY request
 * (including cold anonymous SEO hits). Those are not needed to paint public
 * chrome: they resolve client-side via `getRootSessionShellData` after first
 * paint (hard-refresh signed-in users may see a brief Sign-in → account swap;
 * soft navs keep session state in the root tree).
 */
export const getRootShellData = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [board, seo, offerGate] = await Promise.all([
      getFreshBoardContext().catch(async () => {
        const cached = await getStaleBoardContext();
        return {
          ...cached,
          features: failClosedJobRecommendations(cached.features),
        };
      }),
      // seo() 503s when the pk_ has no registered public origin (local
      // unpublished API). Ads.txt / IndexNow / GSC must not 500 the shell.
      getBoardSeo().catch(() => ({
        adsTxt: null,
        indexNowKey: null,
        googleSiteVerification: null,
        canonicalBase: '',
        manifest: { name: '' },
      })),
      getEmployerOfferGate(),
    ]);

    return {
      // This deployment's own origin — hreflang alternates and localized
      // self-canonicals reference THIS site, not the hosted board.
      origin: new URL(getRequest().url).origin,
      board,
      seo,
      offerGate,
    };
  },
);

/**
 * Session-dependent shell fields. Called once from the client after hydrate;
 * not on the public SSR critical path.
 */
export const getRootSessionShellData = createServerFn({
  method: 'GET',
}).handler(async () => {
  const userPromise = getSessionUser();
  const [user, employerCompanies, preview, hasGrant, talentAccess] =
    await Promise.all([
      userPromise,
      listCompanies()
        .then((memberships) => memberships.data)
        .catch(() => null),
      userPromise
        .then((user) => resolvePreviewStateForViewer(user?.email ?? null))
        .catch(async () => {
          const facts = await getDataSourceFacts().catch(() => ({
            demoConfigured: false,
            demoBoardPrivate: false,
            dataSource: 'board' as const,
          }));
          return {
            capability: {
              canPreview: false as const,
              reason: 'not-sandbox' as const,
            },
            personas: [],
            activePersonaId: null,
            ...facts,
          };
        }),
      getAccessGrant()
        .then((grant) => grant.hasAccess)
        .catch(() => false),
      getTalentAccessGrant().catch(() => EMPTY_GRANT),
    ]);

  return {
    user,
    employerCompanies,
    preview,
    hasGrant,
    talentAccess,
  };
});

/** Combine public board flags with the session grant bit. */
export function resolveRootHasAccessGrant(
  candidatePaywall: boolean,
  hasGrant: boolean,
) {
  return resolveSubscriptionEntryVisible(candidatePaywall, hasGrant);
}
