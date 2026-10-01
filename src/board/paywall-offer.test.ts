import { describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import {
  candidateOffersForFeature,
  candidatePaywallOffers,
  offerBillingLabel,
} from './paywall-offer';

import type { PaywallOffer } from '@cavuno/board';

const offer: PaywallOffer = {
  object: 'paywall_offer',
  offerKey: 'plan-1',
  label: 'Candidate plan',
  billingLabel: 'Operator cadence',
  amountCents: 1900,
  currency: 'usd',
  offerType: 'recurring',
  intervalUnit: 'month',
  intervalCount: 1,
  isDefault: true,
};

const feature = (name: string, value: string) => ({
  name,
  value,
  dataType: 'boolean',
  displayOrder: 0,
});

describe('candidate paywall offer metadata', () => {
  it('preserves wire pricing and adds only configured benefits from the matching plan ID', () => {
    const [result] = candidatePaywallOffers(
      [offer],
      [
        {
          id: 'plan-1',
          description: 'Customer-authored plan description',
          features: {
            'job_seeker.matches': feature('Configured matches benefit', 'true'),
            'job_seeker.job_alerts': feature(
              'Disabled alerts benefit',
              'false',
            ),
            'jobs.duration_days': feature('Employer benefit', '30'),
          },
        },
      ],
    );

    expect(result).toMatchObject({
      offerKey: 'plan-1',
      amountCents: 1900,
      currency: 'usd',
      offerType: 'recurring',
      intervalUnit: 'month',
      intervalCount: 1,
      description: 'Customer-authored plan description',
      benefits: ['Configured matches benefit'],
    });
  });

  it('does not fabricate benefits when plan metadata is absent or belongs to another ID', () => {
    expect(
      candidatePaywallOffers(
        [offer],
        [
          {
            id: 'another-plan',
            description: 'Unrelated description',
            features: {
              'job_seeker.matches': feature(
                'Unrelated matches benefit',
                'true',
              ),
            },
          },
        ],
      )[0],
    ).toMatchObject({ description: null, benefits: [] });
    expect(candidatePaywallOffers([offer], [])[0]).toMatchObject({
      amountCents: 1900,
      description: null,
      benefits: [],
    });
    expect(candidatePaywallOffers([], [])).toEqual([]);
  });
});

describe('feature-specific paywall offers', () => {
  const matches = { listings: false, matches: true, job_alerts: false };
  const alerts = { listings: false, matches: false, job_alerts: true };
  const both = { listings: true, matches: true, job_alerts: true };

  it('keeps eligible plans in API order with their exact checkout keys and pricing', () => {
    const offers = candidatePaywallOffers(
      [
        { ...offer, offerKey: 'alerts', entitlements: alerts },
        {
          ...offer,
          offerKey: 'matches',
          entitlements: matches,
          isDefault: false,
        },
        {
          ...offer,
          offerKey: 'combined',
          entitlements: both,
          amountCents: 2900,
        },
        {
          ...offer,
          offerKey: 'neither',
          entitlements: { listings: true, matches: false, job_alerts: false },
        },
      ],
      [],
    );
    expect(candidateOffersForFeature(offers, 'matches')).toEqual([
      offers[1],
      offers[2],
    ]);
    expect(candidateOffersForFeature(offers, 'job_alerts')).toEqual([
      offers[0],
      offers[2],
    ]);
    // The generic access picker keeps the complete catalogue.
    expect(offers.map((row) => row.offerKey)).toEqual([
      'alerts',
      'matches',
      'combined',
      'neither',
    ]);
  });

  it('uses resolved permissions for legacy checkout keys without guessing a plan join', () => {
    const offers = candidatePaywallOffers(
      [{ ...offer, offerKey: 'monthly', entitlements: alerts }],
      [{ id: 'plan-1', description: 'Different ID', features: {} }],
    );
    expect(candidateOffersForFeature(offers, 'matches')).toEqual([]);
    expect(candidateOffersForFeature(offers, 'job_alerts')).toEqual(offers);
    expect(offers[0]).toMatchObject({
      offerKey: 'monthly',
      description: null,
      benefits: [],
    });
  });

  it('prefers API permissions over compatibility metadata from a matching plan', () => {
    const offers = candidatePaywallOffers(
      [{ ...offer, entitlements: alerts }],
      [
        {
          id: 'plan-1',
          description: null,
          features: { 'job_seeker.matches': feature('Matches', 'true') },
        },
      ],
    );
    expect(candidateOffersForFeature(offers, 'matches')).toEqual([]);
    expect(candidateOffersForFeature(offers, 'job_alerts')).toEqual(offers);
  });

  it('supports older APIs only when the exact plan ID supplies permissions', () => {
    const offers = candidatePaywallOffers(
      [offer, { ...offer, offerKey: 'unknown-key' }],
      [
        {
          id: 'plan-1',
          description: null,
          features: { 'job_seeker.matches': feature('Matches', ' YES ') },
        },
      ],
    );
    expect(candidateOffersForFeature(offers, 'matches')).toEqual([offers[0]]);
    expect(candidateOffersForFeature(offers, 'job_alerts')).toEqual([]);
    expect(candidateOffersForFeature([], 'matches')).toEqual([]);
  });
});

describe('offer billing cadence', () => {
  it('shows localized recurring intervals from structured fields', () => {
    expect(offerBillingLabel(offer)).toBe(m.accessOffer_perMonth());
    expect(offerBillingLabel({ ...offer, intervalCount: 3 })).toBe(
      m.accessOffer_everyMonths({ count: 3, countLabel: '3' }),
    );
    expect(offerBillingLabel({ ...offer, intervalUnit: 'year' })).toBe(
      m.accessOffer_perYear(),
    );
  });

  it('identifies a single payment and preserves unknown cadence labels', () => {
    expect(
      offerBillingLabel({
        ...offer,
        offerType: 'lifetime',
        intervalUnit: null,
        intervalCount: null,
      }),
    ).toBe(m.accessOffer_oneTime());
    expect(
      offerBillingLabel({ ...offer, intervalUnit: 'week', intervalCount: 2 }),
    ).toBe('Operator cadence');
  });
});
