import { fieldLabel } from '@cavuno/board/format';
import {
  companySalaryPath,
  salaryLocationPath,
  salarySkillPath,
  salaryTitlePath,
} from '@cavuno/board/paths';
import { formatRange, formatUsd } from '@cavuno/board/seo';
import { describe, expect, it } from 'vitest';

import {
  companyCategorySalaryPath,
  salaryCompanyTitle,
  salaryLocationSkillsPath,
  salaryLocationTitlesPath,
  salaryPlaceTitle,
  salarySkillInLocationPath,
  salarySkillLocationsPath,
  salaryTitleInLocationPath,
  salaryTitleLocationsPath,
  toLocationHierarchyCrumbs,
  toOverallSalaryVM,
  toSalaryBreadcrumbVM,
  toSalaryFaqVM,
  toSalaryRailVM,
  toSeniorityTableVM,
  type RailItem,
  type SalaryLocationNode,
  type SeniorityRow,
} from './salary-view-model';

/**
 * The salary mappers are Layer 1b — they own the derivations (median from
 * the median band, the p25/median/p75/based-on stat order + emphasis,
 * seniority label resolution, board-baseline dash, diff sign, job-count
 * pluralisation). These pin them so the pure-markup sections can be
 * restyled without changing the data.
 */
describe('toOverallSalaryVM', () => {
  it('averages the median band and emphasises only the median stat, in p25→median→p75→basedOn order', () => {
    const vm = toOverallSalaryVM(
      {
        avgMin: 100000,
        avgMax: 140000,
        jobCount: 12,
        medianMin: 110000,
        medianMax: 130000,
        p25Min: 90000,
        p75Max: 150000,
      },
      'en',
    );
    expect(vm.stats.map((s) => s.emphasis ?? false)).toEqual([
      false,
      true,
      false,
      false,
    ]);
    // Delegation-style: median = round((110000 + 130000) / 2) = 120000,
    // formatted by the SAME SDK helper the mapper delegates to — the
    // formatted shape is pinned once, by the SDK's goldens.
    expect(vm.stats[1].value).toBe(formatUsd('en', 120000));
    expect(vm.headlineValue).toBe(formatRange('en', 100000, 140000));
    expect(vm.stats.at(-1)?.value.startsWith('12 ')).toBe(true);
  });

  it('omits the percentile/median stats when their inputs are absent, always keeping based-on', () => {
    const vm = toOverallSalaryVM(
      { avgMin: 100000, avgMax: 140000, jobCount: 1 },
      'en',
    );
    expect(vm.stats).toHaveLength(1);
    // singular job count copy when jobCount === 1
    expect(vm.stats[0].value.startsWith('1 ')).toBe(true);
  });

  it('drops the median stat unless BOTH band bounds are present, keeping the surrounding percentiles', () => {
    // medianMin without medianMax → no median row, but p25/p75 still render.
    const vm = toOverallSalaryVM(
      {
        avgMin: 100000,
        avgMax: 140000,
        jobCount: 4,
        medianMin: 110000,
        p25Min: 90000,
        p75Max: 150000,
      },
      'en',
    );
    expect(vm.stats.some((s) => s.emphasis)).toBe(false);
    expect(vm.stats).toHaveLength(3); // p25, p75, based-on
  });
});

describe('toSalaryBreadcrumbVM', () => {
  it('resolves the aria label and passes the crumb items through untouched', () => {
    const items = [{ name: 'Home', href: '/' }, { name: 'Salaries' }];
    const vm = toSalaryBreadcrumbVM(items, 'en');
    expect(vm.ariaLabel.length).toBeGreaterThan(0);
    expect(vm.items).toEqual(items);
  });
});

describe('toSeniorityTableVM', () => {
  const rows: SeniorityRow[] = [
    {
      seniority: 'senior',
      avgSalaryMin: 120000,
      avgSalaryMax: 160000,
      jobCount: 5,
      boardAvgMin: 100000,
      boardAvgMax: 140000,
      diffPercent: 12,
    },
    {
      seniority: 'junior',
      avgSalaryMin: 60000,
      avgSalaryMax: 80000,
      jobCount: 3,
      boardAvgMin: null,
      boardAvgMax: null,
      diffPercent: -8,
    },
  ];
  const vm = toSeniorityTableVM(rows, 'en');

  it('resolves the seniority key through the taxonomy label', () => {
    // Delegation-style: same SDK label call the mapper makes.
    expect(vm.rows[0].level).toBe(fieldLabel('en', 'senior'));
  });

  it('renders a dash baseline when the board average is missing', () => {
    expect(vm.rows[1].baseline).toBe('—');
  });

  it('signs the diff and flags direction', () => {
    expect(vm.rows[0].diff).toEqual({ text: '+12%', positive: true });
    expect(vm.rows[1].diff).toEqual({ text: '-8%', positive: false });
  });
});

