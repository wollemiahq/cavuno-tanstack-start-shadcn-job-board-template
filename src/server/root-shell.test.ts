import { getRequest } from '@tanstack/react-start/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getBoardSeo,
  getEmployerOfferGate,
  getFreshBoardContext,
} from './queries';
import { getRootShellData } from './root-shell';

/**
 * The public root loader must stay viewer-anonymous: consent is resolved
 * client-side so edge-cached HTML is byte-identical for consented and
 * undecided visitors.
 */

vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-start')>();
  const builder = () => {
    const chain = {
      middleware: () => chain,
      validator: () => chain,
      inputValidator: () => chain,
      handler: <T extends (...args: never[]) => unknown>(fn: T) => fn,
    };
    return chain;
  };
  return { ...actual, createServerFn: builder };
});

vi.mock('@tanstack/react-start/server', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-start/server')>();
  return {
    ...actual,
    getRequest: vi.fn(),
  };
});

vi.mock('./queries', () => ({
  getFreshBoardContext: vi.fn(),
  getStaleBoardContext: vi.fn(),
  getBoardSeo: vi.fn(),
  getEmployerOfferGate: vi.fn(),
}));

const board = { name: 'Test Board', features: {} };
const seo = { adsTxt: null };
const offerGate = { hasEmployerOfferPage: false };

beforeEach(() => {
  vi.mocked(getFreshBoardContext).mockResolvedValue(board as never);
  vi.mocked(getBoardSeo).mockResolvedValue(seo as never);
  vi.mocked(getEmployerOfferGate).mockResolvedValue(offerGate);
});

async function invoke(cookie: string | null) {
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  vi.mocked(getRequest).mockReturnValue(
    new Request('https://board.test/', { headers }),
  );
  return getRootShellData();
}

describe('getRootShellData', () => {
  it('payload has no consentChoice and ignores request cookies', async () => {
    const cookieless = await invoke(null);
    const withCookies = await invoke(
      'cavuno_cookie_consent=accepted; __Host-cavuno_board_session=secret',
    );

    expect(cookieless).not.toHaveProperty('consentChoice');
    expect(withCookies).not.toHaveProperty('consentChoice');
    expect(withCookies).toEqual(cookieless);
    expect(cookieless).toEqual({
      origin: 'https://board.test',
      board,
      seo,
      offerGate,
    });
  });
});
