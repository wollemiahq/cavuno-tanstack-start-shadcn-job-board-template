import { describe, expect, it } from 'vitest';

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Theme-portability gate.
 *
 * The starter's signature claim (docs/theming.md) is that a theme swap is a
 * one-file change: run `pnpm run theme:apply <preset>`, and every surface
 * re-skins from `src/theme.css` alone — no component edits. That only holds if
 * app-authored presentation styles exclusively through the theme's SEMANTIC
 * tokens (`bg-primary`, `text-muted-foreground`, `border-border`, …). A raw
 * palette class (`bg-zinc-900`), a bare `bg-white`, or a hardcoded `#rrggbb`
 * would survive a swap unchanged and silently break the new theme.
 *
 * This gate scans app-authored source — `src/components/**` MINUS the
 * shadcn-owned `src/components/ui/**`, plus `src/routes/**` — for those
 * escape hatches. `src/components/ui/**` is deliberately excluded: it is
 * canonical shadcn source (modal scrims, the slider thumb, neutral shadows,
 * and token-DERIVED `oklch(from var(--primary) …)` values) governed by the
 * shadcn drift check, not ours to relint.
 *
 * A few files legitimately carry fixed colors — third-party BRAND marks that
 * must NOT re-theme, a canvas scratch default, email documents that render on
 * white regardless of app theme, PWA splash metadata. Each is allowlisted
 * below with its reason. New violations anywhere else fail the build.
 */

const ROOT = join(import.meta.dirname, '..');

/** Tailwind named-palette utility with a numeric shade — never theme-portable. */
const PALETTE_CLASS_RE =
  /(?<![\w-])(?:bg|text|border|ring|from|via|to|fill|stroke|decoration|outline|caret|accent|divide|placeholder|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\/\d{1,3})?(?![\w-])/g;

/** Absolute `-white` / `-black` color utilities (scrims live only in ui/). */
const ABSOLUTE_COLOR_CLASS_RE =
  /(?<![\w-])(?:bg|text|border|fill|stroke|ring|from|via|to)-(?:white|black)(?:\/\d{1,3})?(?![\w-])/g;

/** A raw hex color literal. */
const HEX_LITERAL_RE = /#[0-9a-fA-F]{3,8}\b/g;

/**
 * A CSS color function whose arguments are NOT derived from a theme variable.
 * `oklch(from var(--primary) …)` and `hsl(var(--border))` are token-derived and
 * portable, so they are exempt; a literal `oklch(0.7 0.1 200)` is not.
 */
const RAW_COLOR_FN_RE = /(?:rgba?|hsla?|oklch|oklab|lab|lch)\(([^)]*)\)/g;

/**
 * Files that may carry fixed colors, each with its reason. Paths are
 * repo-relative POSIX. Allowlisting is per-FILE: the intent is to catch a
 * theme-breaking color introduced into any OTHER surface (a redesigned card,
 * a new route), not to police these known-special files line by line.
 */
const ALLOWLIST: Record<string, string> = {
  'src/components/brand-icons.tsx':
    'Third-party brand marks (Google) — fixed by the brand, must not re-theme.',
  'src/routes/auth.sign-in.tsx':
    'LinkedIn brand blue on its own icon — a brand constant, not a theme color.',
  'src/components/marketing/dither-canvas.tsx':
    'Canvas scratch-context default (#000) before resolving a real token color.',
  'src/components/preview/preview-emails.tsx':
    'Captured email documents render on white regardless of the app theme.',
};

/** Recursively collect app-authored source, skipping shadcn-owned ui/. */
function appSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const rel = relative(ROOT, path).split('\\').join('/');
    if (entry.isDirectory()) {
      if (rel === 'src/components/ui') continue; // shadcn-owned canonical source
      if (entry.name === 'paraglide') continue; // generated
      out.push(...appSourceFiles(path));
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.test\./.test(entry.name) &&
      !/\.gen\./.test(entry.name)
    ) {
      out.push(path);
    }
  }
  return out;
}

/** Non-portable color escape hatches in one source string. Pure — unit-tested. */
export function findHardcodedColors(source: string): string[] {
  const hits: string[] = [];
  for (const re of [
    PALETTE_CLASS_RE,
    ABSOLUTE_COLOR_CLASS_RE,
    HEX_LITERAL_RE,
  ]) {
    for (const match of source.matchAll(re)) hits.push(match[0]);
  }
  for (const match of source.matchAll(RAW_COLOR_FN_RE)) {
    // Token-derived color functions are portable — they follow the theme.
    if (!match[1].includes('var(--')) hits.push(match[0]);
  }
  return hits;
}

describe('findHardcodedColors (scanner fixtures)', () => {
  it('passes semantic token utilities untouched', () => {
    expect(
      findHardcodedColors(
        'bg-primary text-primary-foreground border-border text-muted-foreground bg-chart-1 rounded-2xl p-4 gap-2 z-50 w-72',
      ),
    ).toEqual([]);
  });

  it('flags Tailwind palette classes with a numeric shade', () => {
    expect(findHardcodedColors('bg-zinc-900 text-slate-500/80')).toEqual([
      'bg-zinc-900',
      'text-slate-500/80',
    ]);
  });

  it('flags absolute bg-white / text-black', () => {
    expect(findHardcodedColors('bg-white text-black')).toEqual([
      'bg-white',
      'text-black',
    ]);
  });

  it('flags raw hex and non-token color functions', () => {
    expect(
      findHardcodedColors('color: #0A66C2; fill: oklch(0.7 0.1 200)'),
    ).toEqual(['#0A66C2', 'oklch(0.7 0.1 200)']);
  });

  it('exempts token-derived color functions', () => {
    expect(
      findHardcodedColors(
        'bg-[oklch(from_var(--primary)_0.93_calc(c*0.4)_h)] shadow-[0_0_0_1px_hsl(var(--sidebar-border))]',
      ),
    ).toEqual([]);
  });
});

describe('theme-portability boundary', () => {
  it('styles app surfaces only through theme tokens (no hardcoded colors)', () => {
    const offenders: string[] = [];
    for (const dir of [
      join(ROOT, 'src/components'),
      join(ROOT, 'src/routes'),
    ]) {
      for (const path of appSourceFiles(dir)) {
        const file = relative(ROOT, path).split('\\').join('/');
        if (file in ALLOWLIST) continue;
        const hits = findHardcodedColors(readFileSync(path, 'utf8'));
        if (hits.length > 0) {
          offenders.push(`${file} — ${[...new Set(hits)].join(', ')}`);
        }
      }
    }
    expect(
      offenders,
      `Hardcoded colors would survive a theme swap. Use a semantic token ` +
        `(bg-primary, text-muted-foreground, …) or allowlist with a reason ` +
        `in src/theme-portability.test.ts:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('keeps the allowlist honest — every entry still exists and still needs it', () => {
    const stale: string[] = [];
    for (const file of Object.keys(ALLOWLIST)) {
      let source: string;
      try {
        source = readFileSync(join(ROOT, file), 'utf8');
      } catch {
        stale.push(`${file} — allowlisted but missing; remove the entry.`);
        continue;
      }
      if (findHardcodedColors(source).length === 0) {
        stale.push(
          `${file} — no longer has hardcoded colors; remove the entry.`,
        );
      }
    }
    expect(
      stale,
      `Stale theme-portability allowlist entries:\n${stale.join('\n')}`,
    ).toEqual([]);
  });
});
