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

One command covers **both** of the shadcn CLI's theme paths. It routes on the
shape of the argument:

```sh
# (a) a first-party preset — bare id, or the share URL straight from the browser
pnpm run theme:apply b2D0vQ7G4
pnpm run theme:apply "https://ui.shadcn.com/create?preset=b2D0vQ7G4"

# (b) any shadcn-format theme registry — a full URL to the theme JSON
pnpm run theme:apply https://tweakcn.com/r/themes/bubblegum.json
```

| Input | Routed to | Notes |
| --- | --- | --- |
| bare id (`b2D0vQ7G4`) | `shadcn apply --preset <id> --only theme -y` | first-party presets from ui.shadcn.com/create |
| `ui.shadcn.com/create?preset=…` | same — the id is extracted from the URL | paste-from-browser convenience |
| any other `http(s)` URL | `shadcn add <url> -y` | tweakcn, a self-hosted registry, any shadcn-format theme item |

Anything else (a bare word with a slash or dot, a URL that won't parse, a
ui.shadcn.com link with no `?preset=`) fails with a usage message listing both
forms — the wrapper never guesses.

**Why both paths matter:** all eight first-party presets are near-monochrome
(max chroma 0.021 — see "Proof" below). A dramatic re-skin — a real brand hue,
a different radius — comes from the registry path.

That wrapper (`scripts/theme-apply.mjs`) then runs the same steps for either
input:

| Step | Command | Writes |
| --- | --- | --- |
| 1. Apply theme | `shadcn apply --preset <id> --only theme -y` **or** `shadcn add <url> -y` | `src/theme.css`, `components.json` |
| 2. Re-derive tokens | `pnpm run gen:theme` | `src/theme/resolved.ts` |
| 3. Re-derive design docs | `pnpm run gen:design` | `DESIGN.md`, `design/tokens.dtcg.json` |
| 4. Font sanity check | (in-wrapper) | nothing — it only warns |

Steps 2–4 are the whole reason the wrapper exists: a raw CLI run leaves the
derived artifacts stale (and the drift gate red), and says nothing about the
font trap in step 4.

The CLI also updates `components.json` — notably `tailwind.baseColor`, which it
sets to the applied preset's base color so a LATER `shadcn add` resolves
registry colors against the theme that is actually installed. That rewrite is
correct; nothing pins the field to a particular value.

### Which flags apply to which path

`--only` and `--full` are **`shadcn apply` concepts** — they scope a *preset*
apply. `shadcn add` installs a registry item whole and takes neither, so
passing an apply-only flag with a registry URL is an **error**, not a silent
no-op:

```
$ pnpm run theme:apply https://tweakcn.com/r/themes/bubblegum.json --only theme,font
✖ --only is a `shadcn apply` flag and only scopes a PRESET apply. A registry theme
  is installed whole by `shadcn add` — drop the flag, or use a preset id.
```

On the preset path, `--only theme` is the default: it rewrites the token blocks
in `src/theme.css` and never reinstalls components or swaps fonts — so a theme
swap stays a one-file change. Override the scope when you mean to:

```sh
pnpm run theme:apply b2D0vQ7G4 --only theme,font   # theme + fonts
pnpm run theme:apply b2D0vQ7G4 --full              # full preset (components too)
```

**What `--only theme,font` additionally does:** it installs the preset's font
packages, writing `package.json` and `pnpm-lock.yaml`. That is the intended
behaviour and exactly what a **human operator** applying a preset should get —
picking a preset that specifies fonts is a deliberate, reviewed act by the
person who owns the repo. An **agent** is in a different position: the
platform's dependency gate refuses agent-added packages, so agents change
fonts by editing `src/theme.css` within the pre-installed catalog below
(AGENTS.md). Same split as grounding config — whose hands are on the command
decides, not the command itself.

Then review the diff and verify:

```sh
pnpm run typecheck && pnpm test && pnpm run build
```

### The manual equivalent

`theme:apply` is just a convenience wrapper. The underlying steps, if you prefer
to run them by hand (all use the `shadcn` CLI already in `devDependencies`):

```sh
# preset path
pnpm exec shadcn apply --preset b2D0vQ7G4 --only theme -y
# …or registry path
pnpm exec shadcn add https://tweakcn.com/r/themes/bubblegum.json -y

pnpm run gen:theme
pnpm run gen:design
```

Run by hand you also lose the font sanity check below — do it yourself before
you trust the result.

