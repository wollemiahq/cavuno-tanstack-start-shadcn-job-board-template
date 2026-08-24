/**
 * theme.css derivation library — pure functions shared
 * by `pnpm run gen:theme` (emits src/theme/resolved.ts) and the snapshot
 * sync payload printer. theme.css is canonical; these are the only two
 * derivations, both hash-stamped so doctor can detect drift.
 */
import { createHash } from 'node:crypto';

/**
 * Parse the :root/.dark variable blocks + the banner metadata.
 * @param {string} css
 * @returns {{ light: Record<string, string>, dark: Record<string, string>,
 *   meta: { mode: string | null, fontSans: string | null,
 *   fontHeading: string | null, fontsImport: string | null,
 *   ogFontFamily: string | null } }}
 */
export function parseTokens(css) {
  const block = (selector) => {
    const match = css.match(
      new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`),
    );
    const vars = {};
    for (const line of (match?.[1] ?? '').split('\n')) {
      const entry = line.match(/^\s*(--[\w-]+):\s*(.+?);\s*$/);
      if (entry) vars[entry[1]] = entry[2];
    }
    return vars;
  };
  const light = block(':root');
  const dark = block('.dark');
  for (const name of ['--font-sans', '--font-heading']) {
    const value = css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim();
    if (value) light[name] = value;
  }
  // The one concrete family OG/Satori renders (cards are
  // title-dominant): the heading family when it names one, else the
  // body family. First family in the stack — quoted OR bare, since
  // third-party presets write `--font-sans: Poppins, sans-serif`. The
  // ' Variable' suffix is stripped: Satori only uses the name as a lookup
  // label, but loadGoogleFont needs the plain family.
  const firstFamily = (value) => {
    const first = value?.split(',')[0]?.trim();
    if (!first || first.startsWith('var(')) return null;
    const family = first.match(/^['"]([^'"]+)['"]$/)?.[1] ?? first;
    return family.replace(/\s+Variable$/i, '') || null;
  };
  /** …and the same family as a fontsource package slug. */
  const familySlug = (value) =>
    firstFamily(value)?.toLowerCase().replace(/\s+/g, '-') ?? null;

  const meta = {};
  for (const key of ['mode', 'fontSans', 'fontHeading', 'fontsImport']) {
    meta[key] = css.match(new RegExp(`\\* ${key}: (.+)`))?.[1]?.trim() || null;
  }
  meta.mode ??= 'system';
  // Banner keys stay authoritative. When a theme predates the banner
  // (or a preset rewrote it away), derive from the `--font-sans` TOKEN — the
  // thing that actually renders — and only then fall back to the leftover
  // `@import`. Import-first got this backwards: `--only theme` rewrites the
  // token but leaves the previous font's import in place, so a Poppins theme
  // reported `geist`.
  meta.fontSans ??= familySlug(light['--font-sans']) ?? null;
  // Static (per-weight subpath) fontsource imports parse like
  // variable ones.
  meta.fontSans ??=
    css.match(
      /@import\s+["']@fontsource(?:-variable)?\/([a-z0-9-]+)(?:\/[^"']+)?["'];?/,
    )?.[1] ?? null;
  meta.fontHeading ??=
    light['--font-heading'] === 'var(--font-sans)' ? 'inherit' : null;
  meta.ogFontFamily =
    (light['--font-heading'] !== 'var(--font-sans)'
      ? firstFamily(light['--font-heading'])
      : null) ??
    firstFamily(light['--font-sans']) ??
    null;
  return { light, dark, meta };
}

/** Lowercase sha-256 of the tokens file content — the freshness anchor. */
export function tokensHash(css) {
  return createHash('sha256').update(css, 'utf8').digest('hex');
}

/**
 * shadcn var → themeConfig color key, the email-safe subset the platform
 * snapshot carries (boards/themeSnapshot:sync contract). Inverse of the
 * SDK's boardThemeToCss mapping; `--ring` is brandColor ?? buttonPrimary
 * upstream, so a board that never set brandColor snapshots its primary —
 * acceptable (email links match buttons).
 */
const SNAPSHOT_COLOR_SOURCES = {
  buttonPrimary: '--primary',
  buttonPrimaryText: '--primary-foreground',
  background: '--background',
  mutedBackground: '--muted',
  border: '--border',
  text: '--foreground',
  textMuted: '--muted-foreground',
  brandColor: '--ring',
};

export function buildSyncPayload(parsed, hash) {
  const colors = {};
  for (const [key, variable] of Object.entries(SNAPSHOT_COLOR_SOURCES)) {
    const value = parsed.light[variable];
    if (key === 'buttonPrimaryText' && !value) continue; // optional upstream
    if (!value) throw new Error(`theme.css is missing ${variable} (${key})`);
    colors[key] = value;
  }
  if (!parsed.meta.fontSans) throw new Error('theme.css is missing fontSans');
  const payload = {
    tokensHash: hash,
    colors,
    fontSans: parsed.meta.fontSans,
    fontHeading: parsed.meta.fontHeading || undefined,
  };
  return payload;
}
