import { BoardApiError } from '@cavuno/board';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
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
vi.mock('@tanstack/react-start/server', async (original) => ({
  ...(await original<typeof import('@tanstack/react-start/server')>()),
  getRequestHeader: () => '',
  appendResponseHeader: vi.fn(),
}));
vi.mock('cloudflare:workers', () => ({ waitUntil: vi.fn() }));
vi.mock('../lib/board', async (original) => ({
  ...(await original<typeof import('../lib/board')>()),
  getBoard: () => ({
    auth: { register: mocks.register },
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

import { signUp } from './auth';
import { subscribeJobAlert } from './queries';

function refusal(details: { field: string; suggestion?: string }) {
  return new BoardApiError({
    status: 422,
    code: 'email_domain_undeliverable',
    message: 'No email can reach gmial.con.',
    details,
    raw: null,
  });
}

const signUpInput = {
  email: 'ada@gmial.con',
  password: 'correct-horse',
  displayName: 'Ada',
};

beforeEach(() => vi.clearAllMocks());

describe('a refused email domain', () => {
  it('reaches the job alert form as a result with the correction', async () => {
    mocks.subscribe.mockRejectedValue(
      refusal({ field: 'email', suggestion: 'ada@gmail.com' }),
    );
    await expect(
      subscribeJobAlert({
        data: { email: 'ada@gmial.con', consent: true, frequency: 'weekly' },
      }),
    ).resolves.toEqual({
      status: 'email_domain_undeliverable',
      suggestion: 'ada@gmail.com',
    });
  });

  it('still throws any other job alert failure', async () => {
    mocks.subscribe.mockRejectedValue(
      new BoardApiError({
        status: 429,
        code: 'rate_limited',
        message: 'Slow down.',
        raw: null,
      }),
    );
    await expect(
      subscribeJobAlert({
        data: { email: 'ada@gmail.com', consent: true, frequency: 'weekly' },
      }),
    ).rejects.toMatchObject({ code: 'rate_limited' });
  });

  it('reaches sign-up with the correction, or without one when the API has none', async () => {
    mocks.register.mockRejectedValueOnce(
      refusal({ field: 'email', suggestion: 'ada@gmail.com' }),
    );
    await expect(signUp({ data: signUpInput })).resolves.toMatchObject({
      ok: false,
      code: 'email_domain_undeliverable',
      suggestion: 'ada@gmail.com',
    });

    mocks.register.mockRejectedValueOnce(refusal({ field: 'email' }));
    const result = await signUp({ data: signUpInput });
    expect(result).toMatchObject({ code: 'email_domain_undeliverable' });
    expect(result).not.toHaveProperty('suggestion');
  });
});
