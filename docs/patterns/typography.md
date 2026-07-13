---
name: Typography
purpose: Author every heading (and, gradually, body copy) through one role-named primitive so text stays on the Untitled UI scale.
primitives: [Text, Prose]
usedBy: [src/components/text.tsx, src/components/board/listing-page-header.tsx, src/components/board/job-detail.tsx, src/routes/post.tsx, src/routes/salaries.index.tsx]
---

## Purpose

Authored JSX headings kept drifting off the Untitled UI type scale — the page
`<h1>` was written as `text-2xl`/`text-3xl` in fifteen files, and section
headings scattered across `text-lg`/`text-md`/`text-sm`/`text-xl` in another
twenty-odd. The [`Text`](../../src/components/text.tsx) primitive fixes this at
the source: its API is ROLE-NAMED (`heading1`, `body`, `error`), each role maps
to exactly one UUI token, and no role maps to an off-scale size — so a drifted
heading is simply unexpressible. One authoring path, one scale.

`Text` is the JSX counterpart to [`Prose`](../../src/components/prose.tsx):
**Prose owns rendered-HTML strings** (job descriptions, blog bodies — the
`.prose` cascade styles their `<h1>`…`<h4>`), while **Text owns authored JSX**.
The two are deliberately byte-aligned: `heading1`–`heading4` emit the exact
tokens the vendored `.prose` h1–h4 use, so a `<Text as="h2" variant="heading2">`
and a prose `<h2>` render identically.

## When to use

- Any authored heading (`<h1>`–`<h6>`) in a route or a board component.
- Body copy, gradually — `Text` supports the body family, but this is opt-in
  (see *Gradual body adoption* below), not a big-bang migration.
- **When NOT to use** — headings inside rendered HTML. Those belong to
  [`Prose`](../../src/components/prose.tsx); never hand-author a
  `<hN className>` to sit in a prose column (the legal-page article title is the
  one intentional prose-owned heading).

## Anatomy

`variant` selects the visual role; `as` selects the rendered element. They are
DECOUPLED — a `heading1` can render as an `<h2>` for outline reasons, a
`display` as an `<h1>`. Display and heading variants **require `as`** at the
type level, forcing the a11y/outline decision at every call site; body-family
variants default to `<p>`.

| variant | UUI token | weight | default color | notes |
|---|---|---|---|---|
| `display`   | `text-display-md` → `md:text-display-lg` | semibold | `text-primary` | hero / marketing title; no HTML-heading equivalent. The one responsive role — steps up to `display-lg` on desktop so a hero keeps its prominence. |
| `heading1`  | `text-display-sm` | semibold | `text-primary` | = prose `h1`. |
| `heading2`  | `text-display-xs` | semibold | `text-primary` | = prose `h2`. |
| `heading3`  | `text-xl`         | semibold | `text-primary` | = prose `h3`. |
| `heading4`  | `text-lg`         | semibold | `text-primary` | = prose `h4`. |
| `body`      | `text-md`         | normal   | `text-primary` | default variant. `size` overrides `text-md`. |
| `secondary` | `text-md`         | normal   | `text-tertiary` | muted / meta copy. |
| `error`     | `text-sm`         | normal   | `text-error-primary` | inline / form errors. |

`size` (`xs`/`sm`/`base`/`lg` → `text-xs`/`text-sm`/`text-md`/`text-lg`) and
`bold` (→ `font-semibold`) tune **body-family only**; the type system forbids
them on headings, whose sizes are locked correct-by-construction. `truncate`
adds `truncate min-w-0`. `className` is an escape hatch merged through `cx`, so
an override wins over the variant default.

These tokens were reconciled against
[`src/styles/untitled-ui/typography.css`](../../src/styles/untitled-ui/typography.css):
the vendored `.prose` base renders `h1=display-sm`, `h2=display-xs`, `h3=xl`,
`h4=lg` (all `font-weight: 600`, color `text-primary`) — the mapping above
matches byte-for-byte, so no reconciliation edit was needed.

## Composition

```tsx
// A standard page heading — element and role decided together.
<Text as="h1" variant="heading1">{title}</Text>

// A responsive authored heading keeps its md: step via the escape hatch:
// pick the base-size variant, layer the larger breakpoint through className.
<Text as="h1" variant="heading2" className="md:text-display-sm">{company.name}</Text>

// A muted meta line, sized down.
<Text variant="secondary" size="sm">{postedAt}</Text>
```

## Do / Don't

| Do | Don't |
|---|---|
| Render authored headings through `<Text as="hN" variant="…">`. | Hand-write `<h1 className="text-2xl …">` (the drift the P17 gate now fails). |
| Decide `as` (semantics) and `variant` (size role) independently. | Assume an `<h1>` must be `heading1` — a compact page title can be `heading3`. |
| For a responsive heading, pick the base-size variant + a `md:` className. | Reach for a raw `text-3xl` to hit an in-between size. |
| Let `display` cap the hero at `display-md`. | Re-introduce `display-lg`/`xl`/`2xl` on a hero (the heroes were stepped down to `display-md`). |
| Keep rendered-HTML headings inside `Prose`. | Author a `<hN className>` to live in a prose column. |

## Used by

- `src/components/text.tsx` — the primitive itself (+ `src/components/text.test.tsx`).
- Board components — `listing-page-header` (hero `display`), `job-detail`
  (`heading2` title + `heading4` similar-jobs), `home-landing`, `company-section-header`,
  `alerts-band`, `job-card`, `post-card`, `salary-sections`.
- Routes — every page title and section heading across `post`, `messages`,
  `settings`, `account*`, `alerts*`, `employers*`, `p.$handle`, `talent.index`,
  `blog.*`, `companies.*`, `jobs.locations.index`, `auth.join`, and the full
  `salaries.*` tree.

Off-scale heading sizes in `src/routes` + `src/components/board` are frozen out
by the P17 gate in
[`src/pattern-contract.test.ts`](../../src/pattern-contract.test.ts).

### Gradual body adoption

This pass migrated **headings**, not body copy — `<p>` copy is the larger,
lower-value surface and was never the drift. `Text`'s body family
(`body`/`secondary`/`error`, with `size`/`bold`) is available for new copy and
for opportunistic migration when a `<p>` sits right beside a heading you are
already touching; adopt it gradually rather than in one sweep. A handful of
compact **label-style** headings (footer column titles, the job-detail rail's
`text-sm` micro-labels, the alerts-band and company-card compact titles, the
auth.join role-card titles) stay hand-authored for now — they are on-scale
(`text-sm`/`text-md`, so the gate does not flag them) and read as labels, not
headings; they are the natural next candidates for body-family `Text`.

## Related

- [Section heading](section-heading.md) — the titled-section-row composition
  whose `<h2>` now flows through `Text`.
- [Detail page](detail-page.md) / [Listing page](listing-page.md) — own the
  hero and page-title headings.