describe('toSalaryRailVM', () => {
  it('pluralises the per-item job count and preserves the pre-formatted range + href', () => {
    // `range` is a pass-through field pre-formatted by the route, so the
    // fixture value is arbitrary — deliberately NOT formatter-shaped.
    const items: RailItem[] = [
      {
        name: 'Acme',
        href: '/companies/acme',
        range: 'range a',
        jobCount: 1,
      },
      {
        name: 'Globex',
        href: '/companies/globex',
        range: 'range b',
        jobCount: 4,
      },
    ];
    const vm = toSalaryRailVM('Top companies', items, 'en');
    expect(vm.title).toBe('Top companies');
    expect(vm.items[0].jobCountLabel.startsWith('1 ')).toBe(true);
    expect(vm.items[1].jobCountLabel.startsWith('4 ')).toBe(true);
    // singular vs plural noun must differ
    expect(vm.items[0].jobCountLabel.slice(2)).not.toBe(
      vm.items[1].jobCountLabel.slice(2),
    );
    expect(vm.items[0].range).toBe('range a');
    expect(vm.items[0].href).toBe('/companies/acme');
  });
});

describe('toSalaryFaqVM', () => {
  it('resolves the FAQ heading and passes the Q/A pairs through untouched', () => {
    const items = [{ q: 'How much?', a: 'A lot.' }];
    const vm = toSalaryFaqVM(items, 'en');
    expect(vm.heading.length).toBeGreaterThan(0);
    expect(vm.items).toEqual(items);
  });
});

/**
 * Salary URL composers (Layer 1b). These pin the CORRECTED cross-link
 * behaviour: every composed salary href is built ON TOP of the canonical
 * SDK path helpers (`@cavuno/board/paths`), never string-built. The relational
 * assertions (composed === base + suffix) guarantee that if the SDK's URL
 * structure ever changes, these composers move with it and cannot drift.
 */
describe('salary path composers', () => {
  it('companyCategorySalaryPath extends the company salary page (never the profile)', () => {
    expect(companyCategorySalaryPath('acme', 'engineering')).toBe(
      `${companySalaryPath('acme')}/engineering`,
    );
    // The exemplar bug: a company salary card must NOT point at the profile.
    expect(companyCategorySalaryPath('acme', 'engineering')).not.toBe(
      '/companies/acme',
    );
  });

  it('salaryTitleInLocationPath / salaryTitleLocationsPath compose on salaryTitlePath', () => {
    expect(salaryTitleInLocationPath('data-scientist', 'london')).toBe(
      `${salaryTitlePath('data-scientist')}/london`,
    );
    expect(salaryTitleLocationsPath('data-scientist')).toBe(
      `${salaryTitlePath('data-scientist')}/locations`,
    );
  });

  it('salarySkillInLocationPath / salarySkillLocationsPath compose on salarySkillPath', () => {
    expect(salarySkillInLocationPath('react', 'berlin')).toBe(
      `${salarySkillPath('react')}/berlin`,
    );
    expect(salarySkillLocationsPath('react')).toBe(
      `${salarySkillPath('react')}/locations`,
    );
  });

  it('salaryLocationTitlesPath / salaryLocationSkillsPath compose on salaryLocationPath', () => {
    expect(salaryLocationTitlesPath('london')).toBe(
      `${salaryLocationPath('london')}/titles`,
    );
    expect(salaryLocationSkillsPath('london')).toBe(
      `${salaryLocationPath('london')}/skills`,
    );
  });

  // The cross-axis-link regression these composers guard (formerly pinned by a
  // grep of each salary route's source): a salary detail's "top {axis}" rail
  // must land on the CROSS-AXIS "{Entity} salaries in {Place}" page — which the
  // loader resolves + 308s so the target always has data — never the bare
  // single-axis page, which dead-ends for a place/entity that only exists
  // inside the other axis's sample.
  it('cross-axis rails resolve the entity×place page, never the bare single-axis dead end', () => {
    // Title / skill detail top-locations rails → the entity×place page, not the
    // bare /salaries/locations/{place} page.
    expect(salaryTitleInLocationPath('data-scientist', 'london')).not.toBe(
      salaryLocationPath('london'),
    );
    expect(salarySkillInLocationPath('react', 'berlin')).not.toBe(
      salaryLocationPath('berlin'),
    );

    // Location detail top-titles / top-skills keep the place as the SECOND
    // segment, so the rail stays scoped to the current place. Binding order is
    // load-bearing — the two axes never collapse to the same URL.
    expect(salaryTitleInLocationPath('data-scientist', 'london')).toBe(
      `${salaryTitlePath('data-scientist')}/london`,
    );
    expect(salarySkillInLocationPath('react', 'london')).toBe(
      `${salarySkillPath('react')}/london`,
    );
    expect(salaryTitleInLocationPath('london', 'data-scientist')).not.toBe(
      salaryTitleInLocationPath('data-scientist', 'london'),
    );

    // Company competitor cards stay on the salary path (category-scoped on a
    // category page), never the bare company profile.
    expect(companyCategorySalaryPath('stripe', 'engineering')).toBe(
      `${companySalaryPath('stripe')}/engineering`,
    );
  });
});

