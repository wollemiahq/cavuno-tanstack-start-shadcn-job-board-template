import { afterEach, describe, expect, it, vi } from 'vitest';

import { tinybirdProxyTarget, trackJobApplyClick } from './analytics';

/**
 * P2 starter analytics (cutover runbook): the starter must emit the SAME
 * events the hosted board emits, keyed the same way — per-job employer
 * stats read Tinybird `job_apply_click` rows by Convex job _id, and
 * dashboards join on tenant_id = board slug. These tests pin the wire
 * contract; drifting the event name or payload keys breaks employer
 * stats continuity at cutover.
 */
describe('trackJobApplyClick', () => {
  afterEach(() => {
    // @ts-expect-error — test cleanup of the injected global
    delete globalThis.window;
  });

  function withTinybird(trackEvent: (name: string, payload: unknown) => void) {
    // @ts-expect-error — minimal window stand-in for the node test env
    globalThis.window = { Tinybird: { trackEvent } };
  }

  it('emits job_apply_click keyed by the Convex job id (hosted parity)', () => {
    const trackEvent = vi.fn();
    withTinybird(trackEvent);
    trackJobApplyClick({ jobId: 'j57abc', companySlug: 'acme' });
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith('job_apply_click', {
      job_id: 'j57abc',
      company_slug: 'acme',
    });
  });

  it('omits company_slug when the job has none (hosted spreads conditionally)', () => {
    const trackEvent = vi.fn();
    withTinybird(trackEvent);
    trackJobApplyClick({ jobId: 'j57abc' });
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith('job_apply_click', {
      job_id: 'j57abc',
    });
  });

  it('is a no-op without the tracker (token unset → flock never loaded)', () => {
    // @ts-expect-error — window without Tinybird
    globalThis.window = {};
    expect(() => trackJobApplyClick({ jobId: 'j' })).not.toThrow();
  });

  it('never lets a tracker failure break the apply flow', () => {
    withTinybird(() => {
      throw new Error('tracker exploded');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => trackJobApplyClick({ jobId: 'j' })).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('tinybirdProxyTarget', () => {
  it('maps /t/* onto the Tinybird API host, preserving path and query', () => {
    expect(
      tinybirdProxyTarget(
        new URL(
          'https://demo.cavuno.app/t/v0/events?name=analytics_events&token=p.x',
        ),
      ),
    ).toBe(
      'https://api.us-east.aws.tinybird.co/v0/events?name=analytics_events&token=p.x',
    );
  });

  it('proxies only below /t — the path prefix is stripped exactly once', () => {
    expect(
      tinybirdProxyTarget(new URL('http://localhost:4199/t/v0/events')),
    ).toBe('https://api.us-east.aws.tinybird.co/v0/events');
  });
});
