// @vitest-environment jsdom
/**
 * The two screens Stripe returns an anonymous `/post` buyer to. The platform
 * hardcodes both paths, so the risk they guard is a 404 after a completed
 * payment — these assert each one renders its own outcome and offers a way
 * onward that is not a dead end.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  PostCheckoutCanceledView,
  PostCheckoutSuccessView,
} from './-post-checkout-outcome';

import { m } from '@/paraglide/messages';
import { renderRouted } from '@/test/render-routed';

afterEach(cleanup);

describe('post checkout outcome screens', () => {
  it('tells a paid buyer the payment landed and links onward to the board', async () => {
    await renderRouted(<PostCheckoutSuccessView />);
    expect(screen.getByText(m.postCheckout_successTitle())).toBeInTheDocument();
    expect(screen.getByText(m.postCheckout_successBody())).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: m.postCheckout_browseJobsLabel() }),
    ).toHaveAttribute('href', '/jobs');
  });

  it('tells a cancelling buyer they were not charged and links back to the wizard', async () => {
    await renderRouted(<PostCheckoutCanceledView />);
    expect(
      screen.getByText(m.postCheckout_canceledTitle()),
    ).toBeInTheDocument();
    expect(screen.getByText(m.postCheckout_canceledBody())).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: m.postCheckout_backToPostLabel() }),
    ).toHaveAttribute('href', '/post');
  });

  it('does not present a cancelled checkout as a completed one', () => {
    expect(m.postCheckout_successTitle()).not.toBe(
      m.postCheckout_canceledTitle(),
    );
    expect(m.postCheckout_canceledBody()).toMatch(/not been charged/i);
  });
});
