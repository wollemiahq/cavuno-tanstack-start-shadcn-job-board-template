import { describe, expect, it } from 'vitest';

import { sortBlogSuggestions, toBlogSuggestionVM } from './keyword-suggestion';

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

describe('sortBlogSuggestions', () => {
  const post = (slug: string) => ({
    id: `post:${slug}`,
    type: 'post' as const,
    slug,
    name: slug,
  });
  const tag = (slug: string) => ({
    id: `tag:${slug}`,
    type: 'tag' as const,
    slug,
    name: slug,
  });

  it('lifts every post above every tag', () => {
    const sorted = sortBlogSuggestions([
      tag('releases'),
      post('release-notes'),
      tag('changelog'),
      post('what-shipped'),
    ]);

    expect(sorted.map((s) => s.id)).toEqual([
      'post:release-notes',
      'post:what-shipped',
      'tag:releases',
      'tag:changelog',
    ]);
  });

  it("keeps the API's relevance order within each kind", () => {
    const sorted = sortBlogSuggestions([
      post('best-match'),
      post('worse-match'),
      tag('best-tag'),
      tag('worse-tag'),
    ]);

    expect(sorted.map((s) => s.slug)).toEqual([
      'best-match',
      'worse-match',
      'best-tag',
      'worse-tag',
    ]);
  });

  it('does not mutate the input', () => {
    const input = [tag('releases'), post('release-notes')];
    sortBlogSuggestions(input);
    expect(input.map((s) => s.type)).toEqual(['tag', 'post']);
  });
});
