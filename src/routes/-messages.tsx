import { isRedirect, notFound, redirect } from '@tanstack/react-router';

import { mergeAuthConversionSearch } from '@/lib/board-datalayer-events';

import type { MessagesView } from './-messages-controller';
import { getBlocked, getInbox } from '@/server/messaging';
import { getBoardContext, getSeoBase } from '@/server/queries';

export type MessagesLoaderDependencies = {
  getBlocked: typeof getBlocked;
  getBoardContext: () => Promise<{ features: { messaging: boolean } }>;
  getInbox: typeof getInbox;
  getSeoBase: () => Promise<{ boardName: string }>;
};

export function createMessagesLoader(
  dependencies: MessagesLoaderDependencies = {
    getBlocked,
    getBoardContext,
    getInbox,
    getSeoBase,
  },
) {
  return async ({
    deps,
    location,
  }: {
    deps: { view: MessagesView };
    location?: { search?: Record<string, unknown>; searchStr?: string; href?: string };
  }) => {
    // Messaging feature off ⇒ the surface does not exist on this board.
    // The gate read and the SEO base do not depend on each other, so they
    // share one wave (the inbox read stays behind the gate — it is the call
    // that 403s on a board without messaging).
    const [board, seo] = await Promise.all([
      dependencies.getBoardContext(),
      dependencies.getSeoBase(),
    ]);
    if (!board.features.messaging) throw notFound();
    try {
      if (deps.view === 'blocked') {
        return {
          view: 'blocked' as const,
          blocked: await dependencies.getBlocked(),
          seo,
        };
      }
      return {
        view: deps.view,
        inbox: await dependencies.getInbox({
          data: { archived: deps.view === 'archived' },
        }),
        seo,
      };
    } catch (error) {
      if (isRedirect(error)) throw error;
      const returnTo =
        deps.view === 'inbox' ? '/messages' : `/messages?view=${deps.view}`;
      if (String(error).includes('EMAIL_UNVERIFIED')) {
        throw redirect({
          to: '/auth/verify-email-required',
          search: mergeAuthConversionSearch(
            { returnTo },
            location?.searchStr ?? location?.search ?? location?.href,
          ),
        });
      }
      throw redirect({ to: '/auth/sign-in', search: { returnTo } });
    }
  };
}
