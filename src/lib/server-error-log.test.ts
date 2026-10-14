import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  STARTER_SERVER_ERROR_LOG_NAME,
  noteServerError,
  serveWithServerErrorLog,
} from './server-error-log.server';

/** The shape the SDK's `isBoardApiError` duck-types on. */
function boardApiError(status: number, code: string) {
  return Object.assign(new Error(code), {
    name: 'BoardApiError',
    status,
    code,
    requestId: 'req_test',
    raw: {},
  });
}

const board = () => 'pk_test';

describe('serveWithServerErrorLog', () => {
  const error = vi.fn();

  beforeEach(() => {
    error.mockClear();
    // Replace the suite-wide "unexpected console.error" stub from setup.ts.
    console.error = error;
  });

  function loggedLines() {
    return error.mock.calls.map(([line]) => JSON.parse(String(line)));
  }

  it('logs one line for a thrown error and rethrows it unchanged', async () => {
    const request = new Request(
      'https://board.example/sitemap.xml?token=secret&page=2',
    );
    const thrown = new TypeError(
      'fetch https://api.example/v1/jobs?key=secret failed',
    );

    await expect(
      serveWithServerErrorLog(request, () => Promise.reject(thrown), board),
    ).rejects.toBe(thrown);

    expect(error).toHaveBeenCalledTimes(1);
    const [line] = loggedLines();
    expect(line).toMatchObject({
      name: STARTER_SERVER_ERROR_LOG_NAME,
      source: 'board-starter',
      board: 'pk_test',
      host: 'board.example',
      path: '/sitemap.xml',
      method: 'GET',
      status: null,
      errorName: 'TypeError',
      errorMessage: 'fetch https://api.example/v1/jobs failed',
    });
    expect(String(error.mock.calls[0][0])).not.toContain('secret');
  });

  it('rethrows the original error even when logging it fails', async () => {
    const request = new Request('https://board.example/jobs');
    // A prototype-less object: String(thrown) throws, so summarizing it fails.
    const thrown: object = Object.create(null);
    error.mockImplementation(() => {
      throw new Error('console unavailable');
    });

    await expect(
      serveWithServerErrorLog(request, () => Promise.reject(thrown), board),
    ).rejects.toBe(thrown);
    expect(() => noteServerError(thrown, request)).not.toThrow();
    error.mockReset();
  });

  it('logs a framework-rendered 500 once, naming the noted error, and returns the response as is', async () => {
    const request = new Request('https://board.example/jobs?q=nurse');
    const rendered = new Response('<h1>Error</h1>', { status: 500 });
    const loaderError = new RangeError('Invalid time value');

    const response = await serveWithServerErrorLog(
      request,
      async () => {
        // Two server fns fail during one render; only the first is named.
        noteServerError(loaderError, request);
        noteServerError(new Error('second'), request);
        return rendered;
      },
      board,
    );

    expect(response).toBe(rendered);
    expect(await response.text()).toBe('<h1>Error</h1>');
    expect(error).toHaveBeenCalledTimes(1);
    const [line] = loggedLines();
    expect(line).toMatchObject({
      path: '/jobs',
      status: 500,
      errorName: 'RangeError',
      errorMessage: 'Invalid time value',
    });
    expect(String(error.mock.calls[0][0])).not.toContain('nurse');
  });

  it('still logs a 500 when no error was noted', async () => {
    await serveWithServerErrorLog(
      new Request('https://board.example/'),
      async () => new Response('Internal Server Error', { status: 500 }),
      board,
    );

    expect(error).toHaveBeenCalledTimes(1);
    expect(loggedLines()[0]).toMatchObject({
      status: 500,
      errorName: 'UnknownError',
    });
  });

  it('stays silent for successful, not-found and shed responses', async () => {
    for (const status of [200, 404, 503]) {
      await serveWithServerErrorLog(
        new Request('https://board.example/jobs'),
        async () => new Response(null, { status }),
        board,
      );
    }

    expect(error).not.toHaveBeenCalled();
  });

  it('skips a server-fn RPC 500 carrying an expected Board API error', async () => {
    const request = new Request('https://board.example/_serverFn/abc');

    await serveWithServerErrorLog(
      request,
      async () => {
        noteServerError(boardApiError(404, 'not_found'), request);
        return new Response('{}', { status: 500 });
      },
      board,
    );

    expect(error).not.toHaveBeenCalled();
  });

  it('logs without a board key when the binding is missing', async () => {
    await expect(
      serveWithServerErrorLog(
        new Request('https://board.example/'),
        () => Promise.reject(new Error('boom')),
        () => {
          throw new Error('CAVUNO_BOARD is not set');
        },
      ),
    ).rejects.toThrow('boom');

    expect(error).toHaveBeenCalledTimes(1);
    expect(loggedLines()[0]).toMatchObject({ board: null, errorName: 'Error' });
  });
});
