import {
  Area,
  CartesianGrid,
  ComposedChart,
  XAxis,
  YAxis,
} from 'recharts';

import { m } from '../../paraglide/messages';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import type { EmployerStatsChartVM } from '@/board/employer-stats-view-model';
import { ChartColumnIcon } from 'lucide-react';

/**
 * Employer reporting chart — daily views + apply clicks across the company's
 * jobs over the API's last-30-days window. Presentational only: it renders from
 * a resolved {@link EmployerStatsChartVM} (formatting + the all-zero empty state
 * are decided by the mapper).
 *
 * The board theme is monochrome, so the two series can't lean on hue alone. We
 * separate them with STRONG secondary encoding: views is a filled area (the
 * recessive context volume), apply clicks a dashed line on top (the funnel
 * signal), plus an always-present legend and the shared tooltip. All-zero
 * windows render an honest "No activity yet" panel at the chart's height rather
 * than a flat line on a collapsed axis.
 */

// 30 daily buckets is too many x-ticks; thin them so labels never collide.
const X_TICK_INTERVAL = 4;

export function EmployerStatsChart({ vm }: { vm: EmployerStatsChartVM }) {
  // Built at render so the legend labels resolve to the active board locale
  // (module-scope `m.*` would freeze them to the import-time locale).
  const chartConfig = {
    views: {
      label: m.employerStats_viewsLegend(),
      color: 'var(--color-chart-2)',
    },
    applyClicks: {
      label: m.employerStats_applyClicksLegend(),
      color: 'var(--color-chart-4)',
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.employerStats_chartTitle()}</CardTitle>
        <CardDescription>{m.employerStats_chartCaption()}</CardDescription>
      </CardHeader>
      <CardContent>
        {vm.isEmpty ? (
          <Empty className="min-h-64 border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartColumnIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle>{m.employerStats_emptyTitle()}</EmptyTitle>
              <EmptyDescription>
                {m.employerStats_emptyText()}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="h-64 w-full"
            role="img"
            aria-label={m.employerStats_chartAriaLabel()}
          >
            <ComposedChart accessibilityLayer data={vm.points} margin={{ left: 4, right: 8 }}>
              <defs>
                <linearGradient id="employer-stats-views" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-views)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-views)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={X_TICK_INTERVAL}
                minTickGap={16}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={32}
                allowDecimals={false}
                tickMargin={4}
              />
              <ChartTooltip cursor content={<ChartTooltipContent indicator="line" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                dataKey="views"
                name="views"
                type="monotone"
                stroke="var(--color-views)"
                strokeWidth={2}
                fill="url(#employer-stats-views)"
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
              {/* Rendered as a transparent-fill Area (not Line) so recharts'
                  type-grouped legend keeps Views — the dominant series — first. */}
              <Area
                dataKey="applyClicks"
                name="applyClicks"
                type="monotone"
                stroke="var(--color-applyClicks)"
                strokeWidth={2}
                strokeDasharray="5 4"
                fill="transparent"
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Deferred-load fallback for {@link EmployerStatsChart} — the same card at the
 * chart's height with a spinner, so the table above paints first and the chart
 * area reserves its space instead of shifting layout when the data streams in.
 */
export function EmployerStatsChartPending() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.employerStats_chartTitle()}</CardTitle>
        <CardDescription>{m.employerStats_chartCaption()}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="text-muted-foreground flex h-64 w-full items-center justify-center gap-2 text-sm"
          role="status"
          aria-live="polite"
        >
          <Spinner aria-hidden />
          <span>{m.employerStats_loadingLabel()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
