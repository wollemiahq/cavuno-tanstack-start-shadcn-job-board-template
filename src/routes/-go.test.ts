/**
 * Mount contract for `/go/*`. The SDK's own suite pins handler semantics;
 * these tests pin that the starter mounts createGoHandler and surfaces its
 * response intact.
 */
import { describe, expect, it } from 'vitest';

import { Route } from './go.$';

function getHandler() {
  const handlers = Route.options.server?.handlers;
  if (!handlers || !('GET' in handlers) || !handlers.GET) {
    throw new Error('expected /go/$ to export a GET server handler');
  }
  return handlers.GET;
}

async function getGo(pathWithQuery: string): Promise<Response> {
  const request = new Request(`https://board.example.com${pathWithQuery}`);
  const result = await getHandler()({
    context: undefined,
    request,
    params: { _splat: pathWithQuery.slice('/go/'.length).split('?')[0] },
    pathname: '/go/$',
    next: () => {
      throw new Error('The /go/$ handler must not defer');
    },
  });
  if (!(result instanceof Response)) {
    throw new Error('The /go/$ GET handler must return a response');
  }
  return result;
}

function locationPathAndSearch(res: Response): string {
  const raw = res.headers.get('Location');
  if (!raw) throw new Error('missing Location header');
  const url = new URL(raw);
  return `${url.pathname}${url.search}`;
}

describe('/go/* mount — createGoHandler', () => {
  it('GET /go/alerts-manage?token=abc&x=1 → 302 /alerts/manage (query verbatim) + noindex/no-store', async () => {
    const res = await getGo('/go/alerts-manage?token=abc&x=1');
    expect(res.status).toBe(302);
    expect(locationPathAndSearch(res)).toBe('/alerts/manage?token=abc&x=1');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('GET /go/alerts-confirm?token=t → 302 /alerts/confirm?token=t', async () => {
    const res = await getGo('/go/alerts-confirm?token=t');
    expect(res.status).toBe(302);
    expect(locationPathAndSearch(res)).toBe('/alerts/confirm?token=t');
  });

  it('GET /go/job/anything degrades to /jobs when lookupJob is unwired', async () => {
    const res = await getGo('/go/job/anything');
    expect(res.status).toBe(302);
    expect(locationPathAndSearch(res)).toBe('/jobs');
  });

  it('GET /go/unknown-role degrades to /jobs (handler miss)', async () => {
    // createGoHandler: any role other than job / alerts-manage / alerts-confirm
    // falls through resolveGoRedirect → BOARD_PATHS.jobs (never 404).
    const res = await getGo('/go/unknown-role');
    expect(res.status).toBe(302);
    expect(locationPathAndSearch(res)).toBe('/jobs');
  });
});
