import { describe, expect, it } from 'vitest';

import { planOffersFeaturedChoice } from './plan-view-model';

import { toCreateJobPostingInput } from '@/lib/post-form';

/**
 * Featured delivery, pinned so it never needs a live board again.
 *
 * The platform computes `shouldFeature = featureMode === 'auto' ||
 * input.isFeatured`. Under `jobs.feature_selection_mode: manual` a plan can
 * therefore advertise "Includes 1 featured post" and deliver a standard
 * listing unless the buyer's opt-in reaches the wire. Verified live on
 * 2026-09-06 with two jobs on one manual plan — ticked → `isFeatured: true`,
 * unticked → `false` — and these tests hold that shape without the fixture.
 */
function plan(
  features: Record<string, string>,
): Parameters<typeof planOffersFeaturedChoice>[0] {
  return {
    features: Object.entries(features).map(([key, value]) => ({
      key,
      value,
      feature: { key },
    })),
  };
}

describe('planOffersFeaturedChoice', () => {
  it('offers the choice on a manual plan with slots', () => {
    expect(
      planOffersFeaturedChoice(
        plan({
          'jobs.feature_selection_mode': 'manual',
          'jobs.featured_slots': '1',
        }),
      ),
    ).toBe(true);
  });

  it('offers it for unlimited slots', () => {
    expect(
      planOffersFeaturedChoice(
        plan({
          'jobs.feature_selection_mode': 'manual',
          'jobs.featured_slots': 'unlimited',
        }),
      ),
    ).toBe(true);
  });

  it('does NOT offer it under auto — the platform features every post there', () => {
    expect(
      planOffersFeaturedChoice(
        plan({
          'jobs.feature_selection_mode': 'auto',
          'jobs.featured_slots': '1',
        }),
      ),
    ).toBe(false);
  });

  it('does NOT offer it when the plan sells no featured slots', () => {
    expect(
      planOffersFeaturedChoice(
        plan({
          'jobs.feature_selection_mode': 'manual',
          'jobs.featured_slots': '0',
        }),
      ),
    ).toBe(false);
  });
});

describe('the public wizard puts isFeatured on the wire', () => {
  const submission = {
    companyName: 'Acme',
    contactName: 'A Person',
    contactEmail: 'hiring@acme.test',
    title: 'Role',
    description: '<p>x</p>',
    employmentType: 'full_time',
    remoteOption: 'remote',
    officeLocations: [],
    applicationUrl: 'https://acme.test/apply',
  };

  it('carries the opt-in INSIDE submission, where this body expects it', () => {
    // `invoiceBilling` is a sibling of `submission`; `isFeatured` is not.
    // Putting it at the top level would be silently dropped.
    const body = toCreateJobPostingInput({ ...submission, isFeatured: true });
    expect(body.submission.isFeatured).toBe(true);
    expect(body).not.toHaveProperty('isFeatured');
  });

  it('sends nothing when the buyer did not opt in', () => {
    expect(
      toCreateJobPostingInput(submission).submission.isFeatured,
    ).toBeUndefined();
  });
});
