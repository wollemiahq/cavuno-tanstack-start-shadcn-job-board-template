import { describe, expect, it } from 'vitest';

import {
  candidateAuthSearch,
  candidatePasswordResetSignInSearch,
  candidateReturnTo,
} from './candidate-return-to';

describe('candidateReturnTo', () => {
  it('preserves complete internal job destinations', () => {
    expect(
      candidateReturnTo(
        '/companies/acme/jobs/product-designer?ref=featured#apply',
      ),
    ).toBe('/companies/acme/jobs/product-designer?ref=featured#apply');
    expect(
      candidateReturnTo(
        '/jobs?q=designer&location=Sydney&selectedJob=product-designer',
      ),
    ).toBe('/jobs?q=designer&location=Sydney&selectedJob=product-designer');
  });

  it('keeps a nested returnTo, so the paywall hop survives sign-in', () => {
    // `/account/access?returnTo=/jobs` bounces an anonymous visitor to
    // sign-in; truncating the query here strands the buyer on the paywall.
    expect(candidateReturnTo('/account/access?returnTo=%2Fjobs')).toBe(
      '/account/access?returnTo=%2Fjobs',
    );
  });

  it.each([
    undefined,
    '',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    '/auth/sign-in',
  ])(
    'falls back to the candidate account for an unsafe destination (%s)',
    (returnTo) => {
      expect(candidateReturnTo(returnTo)).toBe('/account');
    },
  );
});

describe('candidateAuthSearch', () => {
  it('carries only the sanitized returnTo for Link search', () => {
    expect(
      candidateAuthSearch(
        '/companies/acme/jobs/product-designer?ref=featured#apply',
      ),
    ).toEqual({
      returnTo: '/companies/acme/jobs/product-designer?ref=featured#apply',
    });
    expect(candidatePasswordResetSignInSearch('/jobs')).toEqual({
      returnTo: '/jobs',
      reset: 'password',
    });
  });
});
