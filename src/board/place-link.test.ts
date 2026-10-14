import { describe, expect, it } from 'vitest';

import { placeLinkSlug } from './place-link';

describe('placeLinkSlug', () => {
  it('links a translated place by its board-language slug', () => {
    expect(
      placeLinkSlug({ slug: 'the-hague', canonicalSlug: 'den-haag' }),
    ).toBe('den-haag');
  });

  it('keeps the source slug on an English board', () => {
    expect(placeLinkSlug({ slug: 'london', canonicalSlug: 'london' })).toBe(
      'london',
    );
  });

  it('falls back to the source slug when there is no board-language slug', () => {
    expect(placeLinkSlug({ slug: 'london', canonicalSlug: null })).toBe(
      'london',
    );
  });

  it('returns null for an unslugged place', () => {
    expect(placeLinkSlug({ slug: null, canonicalSlug: null })).toBeNull();
  });
});
