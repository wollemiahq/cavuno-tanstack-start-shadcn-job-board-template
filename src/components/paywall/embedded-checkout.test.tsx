// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { loadStripe } from '@stripe/stripe-js';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { EmbeddedCheckout } from './embedded-checkout';

import { m } from '@/paraglide/messages';
import type { AccessCheckoutSession } from '@cavuno/board';

vi.mock('@stripe/stripe-js', () => ({ loadStripe: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('replaces a failed Stripe load with a retry action instead of an endless spinner', async () => {
  vi.mocked(loadStripe)
    .mockRejectedValueOnce(new Error('Network unavailable'))
    .mockResolvedValue(null);
  const kit = {
    object: 'checkout_session',
    sessionId: 'cs_test',
    clientSecret: 'test-secret',
    stripeAccountId: 'acct_test',
    publishableKey: 'pk_test',
    offerType: 'recurring',
  } satisfies AccessCheckoutSession;
  render(<EmbeddedCheckout kit={kit} />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    m.checkout_loadErrorText(),
  );
  expect(
    screen.queryByTestId('paywall-checkout-loading'),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: m.appError_retryAction() }),
  );
  await waitFor(() => expect(loadStripe).toHaveBeenCalledTimes(2));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    m.checkout_loadErrorText(),
  );
});
