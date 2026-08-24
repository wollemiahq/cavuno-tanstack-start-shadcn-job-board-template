import { isRedirect, notFound, redirect } from '@tanstack/react-router';

import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { getInbox, getThread } from '@/server/messaging';
import { getBoardContext, getSeoBase } from '@/server/queries';

export type ConversationLoaderDependencies = {
  getBoardContext: () => Promise<{ features: { messaging: boolean } }>;
  getInbox: typeof getInbox;
  getSeoBase: () => Promise<{ boardName: string }>;
  getThread: typeof getThread;
};

export function createConversationLoader(
  dependencies: ConversationLoaderDependencies = {
    getBoardContext,
    getInbox,
    getSeoBase,
    getThread,
  },
) {
  return async ({
    params,
    deps,
  }: {
    params: { conversationId: string };
    deps: { view: 'inbox' | 'archived' };
  }) => {
    // Messaging feature off ⇒ the surface does not exist on this board.
    const board = await dependencies.getBoardContext();
    if (!board.features.messaging) throw notFound();
    const returnTo = `/messages/${encodeURIComponent(params.conversationId)}${
      deps.view === 'archived' ? '?view=archived' : ''
    }`;
    try {
      const [thread, inbox, seo] = await Promise.all([
        dependencies.getThread({ data: { id: params.conversationId } }),
        dependencies.getInbox({ data: { archived: deps.view === 'archived' } }),
        // Was `seo: await getSeoBase()` in the return — a second serial wave
        // hidden in an object literal.
        dependencies.getSeoBase(),
      ]);
      return { ...thread, inbox, view: deps.view, seo };
    } catch (error) {
      if (isRedirect(error)) throw error;
      const authFailure = candidateLoaderError(error);
      if (authFailure === 'email-unverified') {
        throw redirect({
          to: '/auth/verify-email-required',
          search: { returnTo },
        });
      }
      if (authFailure === 'unauthenticated') {
        throw redirect({ to: '/auth/sign-in', search: { returnTo } });
      }
      throw redirect({
        to: '/messages',
        search: deps.view === 'archived' ? { view: 'archived' } : {},
      });
    }
  };
}
