/**
 * Server routes (sitemaps, feeds, OG cards) call the Board SDK directly, so a
 * shed reaches the request middleware as a thrown error, not a 500 page.
 * Each case runs a real route handler through the request middleware's work
 * (`serveShedAware`).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => new Request('https://board.example/'),
}));

const retrieveJob = vi.fn();
vi.mock('./board', () => ({
  APPLY_GATEWAY_QUERY: { capabilities: ['apply-gateway-v1'] },
  getBoard: () => ({ jobs: { retrieve: retrieveJob } }),
  getPrimaryBoard: vi.fn(),
}));
// The card renderer (WASM) and its inputs are out of scope here.
vi.mock('./og-render', () => ({ renderOgPng: vi.fn() }));

import { createJobsRssHandler } from '../routes/-jobs-rss-handler';
import { createSitemapIndexHandler } from '../routes/-sitemap-handler';
import { Route as JobOgRoute } from '../routes/companies.$companySlug.jobs.$jobSlug.og';
import {
  SHED_RETRY_AFTER_SECONDS,
  serveShedAware,
} from './board-api-shed.server';

import type { BoardSdk } from '@cavuno/board';

/** The shape the SDK's `isBoardApiError` duck-types on. */
function boardApiError(status: number, code = 'rate_limited') {
  return Object.assign(new Error(code), {
    name: 'BoardApiError',
    status,
    code,
    requestId: 'req_test',
    raw: {},
  });
}

/** What the client gets for a server route `handler`, via the middleware's work. */
async function serve(handler: () => Promise<Response>): Promise<Response> {
  const result = await serveShedAware(
    async () => ({ response: await handler() }),
    new Request('https://board.example/route'),
  );
  return result instanceof Response ? result : result.response;
}

function expectShed(response: Response) {
  expect(response.status).toBe(503);
  expect(response.headers.get('Retry-After')).toBe(
    String(SHED_RETRY_AFTER_SECONDS),
  );
  expect(response.headers.get('Cache-Control')).toBe('no-store');
}

const loadSitemapContext = vi.fn();
const sitemapIndex = createSitemapIndexHandler({
  // SAFETY: the handler only passes the board on to loadSitemapContext.
  getPrimaryBoard: () => ({}) as BoardSdk,
  readPublicOrigin: async () => 'https://board.example',
  loadSitemapContext,
});

const listJobs = vi.fn();
const jobsRss = createJobsRssHandler({
  getRequest: () => new Request('https://board.example/jobs/rss.xml'),
  getBoard: () => ({
    context: async () => ({ name: 'Board', language: 'en' }),
    jobs: { list: listJobs },
  }),
  readPublicOrigin: async () => 'https://board.example',
});

function jobOgHandler() {
  const handlers = JobOgRoute.options.server?.handlers;
  if (!handlers || !('GET' in handlers) || !handlers.GET) {
    throw new Error('expected the job OG route to export a GET handler');
  }
  return handlers.GET;
}

async function jobOg(): Promise<Response> {
  const result = await jobOgHandler()({
    context: undefined,
    request: new Request('https://board.example/companies/acme/jobs/eng/og'),
    params: { companySlug: 'acme', jobSlug: 'eng' },
    pathname: '/og',
    next: () => {
      throw new Error('The job OG handler must not defer');
    },
  });
  if (!(result instanceof Response)) {
    throw new Error('The job OG GET handler must return a response');
  }
  return result;
}

beforeEach(() => {
  loadSitemapContext.mockReset();
  listJobs.mockReset();
  retrieveJob.mockReset();
});

describe('Board API shed → server route status', () => {
  it.each([429, 502, 503, 504])(
    'answers a sitemap whose read got %i with 503 + Retry-After',
    async (status) => {
      loadSitemapContext.mockRejectedValue(boardApiError(status));

      expectShed(await serve(sitemapIndex));
    },
  );

  it('answers a feed whose read was shed with 503 + Retry-After', async () => {
    listJobs.mockRejectedValue(boardApiError(429));

    expectShed(await serve(jobsRss));
  });

  it('answers an OG card whose job read was shed with 503, not 404', async () => {
    retrieveJob.mockRejectedValue(boardApiError(429));

    expectShed(await serve(jobOg));
  });

  it('still answers an OG card for a missing job with 404', async () => {
    retrieveJob.mockRejectedValue(boardApiError(404, 'job_not_found'));

    const response = await serve(jobOg);

    expect(response.status).toBe(404);
    expect(response.headers.has('Retry-After')).toBe(false);
    // The same Apply gateway opt-in as the job page, so a Sponsored job's
    // card is not a 404.
    expect(retrieveJob).toHaveBeenCalledWith(expect.any(String), {
      capabilities: ['apply-gateway-v1'],
    });
  });

  it('rethrows any other error unchanged', async () => {
    const bug = new TypeError('undefined is not a function');
    loadSitemapContext.mockRejectedValue(bug);
    const upstream = boardApiError(500, 'internal_error');
    listJobs.mockRejectedValue(upstream);

    await expect(serve(sitemapIndex)).rejects.toBe(bug);
    await expect(serve(jobsRss)).rejects.toBe(upstream);
  });

  it('passes a successful response through untouched', async () => {
    loadSitemapContext.mockResolvedValue({ buckets: [] });
    listJobs.mockResolvedValue({ data: [] });

    const sitemap = await serve(sitemapIndex);
    const feed = await serve(jobsRss);

    expect(sitemap.status).toBe(200);
    expect(sitemap.headers.get('Cache-Control')).not.toBe('no-store');
    expect(feed.status).toBe(200);
    expect(feed.headers.get('Cache-Control')).toMatch(/^public/);
  });
});
