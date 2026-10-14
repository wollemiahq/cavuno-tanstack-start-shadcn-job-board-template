import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: vi.fn(),
}));

import {
  SHED_RETRY_AFTER_SECONDS,
  noteBoardApiShed,
  shedAwareResponse,
} from './board-api-shed.server';

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

/** The page response for a render that failed with `error`. */
function pageAfter(
  error: Error,
  rendered = new Response('<h1>Error</h1>', {
    status: 500,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  }),
) {
  const request = new Request('https://board.example/jobs');
  noteBoardApiShed(error, request);
  return shedAwareResponse(rendered, request);
}

describe('Board API shed → page status', () => {
  it('turns a 429 into 503 with Retry-After, keeping the page body', async () => {
    const response = pageAfter(boardApiError(429));

    expect(response.status).toBe(503);
    expect(response.headers.get('Retry-After')).toBe(
      String(SHED_RETRY_AFTER_SECONDS),
    );
    expect(response.headers.get('Content-Type')).toBe(
      'text/html; charset=utf-8',
    );
    expect(await response.text()).toBe('<h1>Error</h1>');
  });

  it('turns an upstream 503 into 503 with Retry-After', () => {
    const response = pageAfter(boardApiError(503, 'service_unavailable'));

    expect(response.status).toBe(503);
    expect(response.headers.get('Retry-After')).toBe(
      String(SHED_RETRY_AFTER_SECONDS),
    );
  });

  it.each([502, 504])(
    'turns an upstream %i into 503 with Retry-After',
    (status) => {
      const response = pageAfter(boardApiError(status, 'bad_gateway'));

      expect(response.status).toBe(503);
      expect(response.headers.get('Retry-After')).toBe(
        String(SHED_RETRY_AFTER_SECONDS),
      );
    },
  );

  it('keeps any other Board API 5xx a 500', () => {
    const response = pageAfter(boardApiError(500, 'internal_error'));

    expect(response.status).toBe(500);
    expect(response.headers.has('Retry-After')).toBe(false);
  });

  it('keeps a plain bug a 500', () => {
    const response = pageAfter(new TypeError('undefined is not a function'));

    expect(response.status).toBe(500);
    expect(response.headers.has('Retry-After')).toBe(false);
  });

  it('leaves a 404 page alone', () => {
    const notFound = new Response('Not found', { status: 404 });
    const response = pageAfter(boardApiError(404, 'jobs_not_found'), notFound);

    expect(response).toBe(notFound);
  });

  it('leaves a page that rendered despite a shed read alone', () => {
    const ok = new Response('<h1>Jobs</h1>', { status: 200 });

    expect(pageAfter(boardApiError(429), ok)).toBe(ok);
  });

  it('only rewrites the request that was shed', () => {
    noteBoardApiShed(
      boardApiError(429),
      new Request('https://board.example/a'),
    );
    const other = new Response('boom', { status: 500 });

    expect(
      shedAwareResponse(other, new Request('https://board.example/b')),
    ).toBe(other);
  });
});
