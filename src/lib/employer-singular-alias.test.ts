import { describe, expect, it } from 'vitest';

import { employerSingularAliasHref } from './employer-singular-alias';

describe('employerSingularAliasHref', () => {
  it('sends the Cavuno invite-email path to the starter accept page with the token', () => {
    expect(
      employerSingularAliasHref(
        '/employer/invites/accept',
        '?token=a265a8aa2a84f9e9d4dca09b178a24c86800da46306690a26385147671705e73',
      ),
    ).toBe(
      '/employers/invites/accept?token=a265a8aa2a84f9e9d4dca09b178a24c86800da46306690a26385147671705e73',
    );
  });

  it('sends the Stripe Checkout back path to the company post-a-job page', () => {
    expect(
      employerSingularAliasHref('/employer/cjj-starter-r3-co/jobs/new', ''),
    ).toBe('/employers/companies/cjj-starter-r3-co/jobs/new');
  });

  it('keeps checkout search on the Stripe back alias', () => {
    expect(
      employerSingularAliasHref(
        '/employer/acme/jobs/new',
        '?session_id=cs_test_1',
      ),
    ).toBe('/employers/companies/acme/jobs/new?session_id=cs_test_1');
  });

  it('does not rewrite the real plural employer routes', () => {
    expect(
      employerSingularAliasHref('/employers/invites/accept', '?token=tok'),
    ).toBeNull();
    expect(
      employerSingularAliasHref('/employers/companies/acme/jobs/new', ''),
    ).toBeNull();
  });
});
