import { describe, expect, it } from 'vitest';

import { toBlogSuggestionVM } from './keyword-suggestion';

describe('toBlogSuggestionVM', () => {
  it('maps a post suggestion to its title and slug', () => {
    expect(
      toBlogSuggestionVM({
        type: 'post',
        slug: 'hiring-in-2026',
        title: 'Hiring in 2026',
      }),
    ).toEqual({
      id: 'post:hiring-in-2026',
      type: 'post',
      slug: 'hiring-in-2026',
      name: 'Hiring in 2026',
    });
  });

  it('maps a tag suggestion to its display name', () => {
    expect(
      toBlogSuggestionVM({ type: 'tag', slug: 'culture', name: 'Culture' }),
    ).toEqual({
      id: 'tag:culture',
      type: 'tag',
      slug: 'culture',
      name: 'Culture',
    });
  });
});
