import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { failClosedJobRecommendations } from '../board/board-feature-flags';
import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import {
  getDataSource,
  isDemoBoardConfigured,
  isDemoBoardPrivate,
} from '../lib/data-source.server';
import { getServerEnv } from '../lib/env';
import { resolveSubscriptionEntryVisible } from '../lib/subscription-entry';
import { resolvePreviewStateForViewer } from './preview';
import {
  getBoardSeo,
  getEmployerOfferGate,
  getFreshBoardContext,
  getStaleBoardContext,
} from './queries';
import { EMPTY_GRANT } from './talent-access';

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
      // Public publishable key (pk_…) — same credential Board API + analytics.
      publishableKey: getServerEnv().board,
      board,
      seo,
      offerGate,
    };
  },
);

function previewFallback() {
  return {
    capability: {
      canPreview: false as const,
      reason: 'not-sandbox' as const,
    },
    personas: [],
    activePersonaId: null,
    demoConfigured: isDemoBoardConfigured(),
    demoBoardPrivate: isDemoBoardPrivate(),
    dataSource: getDataSource(),
  };
}

/**
 * Viewer identity for signed-in chrome. Memberships and entitlements follow in
 * separate RPCs so Account is not blocked on companies / paywall / preview.
 */
export const getRootSessionShellData = createServerFn({
  method: 'GET',
})
  .middleware([boardAccessMiddleware])
  .handler(async ({ context }) => {
    const headers = context.boardAccessHeaders;
    if (!context.session) {
      return { user: null };
    }
    try {
      return {
        user: await getBoard().me.retrieve(undefined, { headers }),
      };
    } catch {
      return { user: null };
    }
  });

/** Preview toolbar, candidate paywall grant, and talent-access — after chrome. */
export const getRootSessionEntitlements = createServerFn({
  method: 'GET',
})
  .middleware([boardAccessMiddleware])
  .handler(async ({ context }) => {
    const headers = context.boardAccessHeaders;
    if (!context.session) {
      return {
        preview: await resolvePreviewStateForViewer(null).catch(previewFallback),
        hasGrant: false,
        talentAccess: EMPTY_GRANT,
      };
    }

    let email: string | null = null;
    let emailVerified = false;
    try {
      const user = await getBoard().me.retrieve(undefined, { headers });
      email = user.email ?? null;
      emailVerified = user.emailVerified;
    } catch {
      return {
        preview: await resolvePreviewStateForViewer(null).catch(previewFallback),
        hasGrant: false,
        talentAccess: EMPTY_GRANT,
      };
    }

    const [preview, hasGrant, talentAccess] = await Promise.all([
      resolvePreviewStateForViewer(email).catch(previewFallback),
      emailVerified
        ? getBoard()
            .me.access.grant({ headers })
            .then((grant) => grant.hasAccess)
            .catch(() => false)
        : Promise.resolve(false),
      getBoard()
        .me.talentAccess.retrieve({ headers })
        .catch(() => EMPTY_GRANT),
    ]);

    return { preview, hasGrant, talentAccess };
  });

/** Combine public board flags with the session grant bit. */
export function resolveRootHasAccessGrant(
  candidatePaywall: boolean,
  hasGrant: boolean,
) {
  return resolveSubscriptionEntryVisible(candidatePaywall, hasGrant);
}
