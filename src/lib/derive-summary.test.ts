import { describe, expect, it } from 'vitest';

import { cardSummary, deriveSummary } from './derive-summary';

describe('cardSummary', () => {
  it('uses the API summary when the field is present', () => {
    expect(
      cardSummary({
        summary: 'We hire robot people.',
        description: '<p>Long HTML ignored.</p>',
      }),
    ).toBe('We hire robot people.');
  });

  it('honours explicit null summary without falling back to description', () => {
    expect(
      cardSummary({
        summary: null,
        description: '<p>Would have been a teaser.</p>',
      }),
    ).toBeNull();
  });

  it('treats whitespace-only summary as empty (no blank teaser line)', () => {
    expect(
      cardSummary({
        summary: '   ',
        description: '<p>Would have been a teaser.</p>',
      }),
    ).toBeNull();
  });

  it('derives from description when summary is absent (pre-4.2 wire)', () => {
    expect(
      cardSummary({
        description: '<p>Legacy description still works.</p>',
      }),
    ).toBe('Legacy description still works.');
  });

  it('treats summary: undefined like an absent field', () => {
    expect(
      cardSummary({
        summary: undefined,
        description: '<p>Legacy description still works.</p>',
      }),
    ).toBe('Legacy description still works.');
  });
});

describe('deriveSummary', () => {
  it('returns the first real sentence, stripped of markup', () => {
    expect(
      deriveSummary(
        '<p>We build surgical robots that people trust.</p><p>More text.</p>',
      ),
    ).toBe('We build surgical robots that people trust.');
  });

  it('pads tag boundaries so stripped blocks do not fuse', () => {
    const out = deriveSummary(
      '<h2>Overview</h2><p>We are hiring a controls engineer for the arm team and beyond.</p>',
    );
    expect(out).toContain('Overview We are hiring');
  });

  it('suppresses unrendered ATS template tokens', () => {
    expect(
      deriveSummary('<p>Requisition ID: [[id]] Location: [[loc]]</p>'),
    ).toBeNull();
  });

  it('omits the line when there is no description', () => {
    expect(deriveSummary(null)).toBeNull();
    expect(deriveSummary('  ')).toBeNull();
  });

  it('truncates sentence-less text at a word boundary', () => {
    const out = deriveSummary(`<p>${'word '.repeat(60)}</p>`);
    expect(out!.length).toBeLessThanOrEqual(160);
    expect(out!.endsWith('…')).toBe(true);
  });
});
