import { describe, expect, it } from 'vitest';

import {
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
    expect(vm.stats.map((s) => s.emphasis ?? false)).toEqual([false, true, false, false]);
    // median = round((110000 + 130000) / 2) = 120000, formatted abbreviated
    expect(vm.stats[1].value).toBe('$120K');
    expect(vm.stats.at(-1)?.value.startsWith('12 ')).toBe(true);
  });

  it('omits the percentile/median stats when their inputs are absent, always keeping based-on', () => {
    const vm = toOverallSalaryVM({ avgMin: 100000, avgMax: 140000, jobCount: 1 }, 'en');
    expect(vm.stats).toHaveLength(1);
    // singular job count copy when jobCount === 1
    expect(vm.stats[0].value.startsWith('1 ')).toBe(true);
  });

  it('drops the median stat unless BOTH band bounds are present, keeping the surrounding percentiles', () => {
    // medianMin without medianMax → no median row, but p25/p75 still render.
    const vm = toOverallSalaryVM(
      { avgMin: 100000, avgMax: 140000, jobCount: 4, medianMin: 110000, p25Min: 90000, p75Max: 150000 },
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
    expect(vm.rows[0].level).toBe('Senior');
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
    const items: RailItem[] = [
      { name: 'Acme', href: '/companies/acme', range: '$100k–$140k', jobCount: 1 },
      { name: 'Globex', href: '/companies/globex', range: '$90k–$120k', jobCount: 4 },
    ];
    const vm = toSalaryRailVM('Top companies', items, 'en');
    expect(vm.title).toBe('Top companies');
    expect(vm.items[0].jobCountLabel.startsWith('1 ')).toBe(true);
    expect(vm.items[1].jobCountLabel.startsWith('4 ')).toBe(true);
    // singular vs plural noun must differ
    expect(vm.items[0].jobCountLabel.slice(2)).not.toBe(vm.items[1].jobCountLabel.slice(2));
    expect(vm.items[0].range).toBe('$100k–$140k');
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
