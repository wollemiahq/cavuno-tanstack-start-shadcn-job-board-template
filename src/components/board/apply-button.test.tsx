// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { m } from '../../paraglide/messages';
import { ApplyButton } from './apply-button';

afterEach(cleanup);

const base = {
  language: 'en',
  returnTo: '/companies/acme/jobs/senior-eng',
  onApply: vi.fn(async () => {}),
};

describe('ApplyButton authentication return paths', () => {
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

    const link = screen.getByRole('link', {
      name: m.applyButton_applyLabel(),
    });
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

    const link = screen.getByRole('link', {
      name: m.applyButton_applyLabel(),
    });
    const href = link.getAttribute('href');
    expect(href).not.toBeNull();
    const verifyUrl = new URL(href!, 'https://board.example');
    expect(verifyUrl.pathname).toBe('/auth/verify-email-required');
    expect(verifyUrl.searchParams.get('returnTo')).toBe(returnTo);
  });
});
