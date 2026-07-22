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
  salaryLocationSkillsPath,
  salaryLocationTitlesPath,
  salarySkillInLocationPath,
  salarySkillLocationsPath,
  salaryTitleInLocationPath,
  salaryTitleLocationsPath,
  toOverallSalaryVM,
  toSalaryBreadcrumbVM,
  toSalaryFaqVM,
  toSalaryRailVM,
  toSeniorityTableVM,
  type RailItem,
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
});
