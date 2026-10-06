// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GOOGLE_CONSENT_TIMEOUT_MS,
  showGoogleConsentMessage,
  subscribeGoogleConsent,
  trackersAllowedFromTcData,
  type TcData,
} from './google-tcf';

const granted = { 1: true, 7: true, 8: true, 9: true };

describe('trackersAllowedFromTcData', () => {
  it.each([
    ['all four publisher purposes consented', true, granted, true],
    ['GDPR does not apply', false, granted, false],
    ['purpose 1 refused', true, { ...granted, 1: false }, false],
    ['purpose 7 missing', true, { 1: true, 8: true, 9: true }, false],
    ['no publisher consents (purposes not configured)', true, undefined, false],
  ])('%s', (_label, gdprApplies, consents, expected) => {
    expect(
      trackersAllowedFromTcData({ gdprApplies, publisher: { consents } }),
    ).toBe(expected);
  });
});

/** Google's queue as Funding Choices installs it: runs items at once. */
function installFakeCmp() {
  const listeners: Array<(tcData: TcData, success: boolean) => void> = [];
  const showRevocationMessage = vi.fn();
  window.googlefc = {
    callbackQueue: {
      push: (item) => {
        item.CONSENT_API_READY?.();
        item.CONSENT_DATA_READY?.();
      },
    },
    showRevocationMessage,
  };
  window.__tcfapi = vi.fn((command, _version, callback) => {
    if (command === 'addEventListener') listeners.push(callback);
  });
  return {
    emit: (tcData: TcData) =>
      listeners.forEach((listener) => listener(tcData, true)),
    showRevocationMessage,
  };
}

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  vi.useRealTimers();
  delete window.googlefc;
  delete window.__tcfapi;
  document.getElementById('cavuno-adsense-loader')?.remove();
});

describe('subscribeGoogleConsent', () => {
  it('queues the listener for CONSENT_DATA_READY before Google loads', () => {
    const onUpdate = vi.fn();
    subscribeGoogleConsent(onUpdate);
    expect(window.googlefc?.callbackQueue).toHaveLength(1);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('reports every TCData and never times out once one arrived', () => {
    const cmp = installFakeCmp();
    const onUpdate = vi.fn();
    subscribeGoogleConsent(onUpdate);
    const tcData = { gdprApplies: true, eventStatus: 'tcloaded' };
    cmp.emit(tcData);
    vi.advanceTimersByTime(GOOGLE_CONSENT_TIMEOUT_MS);
    expect(onUpdate.mock.calls).toEqual([[{ kind: 'tcdata', tcData }]]);
  });

  it('gives up after the timeout and still reports a late TCData', () => {
    const cmp = installFakeCmp();
    const onUpdate = vi.fn();
    subscribeGoogleConsent(onUpdate);
    vi.advanceTimersByTime(GOOGLE_CONSENT_TIMEOUT_MS - 1);
    expect(onUpdate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onUpdate).toHaveBeenLastCalledWith({ kind: 'unavailable' });
    cmp.emit({ gdprApplies: true, eventStatus: 'cmpuishown' });
    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it('gives up at once when the AdSense loader fails', () => {
    const onUpdate = vi.fn();
    subscribeGoogleConsent(onUpdate);
    const script = document.createElement('script');
    script.id = 'cavuno-adsense-loader';
    document.head.appendChild(script);
    script.dispatchEvent(new Event('error'));
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith({ kind: 'unavailable' });
    vi.advanceTimersByTime(GOOGLE_CONSENT_TIMEOUT_MS);
    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it('stops reporting after unsubscribe', () => {
    const cmp = installFakeCmp();
    const onUpdate = vi.fn();
    subscribeGoogleConsent(onUpdate)();
    cmp.emit({ gdprApplies: true });
    vi.advanceTimersByTime(GOOGLE_CONSENT_TIMEOUT_MS);
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

describe('showGoogleConsentMessage', () => {
  it('reopens Google’s message', () => {
    const cmp = installFakeCmp();
    showGoogleConsentMessage();
    expect(cmp.showRevocationMessage).toHaveBeenCalledOnce();
  });
});
