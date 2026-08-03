import { createServerFn } from '@tanstack/react-start';

import { resolveSubscriptionEntryVisible } from '../lib/subscription-entry';
import { getSessionUser } from './account';
import { listCompanies } from './employers';
import { getAccessGrant } from './paywall';
import { getDataSourceFacts, getPreviewState } from './preview';
import { getBoardContext, getBoardSeo, getEmployerOfferGate } from './queries';

/**
 * One root-shell RPC boundary keeps the unsplittable root route from importing
 * every account, employer, preview, paywall, and board-query entry point. The
 * independent reads still fan out on the server exactly as before.
 */
export const getRootShellData = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [board, user, seo, offerGate, employerCompanies, preview, hasGrant] =
      await Promise.all([
        getBoardContext(),
        getSessionUser(),
        getBoardSeo(),
        getEmployerOfferGate(),
        listCompanies()
          .then((memberships) => memberships.data)
          .catch(() => null),
        getPreviewState().catch(async () => {
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
            ...facts,
          };
        }),
        getAccessGrant()
          .then((grant) => grant.hasAccess)
          .catch(() => false),
      ]);

    return {
      board,
      user,
      seo,
      offerGate,
      employerCompanies,
      preview,
      hasAccessGrant: resolveSubscriptionEntryVisible(
        board.features.candidatePaywall,
        hasGrant,
      ),
    };
  },
);
