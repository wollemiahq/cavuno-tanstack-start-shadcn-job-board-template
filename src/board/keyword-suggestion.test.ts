import { describe, expect, it } from 'vitest';

import {
  dedupeKeywordSuggestions,
  sortBlogSuggestions,
  toBlogSuggestionVM,
} from './keyword-suggestion';

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

describe('dedupeKeywordSuggestions', () => {
  const category = (slug: string, name: string) => ({
    id: `category:${slug}`,
    type: 'category' as const,
    slug,
    name,
  });
  const skill = (slug: string, name: string) => ({
    id: `skill:${slug}`,
    type: 'skill' as const,
    slug,
    name,
  });

  it('collapses a category and a skill sharing a name, keeping the category', () => {
    // The slugs DIFFER on purpose: dedupe keys on the display name, because
    // the name is what the visitor sees and cannot tell apart. Same-slug
    // fixtures would pass against a slug-keyed implementation too.
    const deduped = dedupeKeywordSuggestions([
      skill('robotics-engineering', 'Robotics'),
      category('robotics', 'Robotics'),
    ]);

    expect(deduped.map((s) => s.id)).toEqual(['category:robotics']);
  });

  it('keeps the losing row position when the category arrives second', () => {
    const deduped = dedupeKeywordSuggestions([
      skill('robotics', 'Robotics'),
      category('welding', 'Welding'),
      category('robotics', 'Robotics'),
    ]);

    expect(deduped.map((s) => s.name)).toEqual(['Robotics', 'Welding']);
  });

  it('matches names case- and whitespace-insensitively', () => {
    const deduped = dedupeKeywordSuggestions([
      category('robotics', ' Robotics '),
      skill('robotics-engineering', 'robotics'),
    ]);

    // Asserts the survivor, not just the count — a last-wins variant would
    // keep the skill and still leave one row.
    expect(deduped.map((s) => s.id)).toEqual(['category:robotics']);
  });

  it('leaves distinct names alone and does not mutate the input', () => {
    const input = [
      category('robotics', 'Robotics'),
      skill('ros', 'Robot Operating System'),
    ];
    const deduped = dedupeKeywordSuggestions(input);

    expect(deduped).toHaveLength(2);
    expect(input.map((s) => s.id)).toEqual(['category:robotics', 'skill:ros']);
  });
});
