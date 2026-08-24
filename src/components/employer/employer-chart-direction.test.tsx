// @vitest-environment jsdom
/**
 * The employer charts mirror under RTL (docs/theming.md
 * §"Direction that lives in JS").
 *
 * recharts draws into an SVG viewport, so `<html dir="rtl">` mirrors the card
 * around the chart but NOT the plot inside it — the flip has to be passed as
 * props. These pin that wiring symbolically: given the direction the root
 * document publishes, which axis props does the component hand recharts?
 * recharts itself is stubbed, so nothing here depends on jsdom laying out an
 * SVG (it can't) or on how recharts renders a tick.
 *
 * The contract, both directions:
 *   • LTR is untouched — time runs left-to-right, values on the left.
 *   • RTL reverses the time axis and moves the value axis to the right.
 *   • the sparkline, which has no visible axes, still reverses time — via a
 *     HIDDEN axis, so the flip costs it no space.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  EmployerProfileViewsStat,
  employerProfileViewsDirection,
} from './employer-profile-views-stat';
import {
  EmployerStatsChart,
  employerStatsChartDirection,
} from './employer-stats-chart';

import type {
  EmployerProfileViewsVM,
  EmployerStatsChartVM,
} from '@/board/employer-stats-view-model';
import { DirectionProvider } from '@/components/ui/direction';

const chartVm: EmployerStatsChartVM = {
  points: [
    { date: '2026-07-01', label: 'first bucket', views: 12, applyClicks: 3 },
    { date: '2026-07-02', label: 'last bucket', views: 9, applyClicks: 1 },
  ],
  isEmpty: false,
  totalViews: 21,
  totalApplyClicks: 4,
};

const sparklineVm: EmployerProfileViewsVM = {
  total: 'twenty-one',
  isEmpty: false,
  points: [
    { date: '2026-07-01', label: 'first bucket', views: 12 },
    { date: '2026-07-02', label: 'last bucket', views: 9 },
  ],
};

/** Mount under the direction context the root document publishes. */
function renderIn(direction: 'ltr' | 'rtl', ui: React.ReactNode) {
  return render(
    <DirectionProvider direction={direction}>{ui}</DirectionProvider>,
  );
}

afterEach(cleanup);

describe('EmployerStatsChart direction', () => {
  it('leaves the axes alone under LTR', () => {
    expect(employerStatsChartDirection('ltr')).toMatchObject({
      xAxisReversed: false,
      yAxisOrientation: 'left',
    });
  });

  it('reverses time and moves the value axis to the right under RTL', () => {
    expect(employerStatsChartDirection('rtl')).toMatchObject({
      xAxisReversed: true,
      yAxisOrientation: 'right',
    });
  });

  it('mirrors the tick gutter with the axis', () => {
    expect(employerStatsChartDirection('ltr').margin).toEqual({
      left: 4,
      right: 8,
    });
    expect(employerStatsChartDirection('rtl').margin).toEqual({
      left: 8,
      right: 4,
    });
  });

  it('draws no axes at all when there is nothing to plot', () => {
    renderIn('rtl', <EmployerStatsChart vm={{ ...chartVm, isEmpty: true }} />);
    expect(document.querySelector('.recharts-xAxis')).toBeNull();
  });
});

describe('EmployerProfileViewsStat direction', () => {
  it('reverses the sparkline with a hidden axis under RTL', () => {
    expect(employerProfileViewsDirection('rtl')).toBe(true);
  });

  it('leaves the sparkline unreversed under LTR', () => {
    expect(employerProfileViewsDirection('ltr')).toBe(false);
  });

  it('draws no sparkline when the mapper withheld the points', () => {
    renderIn(
      'rtl',
      <EmployerProfileViewsStat vm={{ ...sparklineVm, points: [] }} />,
    );
    expect(document.querySelector('.recharts-xAxis')).toBeNull();
  });
});
