import { BoardApiError } from '@cavuno/board';
import {
  defaultParseSearch,
  defaultStringifySearch,
  isNotFound,
} from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  setHeader: vi.fn(),
}));
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const chain = {
      validator: () => chain,
      middleware: () => chain,
      handler:
        <TData, TResult>(
          handler: (input: {
            data: TData;
            context: { boardAccessHeaders: Record<string, string> };
          }) => TResult,
        ) =>
        (input: { data: TData }): TResult =>
          handler({
            data: input.data,
            context: { boardAccessHeaders: { authorization: 'Bearer at' } },
          }),
    };
    return chain;
  },
}));
vi.mock('@tanstack/react-start/server', () => ({
  setResponseHeader: mocks.setHeader,
}));
vi.mock('../lib/board', () => ({
  getBoard: () => ({ client: { fetch: mocks.fetch } }),
}));
vi.mock('../lib/board-access-middleware', () => ({
  boardAccessMiddleware: {},
}));
vi.mock('./board-access', () => ({
  gatedRead: <T>(
    context: { boardAccessHeaders: Record<string, string> },
    read: (headers: Record<string, string>) => Promise<T>,
  ) => read(context.boardAccessHeaders),
}));

import { mcpAuthorizeRedirect } from '../lib/mcp-authorize-query';
import { decideMcpConsent, getMcpConsentStep } from './mcp-consent';

beforeEach(() => vi.clearAllMocks());

describe('getMcpConsentStep', () => {
  it('sends the Board API the query the assistant sent', async () => {
    mocks.fetch.mockResolvedValue({ next: 'error', message: 'x' });
    // Values the router would change: `1e3` becomes `1000`.
    const raw = '?client_id=a&state=1e3&scope=a+b&n=12345678901234567890';
    const routerCopy = (search: string) =>
      defaultStringifySearch(defaultParseSearch(search));
    expect(routerCopy(raw)).not.toBe(raw);

    const redirect = mcpAuthorizeRedirect(
      new Request(`https://board.test/oauth/authorize${raw}`),
    );
    expect(redirect?.status).toBe(307);
    const kept = new URL(
      redirect?.headers.get('location') ?? '',
      'https://board.test',
    );
    expect(kept.pathname).toBe('/oauth/authorize');
    await getMcpConsentStep({ data: { search: routerCopy(kept.search) } });

    expect(mocks.fetch).toHaveBeenCalledWith(`/mcp/consent${raw}`, {
      headers: { authorization: 'Bearer at' },
    });
    expect(mocks.setHeader).toHaveBeenCalledWith(
      'cache-control',
      'private, no-store',
    );
  });

  it('leaves other requests to the router', () => {
    for (const request of [
      new Request('https://board.test/oauth/authorize'),
      new Request('https://board.test/oauth/authorize?oauth=abc'),
      new Request('https://board.test/oauth/authorize?request=abc'),
      new Request('https://board.test/oauth/authorize?state=1', {
        method: 'POST',
      }),
      new Request('https://board.test/jobs?state=1e3'),
    ]) {
      expect(mcpAuthorizeRedirect(request)).toBeNull();
    }
  });

  it('sends Cavuno’s own sign-in return as it is', async () => {
    mocks.fetch.mockResolvedValue({ next: 'error', message: 'x' });
    await getMcpConsentStep({
      data: { search: '?request=abc&from=signed_in' },
    });
    expect(mocks.fetch.mock.calls[0]?.[0]).toBe(
      '/mcp/consent?request=abc&from=signed_in',
    );
  });

  it('is not found when the board has no MCP sign-in for this site', async () => {
    mocks.fetch.mockRejectedValue(
      new BoardApiError({
        status: 404,
        code: 'board_mcp_not_found',
        message: 'Not found',
        raw: null,
      }),
    );
    await expect(getMcpConsentStep({ data: { search: '' } })).rejects.toSatisfy(
      isNotFound,
    );
  });
});

describe('decideMcpConsent', () => {
  it('posts the decision with the visitor’s session', async () => {
    const decision = { next: 'redirect', location: 'https://a.test/cb' };
    mocks.fetch.mockResolvedValue(decision);
    const data = {
      request: 'r',
      consentToken: 't',
      decision: 'allow' as const,
    };

    await expect(decideMcpConsent({ data })).resolves.toEqual({
      ok: true,
      data: decision,
    });
    expect(mocks.fetch).toHaveBeenCalledWith('/mcp/consent', {
      method: 'POST',
      body: data,
      headers: { authorization: 'Bearer at' },
    });
  });
});
