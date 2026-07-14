---
name: Stat tile
purpose: A label + display-value tile for headline metrics and KPI rows.
primitives: [Card, OverallSalaryCard, MetricPanel]
usedBy: [src/components/board/salary-sections.tsx, src/routes/salaries.titles.$slug.index.tsx, src/routes/salaries.skills.$slug.index.tsx]
---

## Purpose

A headline metric renders as a tile: a small label over a large display value,
`tabular-nums` so digits align. Salary pages compose a grid of these for the
headline pay + the seniority/percentile breakdown.

## When to use

- A page showing headline numbers (salary figures, dashboard KPIs).
- **When NOT to use** — dense tabular data; use the owned shadcn `Table`.

## Anatomy

- `MetricPanel` — one owned shadcn `Card`: muted label + a
  `text-2xl font-semibold tabular-nums` value; `emphasis` uses the theme’s
  primary color.
- `OverallSalaryCard` — the headline tile plus a responsive grid of
  `MetricPanel` cards.

## Composition

`MetricPanel` is private to `salary-sections.tsx` today:

```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {stats.map((stat) => (
    <MetricPanel key={stat.label} label={stat.label} value={stat.value} emphasis={stat.emphasis} />
  ))}
</div>
```

## Do / Don't

| Do                                                              | Don't                                                                                                                                                          |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reuse `MetricPanel` / `OverallSalaryCard` for headline numbers. | Hand-roll a `divide-y divide-border` list for KPIs — the employer dashboard does; promote `MetricPanel` to a shared `StatTile` when a second consumer appears. |
| Keep values on `tabular-nums`.                                  | Let figures jitter with proportional digits.                                                                                                                   |

## Used by

- `OverallSalaryCard` / `MetricPanel` — the salary detail pages.

## Related

- [Detail page](detail-page.md)
- [Account shell](account-shell.md)
