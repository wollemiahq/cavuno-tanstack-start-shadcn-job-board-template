import { Link } from '@tanstack/react-router';
import { ArrowRight, ChartNoAxesColumn } from 'lucide-react';

import type {
  OverallSalaryVM,
  SalaryFaqVM,
  SalaryRailVM,
  SeniorityTableVM,
} from '@/board/salary-view-model';
import { CompanyAvatar } from '@/components/board/company-avatar';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type { RailItem } from '@/board/salary-view-model';

function MetricPanel({
  label,
  value,
  suffix,
  emphasis,
}: {
  label: string;
  value: string;
  suffix?: string;
  emphasis?: boolean;
}) {
  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p
          className={cn(
            'text-2xl font-semibold tabular-nums',
            emphasis ? 'text-foreground' : 'text-card-foreground',
          )}
        >
          {value}
          {suffix ? (
            <span className="text-muted-foreground ms-1.5 text-sm font-normal">
              {suffix}
            </span>
          ) : null}
        </p>
      </CardContent>
    </Card>
  );
}

export function OverallSalaryCard({ vm }: { vm: OverallSalaryVM }) {
  return (
    <section className="flex flex-col gap-4">
      <MetricPanel
        label={vm.headlineLabel}
        value={vm.headlineValue}
        suffix={vm.perYearSuffix}
      />
      {vm.stats.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {vm.stats.map((stat) => (
            <MetricPanel
              key={stat.label}
              label={stat.label}
              value={stat.value}
              emphasis={stat.emphasis}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function CompactCompanySalarySummary({
  title,
  vm,
}: {
  title: string;
  vm: OverallSalaryVM;
}) {
  const sample = vm.stats.at(-1);

  return (
    <section aria-label={title} className="space-y-3">
      <h3 className="text-foreground text-sm font-semibold">{title}</h3>
      <Card size="sm">
        <CardContent className="space-y-1">
          <p className="text-muted-foreground text-sm">{vm.headlineLabel}</p>
          <p className="text-card-foreground text-xl font-semibold tabular-nums">
            {vm.headlineValue}
            <span className="text-muted-foreground ms-1.5 text-sm font-normal">
              {vm.perYearSuffix}
            </span>
          </p>
          {sample ? (
            <p className="text-muted-foreground text-sm">
              {sample.label} {sample.value}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

export function SenioritySalaryTable({ vm }: { vm: SeniorityTableVM }) {
  if (vm.rows.length === 0) return null;

  return (
    <Card className="gap-0 py-0">
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">{vm.headers.level}</TableHead>
              <TableHead className="px-4">{vm.headers.avg}</TableHead>
              <TableHead className="px-4">{vm.headers.baseline}</TableHead>
              <TableHead className="px-4">{vm.headers.diff}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vm.rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="px-4 font-medium capitalize">
                  {row.level}
                </TableCell>
                <TableCell className="px-4 tabular-nums">{row.avg}</TableCell>
                <TableCell className="text-muted-foreground px-4 tabular-nums">
                  {row.baseline}
                </TableCell>
                <TableCell className="px-4 tabular-nums">
                  {row.diff ? (
                    <span
                      className={
                        row.diff.positive
                          ? 'font-medium'
                          : 'text-muted-foreground'
                      }
                    >
                      {row.diff.text}
                    </span>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function SalaryRail({ vm }: { vm: SalaryRailVM }) {
  if (vm.items.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      {vm.title ? (
        <h2 className="font-heading text-lg font-medium tracking-tight">
          {vm.title}
        </h2>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vm.items.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="group focus-visible:ring-ring/30 rounded-[min(var(--radius-4xl),24px)] outline-none focus-visible:ring-3"
          >
            <Card
              size="sm"
              className="h-full transition-shadow group-hover:shadow-md"
            >
              <CardContent>
                <div className="flex items-center gap-3">
                  <CompanyAvatar name={item.name} logoUrl={item.logoPath} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium break-words">
                      {item.name}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-sm break-words tabular-nums">
                      {item.jobCountLabel}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm font-medium tabular-nums">
                  {item.range}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CompanySalarySummary({
  title,
  overall,
  categories,
  viewAllHref,
  viewAllLabel,
}: {
  title: string;
  overall: OverallSalaryVM | null;
  categories: SalaryRailVM;
  viewAllHref: string;
  viewAllLabel: string;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-medium tracking-tight">
          {title}
        </h2>
        <Link
          to={viewAllHref}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'no-underline',
          )}
        >
          {viewAllLabel}
          <ArrowRight className="rtl:rotate-180" data-icon="inline-end" />
        </Link>
      </div>
      {overall ? <OverallSalaryCard vm={overall} /> : null}
      <SalaryRail vm={categories} />
    </section>
  );
}

export function SalaryFaq({ vm }: { vm: SalaryFaqVM }) {
  if (vm.items.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-lg font-medium tracking-tight">
        {vm.heading}
      </h2>
      <dl className="flex flex-col gap-3">
        {vm.items.map((item) => (
          <Card key={item.q} size="sm">
            <CardContent>
              <dt className="font-medium">{item.q}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                {item.a}
              </dd>
            </CardContent>
          </Card>
        ))}
      </dl>
    </section>
  );
}

export function SalaryEmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Empty className="py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChartNoAxesColumn />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
    </Empty>
  );
}
