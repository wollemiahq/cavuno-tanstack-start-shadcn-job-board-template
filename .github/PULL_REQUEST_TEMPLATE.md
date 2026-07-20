## What & why

What does this change, and why? Keep it the smallest edit to the existing
surface (this is a customization template — never greenfield; see
[`AGENTS.md`](../AGENTS.md)).

Closes #

## Surface touched

- [ ] Presentation (`src/components/**`, `src/routes/*.tsx`)
- [ ] Theme / design tokens (`src/theme.css` → regenerated with `gen:theme` / `gen:design`)
- [ ] Copy / i18n (`messages/**` → regenerated with `gen:messages`)
- [ ] View-model / data / lib / server (explain the reason below)
- [ ] Docs / meta

If you touched `src/board/**`, `src/lib/**`, or `src/server/**`, explain the
explicit reason:

## Verification

- [ ] `pnpm run typecheck`
- [ ] `pnpm test`
- [ ] `pnpm run build`
- [ ] `pnpm run check` (formatting + lint)
- [ ] `pnpm run gen:design -- --check` (no design-artifact drift)

How did you verify the behavior (not just that it compiles)? Prefer
interaction / route-state / a11y evidence over screenshots of Tailwind classes
(see [`docs/testing.md`](../docs/testing.md)).

## Checklist

- [ ] No changes to grounding config (`CAVUNO_API_URL` / `CAVUNO_BOARD`) or
      locked build config (`wrangler.jsonc`, `vite.config.ts`, `tsconfig.json`)
- [ ] Generated files were regenerated, not hand-edited
- [ ] No new dependencies (or the reason one is required is stated above)
- [ ] Follows the [`DESIGN.md`](../DESIGN.md) inventory and
      [`docs/patterns/`](../docs/patterns/README.md) compositions
