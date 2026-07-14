/**
 * Authenticated server functions — the `/messages` surface (board-to-board
 * messaging, doc 34 / ADR-0053). Transport is POLLED REST: the routes poll
 * the read fns on an interval (see `use-visible-poll`), the API stays
 * stateless. Auth is enforced here per function via the session middleware,
 * plus the board-access grant so a password-protected board answers.
 *
 * Reads are `gatedRead`-wrapped (a walled board redirects to `/password`).
 * Writes are merge-only (the grant is already established by page load) and
 * verify-gated (only a verified board user may send).
 */
import { createServerFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import {
  boardAccessMiddleware,
  type BoardAccessContext,
} from '../lib/board-access-middleware';
import {
  requireSessionMiddleware,
  type SessionContext,
} from '../lib/session-middleware';
import { gatedRead } from './board-access';

import type {
  BlockUserBody,
  EditMessageBody,
  ReplyBody,
  ReportBody,
  StartConversationBody,
} from '@cavuno/board';

/** Bearer + board-access grant for one gated `/me/*` call. */
function authedHeaders(
  context: SessionContext & BoardAccessContext,
): Record<string, string> {
  return { ...context.authHeaders, ...context.boardAccessHeaders };
}

async function requireVerifiedBoardUser(headers: Record<string, string>) {
  const me = await getBoard().me.retrieve(undefined, { headers });
  if (!me.emailVerified) {
    throw new Error('EMAIL_UNVERIFIED');
  }
  return me;
}

// ── Reads (polled) ───────────────────────────────────────────────────────

/** The inbox (or archived view) — one page of conversations. Unread is polled
 * separately by the nav badge (`getUnreadCount`), so it's not fetched here. */
export const getInbox = createServerFn({ method: 'GET' })
  .validator(
    (input: { archived?: boolean; cursor?: string } | undefined) => input,
  )
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (access) => {
      const conversations = await getBoard().me.conversations.list(
        { archived: data?.archived, cursor: data?.cursor, limit: 20 },
        { headers: { ...context.authHeaders, ...access } },
      );
      return { conversations };
    }),
  );

/** Just the unread count — polled by the nav badge without the list payload. */
export const getUnreadCount = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, (access) =>
      getBoard().me.conversations.unreadCount({
        headers: { ...context.authHeaders, ...access },
      }),
    ),
  );

/** The users the viewer has blocked. */
export const getBlocked = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, (access) =>
      getBoard().me.blocks.list({
        headers: { ...context.authHeaders, ...access },
      }),
    ),
  );

/** One thread: the conversation header, its messages, and the block status. */
export const getThread = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (access) => {
      const board = getBoard();
      const headers = { ...context.authHeaders, ...access };
      const conversation = await board.me.conversations.retrieve(data.id, {
        headers,
      });
      const [messages, blockStatus] = await Promise.all([
        board.me.conversations.listMessages(
          data.id,
          { limit: 200 },
          { headers },
        ),
        board.me.blocks.status(conversation.counterparty.boardUserId, {
          headers,
        }),
      ]);
      return { conversation, messages, blockStatus };
    }),
  );

// ── Writes (merge-only, verify-gated) ──────────────────────────────────────

export const sendReply = createServerFn({ method: 'POST' })
  .validator((input: { id: string; body: ReplyBody }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.conversations.reply(data.id, data.body, { headers });
  });

export const startConversation = createServerFn({ method: 'POST' })
  .validator((input: StartConversationBody) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.conversations.start(data, { headers });
  });

export const markRead = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ data, context }) =>
    getBoard().me.conversations.markRead(data.id, {
      headers: authedHeaders(context),
    }),
  );

export const archiveConversation = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ data, context }) =>
    getBoard().me.conversations.archive(data.id, {
      headers: authedHeaders(context),
    }),
  );

export const unarchiveConversation = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ data, context }) =>
    getBoard().me.conversations.unarchive(data.id, {
      headers: authedHeaders(context),
    }),
  );

export const editMessage = createServerFn({ method: 'POST' })
  .validator((input: { id: string; body: EditMessageBody }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.messages.edit(data.id, data.body, { headers });
  });

export const unsendMessage = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ data, context }) =>
    getBoard().me.messages.unsend(data.id, { headers: authedHeaders(context) }),
  );

export const reportMessage = createServerFn({ method: 'POST' })
  .validator((input: { id: string; body: ReportBody }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.messages.report(data.id, data.body, { headers });
  });

export const blockUser = createServerFn({ method: 'POST' })
  .validator((input: BlockUserBody) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ data, context }) =>
    getBoard().me.blocks.create(data, { headers: authedHeaders(context) }),
  );

export const unblockUser = createServerFn({ method: 'POST' })
  .validator((input: { boardUserId: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ data, context }) =>
    getBoard().me.blocks.remove(data.boardUserId, {
      headers: authedHeaders(context),
    }),
  );
