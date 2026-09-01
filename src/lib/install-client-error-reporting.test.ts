// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetClientErrorReports } from './client-error-report';
import { installClientErrorReporting } from './install-client-error-reporting';

describe('installClientErrorReporting', () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 204 }));

  beforeEach(() => {
    fetchMock.mockClear();
    resetClientErrorReports();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });
    delete (window as Window & { __cavunoClientErrorReporting?: boolean })
      .__cavunoClientErrorReporting;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports window errors and unhandled rejections once installed', () => {
    installClientErrorReporting();
    installClientErrorReporting();

    window.dispatchEvent(
      new ErrorEvent('error', {
        error: Object.assign(new Error('Invalid time value'), {
          name: 'RangeError',
        }),
        message: 'Invalid time value',
      }),
    );
    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: Object.assign(new Error('boom'), { name: 'TypeError' }),
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ignores extension-injected script errors', () => {
    installClientErrorReporting();
    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'Extension blew up',
        filename: 'chrome-extension://abc/content.js',
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
