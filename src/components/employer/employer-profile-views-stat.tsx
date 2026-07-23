import { Area, AreaChart, XAxis } from 'recharts';

import { m } from '../../paraglide/messages';

import type { EmployerProfileViewsVM } from '@/board/employer-stats-view-model';
import { Card, CardContent } from '@/components/ui/card';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { useDirection } from '@/components/ui/direction';
import { Spinner } from '@/components/ui/spinner';

/**
 * Compact profile-views stat for the company-profile page header — the
 * last-30-days total, with a small sparkline when there is anything to plot.
 * Presentational only: it renders from a resolved {@link EmployerProfileViewsVM}
 * (the number formatting, the honest "No views yet" zero state, and whether the
 * sparkline is worth drawing are all decided by the mapper).
 *
 * DIRECTION: the sparkline is a time series with no visible axes, but time
 * still has to run with the chrome, and recharts draws in SVG coordinates that
 * `<html dir>` does not mirror. Under RTL a HIDDEN x-axis carries `reversed`
 * — the first-class recharts flip — so the oldest bucket sits on the right
 * without the axis consuming any of the 48×128 box. Direction comes from the
 * app-wide {@link useDirection} context (see EmployerStatsChart).
 */
export function EmployerProfileViewsStat({
  vm,
}: {
  vm: EmployerProfileViewsVM;
}) {
  const isRtl = useDirection() === 'rtl';
  // Built at render so the label resolves to the active board locale.
  const chartConfig = {
    views: {
      label: m.employerStats_viewsLegend(),
      color: 'var(--color-chart-2)',
    },
  } satisfies ChartConfig;

  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">
            {m.employerProfileViews_statLabel()}
          </p>
          {vm.isEmpty ? (
            <p className="text-foreground text-lg font-semibold">
              {m.employerProfileViews_emptyText()}
            </p>
          ) : (
            <p className="text-foreground text-2xl font-semibold tabular-nums">
              {vm.total}
            </p>
          )}
        </div>
        {vm.points.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="h-12 w-32"
            role="img"
            aria-label={m.employerProfileViews_sparklineAriaLabel()}
          >
            <AreaChart
              data={vm.points}
              margin={{ top: 4, bottom: 4, left: 0, right: 0 }}
            >
              <defs>
                <linearGradient
                  id="employer-profile-views"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--color-views)"
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-views)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <XAxis hide dataKey="date" reversed={isRtl} />
              <Area
                dataKey="views"
                type="monotone"
                stroke="var(--color-views)"
                strokeWidth={2}
                fill="url(#employer-profile-views)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Deferred-load fallback for {@link EmployerProfileViewsStat} — the same compact
 * card with a spinner, so the profile form paints first and the stat reserves
 * its space instead of shifting layout when the data streams in.
 */
export function EmployerProfileViewsStatPending() {
  return (
    <Card size="sm">
      <CardContent
        className="text-muted-foreground flex items-center gap-2 text-sm"
        role="status"
        aria-live="polite"
      >
        <Spinner aria-hidden />
        <span>{m.employerProfileViews_loadingLabel()}</span>
      </CardContent>
    </Card>
  );
}
