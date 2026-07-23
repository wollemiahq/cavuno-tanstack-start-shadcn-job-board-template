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

## Icons — the third axis (ICO)

Colors and fonts are the two axes `theme:apply` covers. Iconography is the
third, and it has its own command:

```sh
pnpm run icons:apply --to tabler              # migrate the whole app surface
pnpm run icons:apply --to phosphor --dry-run  # coverage report, run nothing
```

Targets are the six libraries the shadcn CLI can migrate between: `lucide`
(the current one), `tabler`, `phosphor`, `remixicon`, `hugeicons`, and
`radix`. The list is read from the CLI's own catalog (`shadcn/icons`), not
hardcoded here, so it tracks the CLI.

**Requires shadcn >= 4.14.0.** That release added `--from`/`--to`, made the
`[path]` argument work for the icons migration, and taught the rewrite about
usage shapes older versions corrupted. The wrapper checks the installed
version and refuses to run below it, because 4.13.0 accepts `--from`, `--to`
and a path glob and then **silently ignores all three**, migrating only
`src/components/ui/`. The `package.json` range already permits 4.14.0;
picking it up is a plain `pnpm update shadcn`, gated by the one-day
`minimumReleaseAge` cooldown in `pnpm-workspace.yaml`.

### What the CLI does, and what it leaves to us

On 4.14.0 the CLI does the hard part well, and `icons:apply` delegates all of
it: six libraries, non-interactive with `-y`, a glob-scoped file set, and a
ts-morph rewrite that correctly handles self-closing JSX, paired JSX
(`<Icon>…</Icon>`), icons passed as JSX attribute values (`icon={BoldIcon}`),
hugeicons' `<HugeiconsIcon icon={…} />` wrapper shape, and lucide's
`CheckIcon`/`Check` name aliasing. Icons it cannot handle are reported with a
reason rather than corrupted. The wrapper contains no transform of its own.

Five things are still ours:

- **The CLI exits 0 on a partial migration.** Anything it cannot map is
  printed as a warning and left importing the old library. "Migration
  complete." is not the claim "nothing imports the old library any more".
- **It does not know about brand marks** (below).
- **It skips the `components.json` update whenever a path is given** — that
  write is guarded by `if (!path)`, and a whole-repo migration is exactly the
  path case. The wrapper writes `iconLibrary` itself.
- **It leaves `gen:shadcn` and `gen:design` artifacts stale.**
- **It never verifies the end state**, and it installs the target package
  itself — which is an operator decision here (AGENTS.md §Dependencies), so
  the wrapper prints the `pnpm` commands and stops.

### The brand-mark exception

`src/components/brand-icons.tsx` is **never rewritten**. It holds third-party
brand marks (Google, X, LinkedIn, Facebook) — hand-inlined precisely because
no icon library ships them, with Google's mark carrying literal brand fills
that must not be recolored. Swapping the icon library does not change what
Google's logo looks like, so these are out of scope by definition. This is the
same file `src/theme-portability.test.ts` allowlists, for the same reason.

### Name coverage is the real blocker

The mapping comes from the CLI's own table,
`https://ui.shadcn.com/r/icons/index.json` — a **curated 191-icon subset**,
not a complete index of either library. It is fetched live, so it is the same
data on every CLI version: 4.14.0 does not improve it.

This app uses **88 distinct icons**, and no target covers all of them.
Migrating to tabler, 67 map; the remaining 21 include `BriefcaseBusiness`,
`MapPin`, `GraduationCap` and `ChartColumnIcon`. A further handful
(`icon: Users` and friends — icons referenced outside JSX) are skipped as
unsupported usage, and lucide's `LucideIcon` **type** is skipped silently,
appearing in no report at all.

So `icons:apply` runs a **pre-flight and refuses to start** unless every
identifier maps. That is the point of the wrapper. A partial migration
compiles, builds, and passes almost every test while the app quietly runs two
icon sets — both `pnpm run typecheck` and `pnpm run build` were confirmed
green on a knowingly half-migrated tree. A clean report is not evidence of a
clean migration.

To get past a refusal, swap the unmapped icons at their call sites for ones
the map covers, compare targets with `--dry-run`, or migrate the remainder by
hand and re-run to verify.

### The gate that actually holds the line

`src/icon-set-contract.test.ts` (ICO) fails whenever **more than one icon
library appears across `src/**`**, brand marks excluded. It asserts
_cardinality, not identity_: it is derived from what is actually imported, so
a **complete** migration to any of the six passes untouched and only a
**partial** one fails. It also checks that `components.json.iconLibrary` and
the declared package match what the source really imports.

That is the durable guarantee — running the CLI by hand instead of through
`icons:apply` is fine, because the gate is what makes a half-migrated tree
impossible to commit.

Two older assertions still pin the literal string `"lucide"`
(`src/rhea-foundation.test.ts`, `src/shadcn-only-release.test.ts`), as does
`scripts/check-shadcn-components.mjs`. They fail on any migration, complete or
not, and pass on a half-finished one — the opposite of what ICO does.
Relaxing them to "declared, and one of the CLI's libraries" (the
`tailwind.baseColor` comment in `src/rhea-foundation.test.ts` is the
precedent) is an operator decision, and safe to make now that ICO covers the
real invariant.

## Direction — the fourth axis (DIR)

Colors, fonts, and icons are three axes. Writing direction is the fourth, and
like the others it is a repo-owned command rather than a hand edit:

```sh
pnpm run rtl:apply --dry-run   # every site it would touch, plus what it won't
pnpm run rtl:apply             # apply
```

