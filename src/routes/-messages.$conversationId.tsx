import { isRedirect, notFound, redirect } from '@tanstack/react-router';

import {
  incomingAuthSearch,
  mergeAuthConversionSearch,
} from '@/lib/board-datalayer-events';
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
    location,
  }: {
    params: { conversationId: string };
    deps: { view: 'inbox' | 'archived' };
    location?: {
      search?: Record<string, unknown>;
      searchStr?: string;
      href?: string;
    };
  }) => {
    // Messaging feature off ⇒ the surface does not exist on this board.
    const board = await dependencies.getBoardContext();
    if (!board.features.messaging) throw notFound();
    const returnTo = `/messages/${encodeURIComponent(params.conversationId)}${
      deps.view === 'archived' ? '?view=archived' : ''
    }`;

    const redirectAuthFailure = <T,>(error: T) => {
      if (isRedirect(error)) throw error;
      const authFailure = candidateLoaderError(error);
      if (authFailure === 'email-unverified') {
        throw redirect({
          to: '/auth/verify-email-required',
          search: mergeAuthConversionSearch(
            { returnTo },
            incomingAuthSearch(location),
          ),
        });
      }
      if (authFailure === 'unauthenticated') {
        throw redirect({ to: '/auth/sign-in', search: { returnTo } });
      }
    };

    // Start all reads together, but handle the thread independently: a
    // transient failure belongs in the selected pane and must not erase the
    // conversation URL or the otherwise healthy inbox.
    const threadPromise = dependencies
      .getThread({ data: { id: params.conversationId } })
      .then(
        (thread) => ({ ok: true as const, thread }),
        (error) => ({ ok: false as const, error }),
      );
    const inboxPromise = dependencies.getInbox({
      data: { archived: deps.view === 'archived' },
    });
    const seoPromise = dependencies.getSeoBase();

    let support: [
      Awaited<ReturnType<ConversationLoaderDependencies['getInbox']>>,
      Awaited<ReturnType<ConversationLoaderDependencies['getSeoBase']>>,
    ];
    try {
      support = await Promise.all([inboxPromise, seoPromise]);
    } catch (error) {
      redirectAuthFailure(error);
      throw error;
    }

    const [inbox, seo] = support;
    const threadResult = await threadPromise;
    if (threadResult.ok) {
      const thread = threadResult.thread;
      return {
        status: 'ready' as const,
        ...thread,
        inbox,
        view: deps.view,
        seo,
      };
    }

    redirectAuthFailure(threadResult.error);
    return {
      status: 'error' as const,
      conversationId: params.conversationId,
      inbox,
      view: deps.view,
      seo,
    };
  };
}
