import { describe, expect, it } from 'vitest';

import { relatedSearchesToChips } from './related-searches';

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

describe('relatedSearchesToChips on a place', () => {
  const onPlace = [
    ...related,
    { ...related[1]!, slug: 'security', canonicalSlug: 'sicherheit', count: 9 },
  ];

  it('links a term with enough jobs to the place combination page', () => {
    const hrefs = relatedSearchesToChips(onPlace, 'berlin').map((c) => c.href);
    expect(hrefs).toEqual([
      '/jobs/locations/berlin/skills/kuenstliche-intelligenz',
      // Below the thin-content floor: the board-wide page, never a thin combination.
      '/jobs/technik',
      '/companies/markets/robotik',
      '/jobs/locations/berlin/sicherheit',
    ]);
  });

  it('links board-wide pages off a place', () => {
    expect(relatedSearchesToChips(onPlace, null).map((c) => c.href)).toEqual([
      '/jobs/skills/kuenstliche-intelligenz',
      '/jobs/technik',
      '/companies/markets/robotik',
      '/jobs/sicherheit',
    ]);
  });
});
