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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  EmployerProfileViewsVM,
  EmployerStatsChartVM,
} from '@/board/employer-stats-view-model';
import { DirectionProvider } from '@/components/ui/direction';

/** Props every stubbed axis saw, in render order. */
const axes = vi.hoisted(() => ({
  x: [] as Record<string, unknown>[],
  y: [] as Record<string, unknown>[],
  chart: [] as Record<string, unknown>[],
}));

// Stub recharts wholesale: jsdom has no layout, so a real chart would measure
// to 0×0 and render no axes at all. The components under test are the subject,
// not recharts' renderer.
vi.mock('recharts', () => {
  // The chart wrappers render an <svg> host so the real `<defs>` /
  // `<linearGradient>` children land in the namespace React expects.
  const chartHost =
    (bucket: Record<string, unknown>[]) =>
    ({ children, ...props }: React.ComponentProps<'svg'>) => {
      bucket.push(props);
      return <svg>{children}</svg>;
    };
  const record =
    (bucket: Record<string, unknown>[]) => (props: Record<string, unknown>) => {
      bucket.push(props);
      return null;
    };
  return {
    ResponsiveContainer: ({ children }: React.ComponentProps<'div'>) => (
      <div>{children}</div>
    ),
    ComposedChart: chartHost(axes.chart),
    AreaChart: chartHost(axes.chart),
    CartesianGrid: () => null,
    Area: () => null,
    Tooltip: () => null,
    Legend: () => null,
    XAxis: record(axes.x),
    YAxis: record(axes.y),
  };
});

const { EmployerStatsChart } = await import('./employer-stats-chart');
const { EmployerProfileViewsStat } =
  await import('./employer-profile-views-stat');

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

beforeEach(() => {
  axes.x.length = 0;
  axes.y.length = 0;
  axes.chart.length = 0;
});
afterEach(cleanup);

describe('EmployerStatsChart direction', () => {
  it('leaves the axes alone under LTR', () => {
    renderIn('ltr', <EmployerStatsChart vm={chartVm} />);
    expect(axes.x[0]?.reversed).toBe(false);
    expect(axes.y[0]?.orientation).toBe('left');
  });

  it('reverses time and moves the value axis to the right under RTL', () => {
    renderIn('rtl', <EmployerStatsChart vm={chartVm} />);
    expect(axes.x[0]?.reversed).toBe(true);
    expect(axes.y[0]?.orientation).toBe('right');
  });

  it('mirrors the tick gutter with the axis', () => {
    renderIn('ltr', <EmployerStatsChart vm={chartVm} />);
    expect(axes.chart[0]?.margin).toEqual({ left: 4, right: 8 });
    cleanup();
    axes.chart.length = 0;
    renderIn('rtl', <EmployerStatsChart vm={chartVm} />);
    expect(axes.chart[0]?.margin).toEqual({ left: 8, right: 4 });
  });

  it('draws no axes at all when there is nothing to plot', () => {
    renderIn('rtl', <EmployerStatsChart vm={{ ...chartVm, isEmpty: true }} />);
    expect(axes.x).toHaveLength(0);
  });
});

describe('EmployerProfileViewsStat direction', () => {
  it('reverses the sparkline with a hidden axis under RTL', () => {
    renderIn('rtl', <EmployerProfileViewsStat vm={sparklineVm} />);
    expect(axes.x[0]?.reversed).toBe(true);
    // Hidden: the flip must not steal height from the 48px sparkline box.
    expect(axes.x[0]?.hide).toBe(true);
  });

  it('leaves the sparkline unreversed under LTR', () => {
    renderIn('ltr', <EmployerProfileViewsStat vm={sparklineVm} />);
    expect(axes.x[0]?.reversed).toBe(false);
    expect(axes.x[0]?.hide).toBe(true);
  });

  it('draws no sparkline when the mapper withheld the points', () => {
    renderIn(
      'rtl',
      <EmployerProfileViewsStat vm={{ ...sparklineVm, points: [] }} />,
    );
    expect(axes.x).toHaveLength(0);
  });
});
