import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BoardAccessContext } from '../lib/board-access-middleware';

const mocks = vi.hoisted(() => {
  const authHeaders: Record<string, string> = {};
  return { fetch: vi.fn(), authHeaders };
});
/** Replace the session headers the middleware would put on the context. */
function setAuthHeaders(headers: Record<string, string>) {
  for (const key of Object.keys(mocks.authHeaders))
    delete mocks.authHeaders[key];
  Object.assign(mocks.authHeaders, headers);
}
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const chain = {
      validator: () => chain,
      middleware: () => chain,
      handler:
        <TData, TResult>(
          handler: (input: { data: TData; context: unknown }) => TResult,
        ) =>
        (input: { data: TData }) =>
          handler({
            data: input.data,
            context: {
              authHeaders: mocks.authHeaders,
              boardAccessHeaders: { 'x-board-access': 'grant' },
            },
          }),
    };
    return chain;
  },
  createServerOnlyFn: <T>(fn: T) => fn,
}));
vi.mock('../lib/board', () => ({
  getBoard: () => ({ client: { fetch: mocks.fetch } }),
}));
vi.mock('../lib/board-access-middleware', () => ({
  boardAccessMiddleware: {},
}));
vi.mock('../lib/session-middleware', () => ({ sessionMiddleware: {} }));
vi.mock('./board-access', () => ({
  gatedRead: <T>(
    context: BoardAccessContext,
    read: (headers: Record<string, string>) => Promise<T>,
  ) => read(context.boardAccessHeaders),
}));
import { submitContact } from './contact';

const data = {
  name: 'Ada',
  email: 'ada@example.com',
  subject: 'Hello',
  body: 'Hello',
  requestId: '123e4567-e89b-42d3-a456-426614174000',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetch.mockImplementation(
    (_path: string, options?: { method?: string }) =>
      Promise.resolve(
        options?.method === 'POST'
          ? { object: 'contact_submission', success: true }
          : { object: 'board_contact', enabled: true, boardName: 'Board' },
      ),
  );
});

function postHeaders() {
  const post = mocks.fetch.mock.calls.find(
    ([, options]) => options?.method === 'POST',
  );
  return post?.[1].headers;
}

describe('submitContact', () => {
  it('sends a signed-in visitor their session with the board access grant', async () => {
    setAuthHeaders({ Authorization: 'Bearer access-token' });
    await expect(submitContact({ data })).resolves.toMatchObject({ ok: true });
    expect(postHeaders()).toEqual({
      Authorization: 'Bearer access-token',
      'x-board-access': 'grant',
    });
  });

  it('sends a signed-out visitor as a guest', async () => {
    setAuthHeaders({});
    await expect(submitContact({ data })).resolves.toMatchObject({ ok: true });
    expect(postHeaders()).toEqual({ 'x-board-access': 'grant' });
  });
});
