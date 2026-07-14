---
name: cavuno-board-theme
description: Board branding with @cavuno/board/theme — map the board's stored theme (16 semantic colors × light/dark + typography from board.context().theme) onto shadcn CSS variables, resolve the color-scheme mode, and build the Google Fonts request. Use when wiring the app shell, dark mode, or brand styling for a tenant frontend.
---

# Theme: board branding → shadcn tokens

`@cavuno/board/theme` maps the board's stored theme onto the canonical
shadcn token vocabulary as CSS-variable overrides. One contract, two
consumers: the dashboard edits the board theme; agents restyle through the
standard shadcn theme file — both end up in the same tokens.

## When to use

- The app shell/root layout of any tenant frontend, once.
- Wiring dark mode or brand fonts.

## When not to use

- Component-level styling — write normal Tailwind/shadcn classes; they pick
  the overridden tokens up automatically.

## Wire it once at the shell

```ts snippet
import { boardThemeToCss, themeMode, googleFontsUrl } from '@cavuno/board/theme';

const context = await board.context();
const css = boardThemeToCss(context.theme);   // ':root {…}' + '.dark {…}'
const mode = themeMode(context.theme);        // 'light' | 'dark' | 'system'
const fontsHref = googleFontsUrl(context.theme); // one <link>, or null
```

Inject `css` in a `<style>` AFTER the static theme stylesheet so the
overrides win; render nothing when it's empty (a null theme means the app's
default theme applies untouched). Apply `mode` by toggling the `.dark`
class (`system` = follow `prefers-color-scheme`).

## The mapping is the contract

All 16 board color keys are consumed — a coverage golden in-monorepo
asserts neither the hosted board nor this module drops one. Standard
shadcn tokens carry the core (background/foreground, card, popover,
primary, secondary, muted, accent, destructive, border, input, ring);
the four keys shadcn has no standard token for ship as
`--contrast-background`, `--contrast-foreground`, `--foreground-subtle`,
`--foreground-disabled`, plus `--foreground-error`.

## Anti-patterns

```ts no-check
// NEVER hardcode brand colors in components — they bypass the board theme:
<button style={{ background: '#7c3aed' }} />
// NEVER re-map theme keys ad hoc per page; the shell mapping is the single source.
// NEVER fetch fonts per-family — googleFontsUrl builds ONE deduped request.
```

## Out of scope — do not invent exports

No color math (hover/pressed derivation, contrast checking — the hosted
dashboard owns palette design), no per-component theme props, no CSS-in-JS
runtime. The module emits strings; the app owns injection.

## Verify

- [ ] A board with a custom theme renders its brand color on primary
      buttons and focus rings; a board without one renders the app default.
- [ ] Dark palette applies under `.dark` and `mode` drives the class.
- [ ] The Google Fonts request appears once, covering sans + heading.
