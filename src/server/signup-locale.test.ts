import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  locale: 'de',
  register: vi.fn(),
  consume: vi.fn(),
  subscribe: vi.fn(),
}));
vi.mock('@tanstack/react-start', async (original) => ({
  ...(await original<typeof import('@tanstack/react-start')>()),
  createServerFn: () => {
    const chain = {
      validator: () => chain,
      middleware: () => chain,
      handler:
        <TData, TResult>(handler: (input: { data: TData }) => TResult) =>
        (input: { data: TData }) =>
          handler(input),
    };
    return chain;
  },
}));
vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeader: () => '',
  appendResponseHeader: vi.fn(),
}));
vi.mock('cloudflare:workers', () => ({ waitUntil: vi.fn() }));
vi.mock('../paraglide/runtime', async (original) => ({
  ...(await original<typeof import('../paraglide/runtime')>()),
  getLocale: () => mocks.locale,
}));
vi.mock('../lib/board', () => ({
  getBoard: () => ({
    auth: { register: mocks.register, consumeMagicLink: mocks.consume },
    jobAlerts: { subscribe: mocks.subscribe },
  }),
}));
vi.mock('../lib/data-source.server', async (original) => ({
  ...(await original<typeof import('../lib/data-source.server')>()),
  persistAuthSession: vi.fn(),
}));
vi.mock('../lib/session-middleware', () => ({ sessionMiddleware: {} }));
vi.mock('../lib/board-access-middleware', () => ({
  boardAccessMiddleware: {},
}));

import { consumeMagicLink, signUp, signUpEmployer } from './auth';
import { subscribeJobAlert } from './queries';

const session = {
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
  boardUser: { email: 'a@example.test' },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.register.mockResolvedValue(session);
  mocks.consume.mockResolvedValue(session);
  mocks.subscribe.mockResolvedValue({ status: 'pending' });
});

describe('sign-ups carry the page language', () => {
  const account = {
    email: 'a@example.test',
    password: 'fixture-password',
    displayName: 'Fixture',
  };

  it('sends the request locale on registration, over any client value', async () => {
    const withClientLocale = { ...account, locale: 'fr' };
    await signUp({ data: withClientLocale });
    await signUpEmployer({ data: account });
    expect(mocks.register).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ role: 'candidate', locale: 'de' }),
    );
    expect(mocks.register).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ role: 'employer', locale: 'de' }),
    );
  });

  it('sends the request locale when a magic link signs someone in', async () => {
    await consumeMagicLink({
      data: { token: 'valid-link', confirmed: true },
    });
    expect(mocks.consume).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'de' }),
    );
  });

  it('sends the request locale on a job alert subscription', async () => {
    await subscribeJobAlert({
      data: { email: 'a@example.test', consent: true },
    });
    expect(mocks.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@example.test', locale: 'de' }),
    );
  });
});
