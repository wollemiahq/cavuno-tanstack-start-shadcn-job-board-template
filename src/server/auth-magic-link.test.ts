import { beforeEach, describe, expect, it, vi } from 'vitest';

import { magicLinkIntentCookie } from '../lib/magic-link-intent';

const mocks = vi.hoisted(() => ({
  cookie: '',
  append: vi.fn(),
  request: vi.fn(),
  consume: vi.fn(),
  logout: vi.fn(),
  persist: vi.fn(),
}));
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const chain = {
      validator: () => chain,
      middleware: () => chain,
      handler:
        <TData, TResult>(
          handler: (input: { data: TData | undefined }) => TResult,
        ) =>
        (input?: { data: TData }) =>
          handler({ data: input?.data }),
    };
    return chain;
  },
}));
vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeader: () => mocks.cookie,
  appendResponseHeader: mocks.append,
}));
vi.mock('cloudflare:workers', () => ({ waitUntil: vi.fn() }));
vi.mock('../lib/board', () => ({
  getBoard: () => ({
    auth: {
      requestMagicLink: mocks.request,
      consumeMagicLink: mocks.consume,
      logout: mocks.logout,
    },
  }),
}));
vi.mock('../lib/data-source.server', () => ({
  persistAuthSession: mocks.persist,
}));
vi.mock('../lib/session-middleware', () => ({ sessionMiddleware: {} }));
import { consumeMagicLink, getAuthFlowState, requestMagicLink } from './auth';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookie = '';
  mocks.request.mockResolvedValue(undefined);
  mocks.logout.mockResolvedValue(undefined);
  mocks.consume.mockResolvedValue({
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresAt: 1,
    boardUser: { email: 'a@example.test' },
  });
});

describe('magic-link request binding', () => {
  it('leaves an older link unconsumed after this browser requests another account', async () => {
    mocks.cookie = `${await magicLinkIntentCookie('b@example.test')}; __Host-cavuno-magic-browser=request-b`;
    const result = await consumeMagicLink({
      data: {
        token: 'valid-link-a',
        browserBinding: 'request-a',
        confirmed: false,
      },
    });
    expect(result.ok).toBe(false);
    expect(mocks.consume).not.toHaveBeenCalled();
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it('only marks the current request automatic, while older and unbound links need confirmation', async () => {
    mocks.cookie = `${await magicLinkIntentCookie('a@example.test')}; __Host-cavuno-magic-browser=request-b`;
    expect(
      await getAuthFlowState({ data: { magicLinkBinding: 'request-b' } }),
    ).toMatchObject({ 'magic-link-requested': true });
    expect(
      await getAuthFlowState({ data: { magicLinkBinding: 'request-a' } }),
    ).toMatchObject({ 'magic-link-requested': false });
    expect(await getAuthFlowState()).toMatchObject({
      'magic-link-requested': false,
    });
  });

  it('puts the same random request binding in the email return path and a private cookie', async () => {
    await requestMagicLink({
      data: { email: 'a@example.test', returnTo: '/jobs?q=robotics#results' },
    });
    const requested = mocks.request.mock.calls[0][0];
    const returnTo = new URL(requested.returnTo, 'https://board.invalid');
    const binding = returnTo.searchParams.get('cavuno_magic_binding');
    expect(binding).toBeTruthy();
    expect(returnTo.pathname).toBe('/jobs');
    expect(returnTo.searchParams.get('q')).toBe('robotics');
    expect(returnTo.hash).toBe('#results');
    expect(mocks.append).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining(
        `__Host-cavuno-magic-browser=${binding}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
      ),
    );
  });

  it('automatically exchanges the matching request and clears its browser cookies', async () => {
    mocks.cookie = `${await magicLinkIntentCookie('a@example.test')}; __Host-cavuno-magic-browser=request-a`;
    expect(
      await consumeMagicLink({
        data: {
          token: 'valid-link-a',
          browserBinding: 'request-a',
          confirmed: false,
        },
      }),
    ).toMatchObject({ ok: true });
    expect(mocks.consume).toHaveBeenCalledWith({ token: 'valid-link-a' });
    expect(mocks.persist).toHaveBeenCalledOnce();
    expect(mocks.append).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining(
        '__Host-cavuno-magic-browser=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
      ),
    );
  });

  it('still rejects and revokes a returned account that disagrees with the requested email', async () => {
    mocks.cookie = `${await magicLinkIntentCookie('b@example.test')}; __Host-cavuno-magic-browser=request-a`;
    expect(
      await consumeMagicLink({
        data: {
          token: 'valid-link-a',
          browserBinding: 'request-a',
          confirmed: false,
        },
      }),
    ).toMatchObject({ ok: false });
    expect(mocks.consume).toHaveBeenCalledOnce();
    expect(mocks.logout).toHaveBeenCalledWith({ refreshToken: 'refresh' });
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it('exchanges an older or unbound link after explicit confirmation', async () => {
    mocks.cookie = `${await magicLinkIntentCookie('b@example.test')}; __Host-cavuno-magic-browser=request-b`;
    expect(
      await consumeMagicLink({
        data: { token: 'valid-link-a', confirmed: true },
      }),
    ).toMatchObject({ ok: true });
    expect(mocks.persist).toHaveBeenCalledOnce();
  });
});
