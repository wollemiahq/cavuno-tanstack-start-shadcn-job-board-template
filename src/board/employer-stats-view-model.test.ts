import { describe, expect, it } from 'vitest';

import {
  STAT_PLACEHOLDER,
  toEmployerJobStatCellsVM,
  toEmployerJobStatsIndex,
  toEmployerProfileViewsVM,
  toEmployerStatsChartVM,
} from './employer-stats-view-model';

import type {
  EmployerJobStat,
  EmployerJobStatsPoint,
  EmployerProfileViewsPoint,
} from '@cavuno/board';

function stat(overrides: Partial<EmployerJobStat> = {}): EmployerJobStat {
  return {
    object: 'employer_job_stat',
    jobId: 'job-1',
    views: 0,
    applyClicks: 0,
    applications: 0,
    ...overrides,
  };
}

function point(
  overrides: Partial<EmployerJobStatsPoint> = {},
): EmployerJobStatsPoint {
  return {
    object: 'employer_job_stats_point',
    date: '2026-07-01',
    views: 0,
    applyClicks: 0,
    ...overrides,
  };
}

describe('toEmployerJobStatsIndex', () => {
  it('keys the stats by jobId for an O(1) per-row join', () => {
    const index = toEmployerJobStatsIndex([
      stat({ jobId: 'a', views: 1 }),
      stat({ jobId: 'b', views: 2 }),
    ]);
    expect(index.get('a')?.views).toBe(1);
    expect(index.get('b')?.views).toBe(2);
    expect(index.get('missing')).toBeUndefined();
  });
});

describe('toEmployerJobStatCellsVM', () => {
  it('formats present counts with the locale separators', () => {
    const cells = toEmployerJobStatCellsVM(
      stat({ views: 1234, applyClicks: 56, applications: 7 }),
      'en-US',
    );
    expect(cells.views).toBe('1,234');
    expect(cells.applyClicks).toBe('56');
    expect(cells.applications).toBe('7');
    expect(cells.applicationsNotApplicable).toBe(false);
  });

  it('renders the dash for an external-apply job, never a zero', () => {
    const cells = toEmployerJobStatCellsVM(
      stat({ views: 10, applyClicks: 2, applications: null }),
      'en-US',
    );
    expect(cells.views).toBe('10');
    expect(cells.applications).toBe(STAT_PLACEHOLDER);
    expect(cells.applicationsNotApplicable).toBe(true);
  });

  it('dashes every metric for a draft / missing stats row', () => {
    const cells = toEmployerJobStatCellsVM(undefined, 'en-US');
    expect(cells.views).toBe(STAT_PLACEHOLDER);
    expect(cells.applyClicks).toBe(STAT_PLACEHOLDER);
    expect(cells.applications).toBe(STAT_PLACEHOLDER);
    expect(cells.applicationsNotApplicable).toBe(true);
  });

  it('keeps a real zero as a formatted zero, distinct from the dash', () => {
    const cells = toEmployerJobStatCellsVM(
      stat({ views: 0, applyClicks: 0, applications: 0 }),
      'en-US',
    );
    expect(cells.views).toBe('0');
    expect(cells.applications).toBe('0');
    expect(cells.applicationsNotApplicable).toBe(false);
  });
});

describe('toEmployerStatsChartVM', () => {
  it('maps buckets in order with a formatted axis label', () => {
    const vm = toEmployerStatsChartVM(
      [
        point({ date: '2026-07-01', views: 12, applyClicks: 3 }),
        point({ date: '2026-07-02', views: 18, applyClicks: 5 }),
      ],
      'en-US',
    );
    expect(vm.points).toHaveLength(2);
    expect(vm.points[0].date).toBe('2026-07-01');
    expect(vm.points[0].label).not.toBe('');
    expect(vm.totalViews).toBe(30);
    expect(vm.totalApplyClicks).toBe(8);
    expect(vm.isEmpty).toBe(false);
  });

  it('is empty when there are no buckets', () => {
    expect(toEmployerStatsChartVM([], 'en-US').isEmpty).toBe(true);
  });

  it('is empty when every bucket is a zero for both series', () => {
    const vm = toEmployerStatsChartVM(
      [
        point({ views: 0, applyClicks: 0 }),
        point({ views: 0, applyClicks: 0 }),
      ],
      'en-US',
    );
    expect(vm.isEmpty).toBe(true);
  });
});

function viewsPoint(
  overrides: Partial<EmployerProfileViewsPoint> = {},
): EmployerProfileViewsPoint {
  return {
    object: 'employer_profile_views_point',
    date: '2026-07-01',
    views: 0,
    ...overrides,
  };
}

describe('toEmployerProfileViewsVM', () => {
  it('formats the total and plots the sparkline when there are views', () => {
    const vm = toEmployerProfileViewsVM(
      1204,
      [
        viewsPoint({ date: '2026-07-01', views: 4 }),
        viewsPoint({ date: '2026-07-02', views: 8 }),
      ],
      'en-US',
    );

    expect(vm.total).toBe('1,204');
    expect(vm.isEmpty).toBe(false);
    expect(vm.points).toHaveLength(2);
    expect(vm.points[0]).toMatchObject({ date: '2026-07-01', views: 4 });
    expect(vm.points[0].label).not.toBe('');
  });

  it('is the honest zero state when the total is zero (also covers an outage)', () => {
    const vm = toEmployerProfileViewsVM(0, [], 'en-US');

    expect(vm.total).toBe('0');
    expect(vm.isEmpty).toBe(true);
    expect(vm.points).toEqual([]);
  });

  it('never plots an all-zero sparkline even when buckets exist', () => {
    const vm = toEmployerProfileViewsVM(
      0,
      [viewsPoint({ views: 0 }), viewsPoint({ views: 0 })],
      'en-US',
    );

    expect(vm.isEmpty).toBe(true);
    expect(vm.points).toEqual([]);
  });
});
