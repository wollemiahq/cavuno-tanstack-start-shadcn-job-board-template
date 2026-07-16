// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApplyButton } from './apply-button';

/**
 * Apply-click analytics (P2, hosted parity): the click that constitutes
 * an APPLY emits `job_apply_click`; the press that only hits the
 * registration wall does not ("forcing sign-up isn't an apply" — hosted
 * native-job-apply-button comment), and an already-applied job never
 * re-emits.
 */
function stubTinybird() {
  const trackEvent = vi.fn();
  (window as unknown as Record<string, unknown>).Tinybird = { trackEvent };
  return trackEvent;
}

afterEach(() => {
  cleanup();
  delete (window as unknown as Record<string, unknown>).Tinybird;
});

const base = {
  jobId: 'j57abc',
  companySlug: 'acme',
  language: 'en',
  returnTo: '/companies/acme/jobs/senior-eng',
  onApply: vi.fn(async () => {}),
};

describe('ApplyButton apply-click analytics', () => {
  it('keeps the complete job destination through candidate sign-in', () => {
    const returnTo =
      '/companies/acme/jobs/platform-engineer?source=search#apply';
    render(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        viewer={null}
        returnTo={returnTo}
      />,
    );

    const link = screen.getByRole('link', { name: 'Apply' });
    const href = link.getAttribute('href');
    expect(href).not.toBeNull();
    const signInUrl = new URL(href!, 'https://board.example');
    expect(signInUrl.pathname).toBe('/auth/sign-in');
    expect(signInUrl.searchParams.get('returnTo')).toBe(returnTo);
  });

  it('keeps the complete job destination through email verification', () => {
    const returnTo = '/jobs?q=platform&selectedJob=platform-engineer';
    render(
      <ApplyButton
        {...base}
        jobSlug="platform-engineer"
        applicationUrl={null}
        viewer={{ emailVerified: false }}
        returnTo={returnTo}
      />,
    );

    const link = screen.getByRole('link', { name: 'Apply' });
    const href = link.getAttribute('href');
    expect(href).not.toBeNull();
    const verifyUrl = new URL(href!, 'https://board.example');
    expect(verifyUrl.pathname).toBe('/auth/verify-email-required');
    expect(verifyUrl.searchParams.get('returnTo')).toBe(returnTo);
  });

  it('external apply: the outbound click emits job_apply_click', () => {
    const trackEvent = stubTinybird();
    render(
      <ApplyButton
        {...base}
        jobSlug={null}
        applicationUrl="https://jobs.acme.com/123"
        viewer={null}
      />,
    );
    fireEvent.click(screen.getByRole('link'));
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith('job_apply_click', {
      job_id: 'j57abc',
      company_slug: 'acme',
    });
  });

  it('native apply: the press that performs the apply emits once', async () => {
    const trackEvent = stubTinybird();
    render(
      <ApplyButton
        {...base}
        jobSlug="senior-eng"
        applicationUrl={null}
        viewer={{ emailVerified: true }}
      />,
    );
    const apply = screen.getByRole('button');
    fireEvent.click(apply);
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith('job_apply_click', {
      job_id: 'j57abc',
      company_slug: 'acme',
    });
  });

  it('the registration-wall press is NOT an apply — no event', () => {
    const trackEvent = stubTinybird();
    render(
      <ApplyButton
        {...base}
        jobSlug="senior-eng"
        applicationUrl={null}
        viewer={null}
      />,
    );
    fireEvent.click(screen.getByRole('link')); // sign-in link
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('an already-applied job never re-emits', () => {
    const trackEvent = stubTinybird();
    render(
      <ApplyButton
        {...base}
        jobSlug="senior-eng"
        applicationUrl={null}
        viewer={{ emailVerified: true }}
        alreadyApplied
      />,
    );
    fireEvent.click(screen.getByRole('link')); // "view applications" link
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