`components.json` declares `"rtl": true`. `<html dir>` is set server-side from
the UI locale (`src/lib/locale-direction.ts`), and because the layout is
flexbox/`gap`/`justify`-based, direction alone mirrors most of the page. What
it cannot mirror is anything pinned to a physical edge, and that is what the
script rewrites: `pl-*`/`pr-*` → `ps-*`/`pe-*`, `ml-*`/`mr-*` → `ms-*`/`me-*`,
`text-left`/`text-right` → `text-start`/`text-end`, `border-l`/`border-r` →
`border-s`/`border-e`, `rounded-l-*`/`rounded-r-*` → `rounded-s-*`/`rounded-e-*`.
Under LTR every one of those substitutions is a no-op — the logical property
resolves to the same physical edge — so applying it cannot regress the default
direction.

**Do not run `shadcn migrate rtl`.** It was tried here. The glob form replaced
a route file with a 9-line stub; even the bare default form silently deleted
`// @vitest-environment jsdom` pragmas from ten test files; and its rewrite is
semantically wrong on physical APIs — it turned sheet's
`data-[side=left]:border-r` into `border-e` while leaving the neighbouring
`data-[side=left]:left-0` physical. `rtl:apply` splices into class-list string
literals located on the TypeScript AST and never re-prints the file, so
comments and pragmas survive byte-for-byte.

### What stays physical, on purpose

The script carries an `EXCLUSIONS` table, each entry naming the invariant that
makes a class physical rather than logical:

- `sheet.tsx` / `drawer.tsx` — `side="left" | "right"` is an explicitly
  physical public prop; its edge classes pair with `left-0`/`right-0`, which
  have no logical form. A `side="right"` sheet opens on the physical right in
  both directions.
- `layout/box.tsx` — `BoxBorder`'s literal `left`/`right` keys.
- `calendar.tsx` — range-edge radii keyed to nth-child position; the browser
  already lays the week out RTL.
- `preview-toolbar.tsx` — a fixed dev-only QA corner.
- the recharts stat charts — nothing there is a class. recharts draws in SVG
  coordinates, which `<html dir>` does not mirror, so those charts flip
  themselves in JS (see "Direction that lives in JS" below).

Positional utilities (`left-*`, `right-*`, `translate-x-*`) are never batch
rewritten either: some need a logical inset (`end-2` for a menu checkmark that
follows its `pe-8` gutter), some need an `rtl:` variant (a chevron gets
`rtl:rotate-180`, the switch thumb gets a per-direction translate), and some
are already correct in both directions (`left-1/2 -translate-x-1/2` centring).
`--dry-run` lists them so the remainder is reviewed, not assumed.

### Direction that lives in JS

CSS mirrors the page, but two libraries lay themselves out in coordinates the
browser will not flip for us: **recharts** draws into an SVG viewport, and
**embla** translates its track in raw pixels. Both expose a first-class flip,
and both need to know the direction at render time.

That seam is Base UI's `DirectionProvider`, mounted once in `__root.tsx` from
the same `localeDirection(locale)` that sets `<html dir>`. Components read it
with `useDirection()` (re-exported from `@/components/ui/direction`). Because
the value is computed in the server render, the first byte is already correct
— a `document.dir` read in an effect would mirror the chart after paint. It
is a shared seam, not a chart one: Base UI reads the same context for popup
placement.

- `employer-stats-chart.tsx` — `<XAxis reversed>` puts the oldest bucket on
  the right; `<YAxis orientation="right">` moves the value axis to the leading
  edge; the `margin` gutter that keeps the last tick off the plot edge is
  mirrored with it. The tooltip and legend need nothing — recharts pins the
  tooltip wrapper at `left: 0` and positions it by transform, and the legend
  is a centred flex row that mirrors itself.
- `employer-profile-views-stat.tsx` — the sparkline has no visible axes, so it
  carries a **hidden** `<XAxis reversed>`: the flip without the gutter.
- `ui/carousel.tsx` — embla's `direction: 'rtl'`. Note that this reverses the
  TRACK, not embla's notion of prev/next: the previous slide is still the one
  toward the start, which under RTL is physically the right. So the `rtl:`
  variants on the arrow buttons stay as they are — there is no double flip to
  undo. What does have to swap on a horizontal carousel is the keyboard
  handler, because arrow KEYS are physical: under RTL, ArrowLeft advances.
  Vertical carousels retain their existing key mapping because Embla does not
  mirror the y-axis.

### Content direction is not chrome direction

The chrome's direction comes from the UI locale. The **content's** does not.
A board is a single-language product, but a single posting can be written in
anything, so every field of API-served text carries `dir="auto"` and the
browser resolves direction from that field's own first strong character —
`Prose` (job/company descriptions, blog bodies, legal pages), job and company
titles, talent headlines and bios, blog titles and excerpts. Without it, an
LTR description under RTL chrome renders with displaced punctuation
(`".strategy, the team"`). Pinning content to the chrome's direction, or to
the board's language, is wrong for at least one of the four combinations.

Two honest limits, both inherent to `dir="auto"`:

- **First-strong is a heuristic.** Content opening with a number, an emoji,
  punctuation, or a Latin brand name (`Acme Corp — وصف الوظيفة…`) resolves LTR
  even when the body is RTL. A per-item content-language field on the Board
  API would be the principled fix; no such field exists today.
- **Pre-sanitized HTML takes one direction for the whole blob.** AGENTS.md
  rule 4 forbids interpolating into API HTML, so per-paragraph `dir` is not
  available; a genuinely mixed-direction body follows its first strong
  character throughout.

Chrome components (`PageHeader`, nav, buttons) deliberately do **not** get
`dir="auto"`: they render UI-locale copy, and the `ar-XB` pseudo-locale wraps
its text in a U+2067 isolate that first-strong is specified to skip.

`scripts/pseudo-locale-gate.mjs` asserts `dir="rtl"` on `/ar-XB/*` and
`dir="ltr"` everywhere else.

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
