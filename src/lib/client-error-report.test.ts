// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CLIENT_ERROR_PATH,
  reportClientError,
  resetClientErrorReports,
} from './client-error-report';

describe('reportClientError', () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 204 }));
  const sendBeacon = vi.fn().mockReturnValue(false);

  beforeEach(() => {
    fetchMock.mockClear();
    sendBeacon.mockClear();
    sendBeacon.mockReturnValue(false);
    resetClientErrorReports();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('navigator', {
      ...navigator,
      sendBeacon,
    });
    window.history.replaceState({}, '', '/talent?selectedTalent=ruth-chebet');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs a same-origin keepalive payload and prefers sendBeacon', () => {
    sendBeacon.mockReturnValue(true);
    const error = Object.assign(new Error('Invalid time value'), {
      name: 'RangeError',
    });

    reportClientError(error);

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeacon.mock.calls[0] as [string, Blob];
    expect(url).toBe(CLIENT_ERROR_PATH);
    expect(blob.type).toBe('application/json');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to keepalive fetch when sendBeacon is unavailable', () => {
    const error = Object.assign(new Error('Invalid time value'), {
      name: 'RangeError',
    });

    reportClientError(error);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(CLIENT_ERROR_PATH);
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect(init.credentials).toBe('same-origin');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      name: 'RangeError',
      message: 'Invalid time value',
      path: '/talent',
      host: window.location.host,
    });
  });

  it('dedupes the same crash so a render loop cannot flood the Worker', () => {
    const error = Object.assign(new Error('Maximum update depth exceeded'), {
      name: 'Error',
    });

    reportClientError(error);
    reportClientError(error);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