The CLI syntax comes from the shadcn docs:
[`shadcn apply`](https://ui.shadcn.com/docs/changelog/2026-04-shadcn-apply) and
[partial preset apply](https://ui.shadcn.com/docs/changelog/2026-04-partial-preset-apply)
(the `--only theme,font` flag).

## Fonts — swap from the bundled catalog, one file (FNT)

The starter pre-installs the platform's full 20-font catalog as fontsource
packages, so **changing the font is a `src/theme.css`-only edit** — no
`package.json` change, no install. Everything a font swap touches lives in
that one file:

1. **Banner keys** (authoritative metadata, parsed by `gen:theme`):

   ```css
   /*
    * fontSans: inter
    * fontHeading: lora        ← only when headings differ from the body
    */
   ```

2. **The fontsource import block** — exactly the active families, nothing
   more (unused imports bloat the built assets):

   ```css
   @import '@fontsource-variable/inter';
   @import '@fontsource-variable/lora';
   ```

   Variable packages exist for most of the catalog; the four static fonts
   (`be-vietnam-pro`, `poppins`, `hind`, `fira-sans`) import per-weight:
   `@import '@fontsource/poppins/400.css';` (repeat for 500/600/700).

3. **The two tokens**, using the family name the package registers
   (variable packages append ` Variable`):

   ```css
   --font-heading: 'Lora Variable', serif;
   --font-sans: 'Inter Variable', sans-serif;
   ```

Then regenerate the derived artifacts — `pnpm run gen:theme && pnpm run
gen:design` — and verify. OG images follow automatically: `gen:theme`
derives `ogFontFamily` (heading family, else body) into
`src/theme/resolved.ts` and the OG routes render with it.

The catalog keys: `be-vietnam-pro`, `inter`, `plus-jakarta-sans`,
`dm-sans`, `outfit`, `space-grotesk`, `geist` (default), `public-sans`,
`figtree`, `work-sans`, `open-sans`, `poppins`, `hind`, `lexend`,
`fira-sans`, `manrope`, `source-sans-pro` (package
`@fontsource-variable/source-sans-3`), `source-serif-4`, `lora`,
`crimson-pro`.

**Never** set `font-family` on individual components — use the
`font-sans` / `font-heading` utilities so a later swap stays one file.

**Off-catalog fonts** are a deliberate tradeoff, not a free choice. An
operator may absolutely install one (that is what `--only theme,font` does),
but the brand snapshot only recognizes catalog keys — transactional emails
fall back to Inter for unknown fonts. For an **agent** it is out of reach:
the platform's dependency gate refuses agent-added packages, so an agent
that wants an off-catalog family should say that tradeoff out loud to the
operator instead of silently substituting.

**Whoever applies it, the import and the token must agree.** A
`--font-sans` naming a family with no matching `@import`, or an `@import`
whose package is not installed, renders the board in a silent system
fallback. Two gates in `src/theme-foundation.test.ts` catch both directions
(FNT-01 and FNT-03); the fix is always to install the package or write the
import, never to use fewer fonts. Third-party presets are the usual source
of the mismatch: they rewrite `--font-sans` but not the import block.

`theme:apply` checks the same condition right after applying, so you learn it
at the moment of the swap rather than at `pnpm test`. It **never edits
`src/theme.css`** — it names the family and the exact fix, which differs by
whether the family is in the catalog above:

```
⚠ Font check: the theme declares --font-sans: Poppins, sans-serif but src/theme.css
  has no @fontsource import for "poppins".
  Left as-is the board renders a silent system fallback, and gen:theme reports the
  wrong font.
  Poppins IS in the pre-installed catalog — no dependency change needed. Add to
  src/theme.css:
      @import '@fontsource/poppins/400.css';   (repeat for 500/600/700)
  …and drop the now-unused import of the previous family. Then re-run:
  pnpm run gen:theme && pnpm run gen:design
```

For an off-catalog family the wrapper says so instead, and points at the
operator decision (install it, or pick a catalog family). A clean swap prints
`✔ Font check: every declared family has a matching @fontsource import.`

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

### What the first-party presets actually change

Be clear about the ceiling before reading the proof: **all eight first-party
presets on ui.shadcn.com/create are monochrome** (max chroma 0.021). They vary
the neutral ramp and the chart palette, not the brand color. `b2D0vQ7G4`, cited
here in earlier revisions as the headline proof, is the extreme case — its
**entire** diff is ten lines:

```
--chart-1..5   oklch(0.87 0 0) …          →  oklch(0.845 0.143 164.978) …
               (in both :root and .dark)      (an emerald chart palette)
```

It touches neither `--primary` nor `--radius` nor any font. Running it proves
the pipeline executes; it does not demonstrate a re-skin, because almost
nothing visible changes outside a chart. A convincing swap needs a third-party
registry theme or a custom `create` preset.

### A real re-skin — tweakcn `bubblegum`

Applied in this repo as a third-party registry theme, with **no component
edits**:

```sh
pnpm run theme:apply https://tweakcn.com/r/themes/bubblegum.json
#   → shadcn add https://tweakcn.com/r/themes/bubblegum.json -y
#     Updating src/theme.css ✔   133 insertions, 67 deletions
#     --primary  oklch(0.205 0 0)  → oklch(0.6209 0.1801 348.1385)  (hot pink)
#     --radius   0.625rem          → 0.4rem
#     --card, --accent, --muted-foreground, the chart + sidebar ramps: all new,
#     in both :root and .dark
#   → gen:theme + gen:design re-derived (the wrapper does this for you)
#   → ⚠ Font check: …declares Poppins but no @fontsource import (see below)

pnpm run typecheck   # ✔ tsc --noEmit, 0 errors
pnpm test            # ✔ 1087 tests / 189 files passed
pnpm run build       # ✔ built
```

Every surface re-skinned in light and dark — header, filter bar, job cards,
detail pane, badges, buttons, the alert prompt — with no `.tsx` touched. Only
`src/theme.css` and the derived artifacts (`src/theme/resolved.ts`,
`DESIGN.md`, `design/tokens.dtcg.json`) changed.

**Fonts were the one deliberate extra step**, and they illustrate the rule
above. `bubblegum` sets `--font-sans: Poppins, sans-serif` but, being a
theme-only registry item, writes no `@import` — leaving the previous
`@fontsource-variable/geist` import in place. `theme:apply` warned about it
immediately, and FNT-01 then failed loudly (`--font-sans names "Poppins,
sans-serif" but no @fontsource import matches "poppins"`) rather than shipping
a silent fallback. Poppins is in the pre-installed catalog, so
completing the swap was a four-line edit to the import block in `src/theme.css`
— no dependency change. Had the preset asked for an off-catalog family, that
would have been an operator decision (`--only theme,font`, or an explicit
install), not something to paper over.

The theme was then reverted (`git checkout src/theme.css && pnpm run gen:theme
&& pnpm run gen:design`) so the shipped look is unchanged; this section is the
record of the run.
