import { createBoardClient, type BoardSdk } from '@cavuno/board';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withApplyGatewayReads } from './apply-gateway-capability';

/**
 * Without `apply-gateway-v1` the Board API leaves Sponsored jobs out of every
 * job list. These pin that each job read the starter makes declares it: the
 * cacheable GETs in the URL (so the edge can still cache them), the reads
 * with no query form as the header.
 */
const fetchMock = vi.fn(
  async (_url: string, _init: RequestInit) =>
    new Response(JSON.stringify({ data: [], hasMore: false }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
);

function board(): BoardSdk {
  return withApplyGatewayReads(
    createBoardClient({
      baseUrl: 'https://api.example.test',
      board: 'pk_test',
    }),
  );
}

function lastRequest() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: new URL(url), headers: new Headers(init.headers) };
}

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockClear();
});

describe('withApplyGatewayReads', () => {
  it.each([
    ['jobs.list', (b: BoardSdk) => b.jobs.list({ limit: 20 })],
    ['jobs.list (no query)', (b: BoardSdk) => b.jobs.list()],
    ['jobs.retrieve', (b: BoardSdk) => b.jobs.retrieve('senior-eng')],
    ['jobs.similar', (b: BoardSdk) => b.jobs.similar('senior-eng')],
    [
      'companies.listJobs',
      (b: BoardSdk) => b.companies.listJobs('acme', { limit: 10 }),
    ],
    ['embed.jobs', (b: BoardSdk) => b.embed.jobs({ limit: 8 })],
  ])('%s sends the capability in the URL, not the header', async (_, read) => {
    await read(board());

    const { url, headers } = lastRequest();
    expect(url.searchParams.getAll('capabilities')).toEqual([
      'apply-gateway-v1',
    ]);
    expect(headers.has('x-cavuno-board-capabilities')).toBe(false);
  });

  it('keeps the rest of the query and never repeats the capability', async () => {
    await board().jobs.list({
      limit: 20,
      capabilities: ['apply-gateway-v1'],
    });

    const { url } = lastRequest();
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.getAll('capabilities')).toEqual([
      'apply-gateway-v1',
    ]);
  });

  it.each([
    [
      'jobs.search',
      (b: BoardSdk, headers: Record<string, string>) =>
        b.jobs.search({ query: 'chef' }, undefined, { headers }),
    ],
    [
      'me.recommendedJobs.list',
      (b: BoardSdk, headers: Record<string, string>) =>
        b.me.recommendedJobs.list({ limit: 20 }, { headers }),
    ],
  ])('%s sends the header and keeps the caller headers', async (_, read) => {
    await read(board(), { authorization: 'Bearer token' });

    const { url, headers } = lastRequest();
    expect(headers.get('x-cavuno-board-capabilities')).toBe('apply-gateway-v1');
    expect(headers.get('authorization')).toBe('Bearer token');
    expect(url.searchParams.has('capabilities')).toBe(false);
  });
});
