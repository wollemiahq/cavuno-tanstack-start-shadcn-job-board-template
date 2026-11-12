// @vitest-environment jsdom
/**
 * The two screens Stripe returns an anonymous `/post` buyer to. The platform
 * hardcodes both paths, so the risk they guard is a 404 after a completed
 * payment — these assert each one renders its own outcome and offers a way
 * onward that is not a dead end.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  PostCheckoutCanceledView,
  PostCheckoutSuccessView,
} from './-post-checkout-outcome';

import { m } from '@/paraglide/messages';
import { renderRouted } from '@/test/render-routed';
import type { JobPostingCheckoutStatus } from '@cavuno/board';

function checkout(
  status: JobPostingCheckoutStatus['status'],
): JobPostingCheckoutStatus {
  return {
    object: 'job_posting_checkout_status',
    status,
    jobId: 'job-1',
    jobTitle: 'Designer',
    jobStatus: 'unpublished',
    jobUrl: null,
  };
}

afterEach(cleanup);

describe('post checkout outcome screens', () => {
  it('tells a paid buyer the payment landed and links onward to the board', async () => {
    // An older return link without a session cannot be checked.
    await renderRouted(<PostCheckoutSuccessView readCheckout={vi.fn()} />);
    expect(screen.getByText(m.postCheckout_successTitle())).toBeInTheDocument();
    expect(screen.getByText(m.postCheckout_successBody())).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: m.postCheckout_browseJobsLabel() }),
    ).toHaveAttribute('href', '/jobs');
  });

  it('reads the returned session and says a clearing bank payment is still processing', async () => {
    const readCheckout = vi.fn().mockResolvedValue(checkout('processing'));
    await renderRouted(
      <PostCheckoutSuccessView
        sessionId="cs_job"
        readCheckout={readCheckout}
      />,
    );
    expect(
      await screen.findByText(m.postCheckout_processingTitle()),
    ).toBeInTheDocument();
    expect(readCheckout).toHaveBeenCalledWith({
      data: { sessionId: 'cs_job' },
    });
    expect(screen.queryByText(m.postCheckout_successTitle())).toBeNull();
  });

  it('sends a buyer whose payment failed back to post again', async () => {
    await renderRouted(
      <PostCheckoutSuccessView
        sessionId="cs_job"
        readCheckout={vi.fn().mockResolvedValue(checkout('payment_failed'))}
      />,
    );
    expect(
      await screen.findByText(m.postCheckout_failedTitle()),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: m.postCheckout_backToPostLabel() }),
    ).toHaveAttribute('href', '/post');
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
    expect(m.postCheckout_canceledBody()).not.toBe(
      m.postCheckout_successBody(),
    );
  });
});
