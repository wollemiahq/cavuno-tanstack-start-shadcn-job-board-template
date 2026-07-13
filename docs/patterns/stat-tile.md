---
name: Stat tile
purpose: A label + display-value tile for headline metrics and KPI rows.
primitives: [OverallSalaryCard, MetricPanel]
usedBy: [src/components/board/salary-sections.tsx, src/routes/salaries.titles.$slug.index.tsx, src/routes/salaries.skills.$slug.index.tsx]
---

## Purpose

A headline metric renders as a tile: a small label over a large display value,
`tabular-nums` so digits align. Salary pages compose a grid of these for the
headline pay + the seniority/percentile breakdown.

## When to use

- A page showing headline numbers (salary figures, dashboard KPIs).
- **When NOT to use** — dense tabular data; use the Untitled UI `Table`.

## Anatomy

- `MetricPanel` — one tile: `<p>` label + a `text-display-xs font-semibold
  tabular-nums` value, `emphasis` swapping the value to `text-brand-secondary`.
- `OverallSalaryCard` — the headline tile plus a `<dl>` grid of `MetricPanel`s.

## Composition

`MetricPanel` is private to `salary-sections.tsx` today:

```tsx
<dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {stats.map((stat) => (
    <MetricPanel key={stat.label} label={stat.label} value={stat.value} emphasis={stat.emphasis} />
  ))}
</dl>
```

## Do / Don't

| Do | Don't |
|---|---|
| Reuse `MetricPanel` / `OverallSalaryCard` for headline numbers. | Hand-roll a `divide-y divide-border` list for KPIs — the employer dashboard does; promote `MetricPanel` to a shared `StatTile` when a second consumer appears. |
| Keep values on `tabular-nums`. | Let figures jitter with proportional digits. |

## Used by

- `OverallSalaryCard` / `MetricPanel` — the salary detail pages.

## Related

- [Detail page](detail-page.md)
- [Account shell](account-shell.md)
