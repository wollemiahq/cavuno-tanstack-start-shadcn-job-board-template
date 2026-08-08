import { describe, expect, it } from 'vitest';

import { cardSummary } from './derive-summary';

describe('cardSummary', () => {
  it('uses the API summary when present', () => {
    expect(
      cardSummary({
        summary: 'We hire robot people.',
      }),
    ).toBe('We hire robot people.');
  });

  it('honours explicit null summary', () => {
    expect(
      cardSummary({
        summary: null,
      }),
    ).toBeNull();
  });

  it('treats whitespace-only summary as empty', () => {
    expect(
      cardSummary({
        summary: '   ',
      }),
    ).toBeNull();
  });

  it('returns null when summary is absent', () => {
    expect(cardSummary({})).toBeNull();
  });
});
