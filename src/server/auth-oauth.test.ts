import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookie: '',
  append: vi.fn(),
  authorize: vi.fn(),
  exchange: vi.fn(),
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
      getOAuthAuthorizationUrl: mocks.authorize,
      exchangeOAuth: mocks.exchange,
    },
  }),
}));
vi.mock('../lib/data-source.server', () => ({
  persistAuthSession: mocks.persist,
}));
vi.mock('../lib/session-middleware', () => ({ sessionMiddleware: {} }));
import { exchangeOAuth, getOAuthAuthorizationUrl } from './auth';

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

function setCookie(name: string) {
  const header = mocks.append.mock.calls
    .map(([, value]) => String(value))
    .find((value) => value.startsWith(`${name}=`));
  return header?.slice(name.length + 1).split(';')[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookie = '';
  mocks.authorize.mockResolvedValue({
    authorizeUrl: 'https://accounts.example.test/authorize',
  });
  mocks.exchange.mockResolvedValue({
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresAt: 1,
    boardUser: { email: 'a@example.test' },
  });
});

describe('OAuth browser-binding proof', () => {
  it('sends only the hash of a cookie-held secret, then proves it at exchange', async () => {
    await getOAuthAuthorizationUrl({
      data: { provider: 'google', returnTo: '/account' },
    });
    const [, query] = mocks.authorize.mock.calls[0];
    const secret = setCookie('__Host-cavuno-oauth-proof');
    const binding = setCookie('__Host-cavuno-oauth-browser');
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
    expect(query.browserBindingHash).toBe(await sha256Hex(secret!));
    expect(query.returnTo).not.toContain(secret);
    expect(
      mocks.append.mock.calls.find(([, value]) =>
        String(value).startsWith('__Host-cavuno-oauth-proof='),
      )?.[1],
    ).toContain('HttpOnly; Secure; SameSite=Lax');

    mocks.append.mockClear();
    mocks.cookie = `__Host-cavuno-oauth-browser=${binding}; __Host-cavuno-oauth-proof=${secret}`;
    const result = await exchangeOAuth({
      data: { token: 'one-time', browserBinding: binding },
    });
    expect(result.ok).toBe(true);
    expect(mocks.exchange).toHaveBeenCalledWith({
      token: 'one-time',
      browserBinding: secret,
    });
    expect(mocks.append).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringMatching(/^__Host-cavuno-oauth-proof=;.*Max-Age=0$/),
    );
  });
});
