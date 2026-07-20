# Theming — swap the whole look with one command

This starter is a shadcn/ui theme in the canonical layout, so re-skinning it is
a **shadcn CLI operation**, not a code edit. Pick a preset in the browser, apply
it with one command, and every surface re-colors from `src/theme.css` alone —
with **zero component edits**.

`src/theme.css` is the single source of truth for tokens (AGENTS.md: no parallel
token system). Everything else — the OG-image palette, the design docs — is
_derived_ from it and regenerated, never hand-written.

## 1. Pick a preset

Open the shadcn theme builder and design a look:

**https://ui.shadcn.com/create**

Choose a base color, an accent, and a corner radius. When you like it, the page
puts a shareable id in the URL:

```
https://ui.shadcn.com/create?preset=b2D0vQ7G4
                                     ^^^^^^^^^ the preset id
```

You can also browse presets others have shared — each is addressed by that id.

## 2. Apply it

One command takes the preset id (or the whole share URL — it extracts the id):

```sh
pnpm run theme:apply b2D0vQ7G4
# or paste the URL straight from the browser:
pnpm run theme:apply "https://ui.shadcn.com/create?preset=b2D0vQ7G4"
```

That wrapper (`scripts/theme-apply.mjs`) runs three steps in order:

| Step | Command | Writes |
| --- | --- | --- |
| 1. Apply theme | `shadcn apply --preset <id> --only theme -y` | `src/theme.css` |
| 2. Re-derive tokens | `pnpm run gen:theme` | `src/theme/resolved.ts` |
| 3. Re-derive design docs | `pnpm run gen:design` | `DESIGN.md`, `design/tokens.dtcg.json` |

`--only theme` is the default: it rewrites only the `:root` / `.dark` token
blocks in `src/theme.css` and never reinstalls components or swaps fonts — so a
theme swap stays a one-file change. Override the scope when you mean to:

```sh
pnpm run theme:apply b2D0vQ7G4 --only theme,font   # theme + fonts
pnpm run theme:apply b2D0vQ7G4 --full              # full preset (components too)
```

Then review the diff and verify:

```sh
pnpm run typecheck && pnpm test && pnpm run build
```

### The manual equivalent

`theme:apply` is just a convenience wrapper. The underlying steps, if you prefer
to run them by hand (all use the `shadcn` CLI already in `devDependencies`):

```sh
pnpm exec shadcn apply --preset b2D0vQ7G4 --only theme -y
pnpm run gen:theme
pnpm run gen:design
```

The CLI syntax comes from the shadcn docs:
[`shadcn apply`](https://ui.shadcn.com/docs/changelog/2026-04-shadcn-apply) and
[partial preset apply](https://ui.shadcn.com/docs/changelog/2026-04-partial-preset-apply)
(the `--only theme,font` flag).

## Why this works — theme portability

Every app-authored surface styles through the theme's **semantic tokens**
(`bg-primary`, `text-muted-foreground`, `border-border`, `rounded-2xl`), never
through raw palette classes (`bg-zinc-900`), bare `bg-white`, or hex literals.
Because the components reference tokens and the preset only rewrites token
_values_, swapping the preset re-skins everything without touching a component.

A gate keeps that true: **`src/theme-portability.test.ts`** scans app source —
`src/components/**` (minus the shadcn-owned `src/components/ui/**`) and
`src/routes/**` — and fails the build on any hardcoded color that would survive
a swap unchanged. A short, reasoned allowlist covers the legitimate exceptions
(third-party brand marks like the Google/LinkedIn logos, captured email
documents that render on white, the PWA splash metadata). If you add a
deliberately fixed color, allowlist it there with a reason.

## Proof — a real swap, start to green

To prove the pipeline end-to-end, a real preset from ui.shadcn.com/create was
applied in this repo and the full verification suite run, with **no component
edits**:

```sh
pnpm exec shadcn apply --preset b2D0vQ7G4 --only theme -y
#   → Updating src/theme.css ✔  (emerald chart palette: --chart-1..5 gained
#     real chroma, e.g. oklch(0.845 0.143 164.978), in both :root and .dark)
pnpm run gen:theme
#   → src/theme/resolved.ts regenerated, hash 4ebbd16c… (was ca87ff51…)
pnpm run gen:design
#   → DESIGN.md + design/tokens.dtcg.json regenerated from the new theme

pnpm run typecheck   # ✔ tsc --noEmit, 0 errors
pnpm test            # ✔ 834 tests / 166 files passed
pnpm run build       # ✔ built
```

Only generated/derived files changed (`src/theme.css`, `src/theme/resolved.ts`,
`DESIGN.md`, `design/tokens.dtcg.json`) — no `.tsx` touched. The theme was then
reverted (`git checkout src/theme.css && pnpm run gen:theme && pnpm run
gen:design`) so the shipped look is unchanged; this section is the record of the
run.
