import { describe, expect, it } from 'vitest';

import {
  relatedMarketOptions,
  relatedSearchesToChips,
} from './related-searches';

import type { RelatedSearch } from '@cavuno/board';

const related: RelatedSearch[] = [
  {
    type: 'skill',
    slug: 'artificial-intelligence',
    canonicalSlug: 'kuenstliche-intelligenz',
    term: 'Artificial Intelligence',
    displayName: 'Künstliche Intelligenz',
    count: 12,
  },
  {
    type: 'category',
    slug: 'engineering',
    canonicalSlug: 'technik',
    term: 'Engineering',
    displayName: 'Technik',
    count: 4,
  },
  {
    type: 'market',
    slug: 'robotics',
    canonicalSlug: 'robotik',
    term: 'Robotics',
    displayName: 'Robotik',
    count: 3,
  },
];

describe('relatedSearchesToChips', () => {
  it('shows board-language names and links their canonical slugs', () => {
    expect(relatedSearchesToChips(related)).toEqual([
      {
        key: 'skill-artificial-intelligence',
        name: 'Künstliche Intelligenz',
        href: '/jobs/skills/kuenstliche-intelligenz',
      },
      { key: 'category-engineering', name: 'Technik', href: '/jobs/technik' },
      {
        key: 'market-robotics',
        name: 'Robotik',
        href: '/companies/markets/robotik',
      },
    ]);
  });
});

describe('relatedMarketOptions', () => {
  it('maps market related searches to board-language options', () => {
    expect(relatedMarketOptions(related)).toEqual([
      { slug: 'robotik', name: 'Robotik' },
    ]);
  });

  it('returns null without market entries so the caller keeps its list', () => {
    expect(relatedMarketOptions(undefined)).toBeNull();
    expect(relatedMarketOptions(related.slice(0, 2))).toBeNull();
  });
});
