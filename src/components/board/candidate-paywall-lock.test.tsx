// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { m } from '../../paraglide/messages';
import { CandidatePaywallLock } from './candidate-paywall-lock';

import type { CandidatePaywallOffer } from '@/board/paywall-offer';
import { localizePath } from '@/lib/localized-path';

const offer: CandidatePaywallOffer = {
  object: 'paywall_offer',
  offerKey: 'plan-1',
  label: 'Customer plan',
  description: 'Customer description',
  benefits: ['Configured job matches'],
  billingLabel: 'Operator cadence',
  amountCents: 1900,
  currency: 'usd',
  offerType: 'recurring',
  intervalUnit: 'month',
  intervalCount: 1,
  isDefault: true,
};

afterEach(cleanup);

describe('candidate plan cards', () => {
  it('shows configured details, cadence and one plan-picker continuation preserving returnTo', () => {
    const returnTo = '/matches?selectedJob=job-1';
    render(
      <CandidatePaywallLock
        title="Feature heading"
        offers={[offer]}
        returnTo={returnTo}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Feature heading' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Customer plan' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Customer description')).toBeInTheDocument();
    expect(screen.getByText('Configured job matches')).toBeInTheDocument();
    expect(screen.getByText(m.accessOffer_perMonth())).toBeInTheDocument();
    expect(
      screen.getByText(m.candidatePaywallLock_recommendedBadge()),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: m.candidatePaywallLock_ctaLabel() }),
    ).toHaveLength(1);
    const href = screen
      .getByRole('link', { name: m.candidatePaywallLock_ctaLabel() })
      .getAttribute('href')!;
    const url = new URL(href, 'https://board.example');
    expect(url.pathname).toBe(localizePath('/account/access'));
    expect(url.searchParams.get('returnTo')).toBe(returnTo);
    expect(url.searchParams.has('offerKey')).toBe(false);
  });

  it('shows single-payment cadence without claiming benefits when metadata is unavailable', () => {
    render(
      <CandidatePaywallLock
        title="Feature heading"
        offers={[
          {
            ...offer,
            offerType: 'lifetime',
            intervalUnit: null,
            intervalCount: null,
            description: null,
            benefits: [],
            isDefault: false,
          },
        ]}
        returnTo="/me/alerts"
      />,
    );

    expect(screen.getByText(m.accessOffer_oneTime())).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText('Customer description')).not.toBeInTheDocument();
    expect(
      screen.queryByText(m.candidatePaywallLock_recommendedBadge()),
    ).not.toBeInTheDocument();
  });

  it('offers a jobs escape and no purchase CTA when no offers are available', () => {
    render(
      <CandidatePaywallLock
        title="Feature heading"
        offers={[]}
        returnTo="/matches"
      />,
    );

    expect(
      screen.getByText(m.candidatePaywallLock_noOffersText()),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: m.candidatePaywallLock_ctaLabel() }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: m.accountAccess_browseJobsLink() }),
    ).toHaveAttribute('href', localizePath('/jobs'));
  });
});
