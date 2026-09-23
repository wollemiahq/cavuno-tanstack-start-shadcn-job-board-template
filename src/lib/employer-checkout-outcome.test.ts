import { describe, expect, it } from 'vitest';

import { awaitingReview } from './employer-checkout-outcome';

describe('awaitingReview', () => {
  it('treats a held post as awaiting review, not as live', () => {
    expect(awaitingReview('pending_approval')).toBe(true);
  });

  it('leaves every other checkout outcome alone', () => {
    for (const status of ['published', 'checkout', 'invoice_sent']) {
      expect(awaitingReview(status)).toBe(false);
    }
  });
});