/**
 * The location breadcrumb hierarchy (Layer 1b). Rebuilt from the flat
 * `salaries.locations.list()` tree (the only public-SDK source of ancestry),
 * it links every ANCESTOR to its own salary page and leaves the CURRENT place
 * terminal — mirroring the hosted board, which reads the same chain from its
 * internal places table.
 */
describe('toLocationHierarchyCrumbs', () => {
  const tree: SalaryLocationNode[] = [
    {
      placeSlug: 'united-states',
      placeName: 'United States',
      parentSlug: null,
    },
    { placeSlug: 'texas', placeName: 'Texas', parentSlug: 'united-states' },
    { placeSlug: 'austin', placeName: 'Austin', parentSlug: 'texas' },
  ];

  it('links every ancestor and leaves the current place terminal, country → current', () => {
    const crumbs = toLocationHierarchyCrumbs(tree, 'austin', 'Austin');
    expect(crumbs).toEqual([
      { name: 'United States', href: salaryLocationPath('united-states') },
      { name: 'Texas', href: salaryLocationPath('texas') },
      { name: 'Austin' },
    ]);
    // The terminal crumb never carries an href.
    expect(crumbs.at(-1)?.href).toBeUndefined();
  });

  it('falls back to a single terminal crumb when the place is absent from the tree', () => {
    expect(toLocationHierarchyCrumbs(tree, 'nowhere', 'Nowhere')).toEqual([
      { name: 'Nowhere' },
    ]);
  });

  it('renders a top-level place as a single terminal crumb', () => {
    expect(
      toLocationHierarchyCrumbs(tree, 'united-states', 'United States'),
    ).toEqual([{ name: 'United States' }]);
  });
});

/**
 * Salary <title> frames route through the SDK lexicon so a tenant inherits the
 * canonical plural, board-localized phrasing (never a starter-local singular
 * duplicate). These pin the CONTRACT — the null-range branch is handled, and
 * the entity/place variants differ — not the exact lexicon copy.
 */
describe('salary title frames', () => {
  it('salaryPlaceTitle picks the ranged vs no-range frame and never emits an empty range', () => {
    // Neutral, non-formatter-shaped range input (doctrine gate): the branch
    // under test is "ranged vs no-range", not the range's exact copy.
    const ranged = salaryPlaceTitle('en', 'Austin', 'pay range');
    const bare = salaryPlaceTitle('en', 'Austin', null);
    expect(ranged).not.toBe(bare);
    expect(ranged).toContain('Austin');
    expect(bare).toContain('Austin');
    expect(bare).not.toContain('()');
  });

  it('salaryCompanyTitle accepts a null range without fabricating a band', () => {
    const bare = salaryCompanyTitle('en', 'Acme', null);
    expect(bare).toContain('Acme');
    expect(bare).not.toContain('()');
  });
});
