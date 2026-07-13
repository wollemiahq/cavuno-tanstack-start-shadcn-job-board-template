/**
 * theme.css derivation library (ADR-0065 D2/D3) — pure functions shared
 * by `npm run gen:theme` (emits src/theme/resolved.ts) and the snapshot
 * sync payload printer. theme.css is canonical; these are the only two
 * derivations, both hash-stamped so doctor can detect drift (D6).
 */
import { createHash } from 'node:crypto'

/**
 * Parse the :root/.dark variable blocks + the banner metadata.
 * @param {string} css
 * @returns {{ light: Record<string, string>, dark: Record<string, string>,
 *   meta: { mode: string | null, fontSans: string | null,
 *   fontHeading: string | null, fontsImport: string | null } }}
 */
export function parseTokens(css) {
  const block = (selector) => {
    const match = css.match(
      new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`),
    )
    const vars = {}
    for (const line of (match?.[1] ?? '').split('\n')) {
      const entry = line.match(/^\s*(--[\w-]+):\s*(.+?);\s*$/)
      if (entry) vars[entry[1]] = entry[2]
    }
    return vars
  }
  const light = block(':root')
  const dark = block('.dark')
  for (const name of ['--font-sans', '--font-heading']) {
    const value = css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim()
    if (value) light[name] = value
  }
  const meta = {}
  for (const key of ['mode', 'fontSans', 'fontHeading', 'fontsImport']) {
    meta[key] = css.match(new RegExp(`\\* ${key}: (.+)`))?.[1]?.trim() || null
  }
  meta.mode ??= 'system'
  meta.fontSans ??=
    css.match(/@import\s+["']@fontsource-variable\/([^"']+)["'];?/)?.[1] ?? null
  meta.fontHeading ??= light['--font-heading'] === 'var(--font-sans)' ? 'inherit' : null
  return { light, dark, meta }
}

/** Lowercase sha-256 of the tokens file content — the freshness anchor. */
export function tokensHash(css) {
  return createHash('sha256').update(css, 'utf8').digest('hex')
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
}

export function buildSyncPayload(parsed, hash) {
  const colors = {}
  for (const [key, variable] of Object.entries(SNAPSHOT_COLOR_SOURCES)) {
    const value = parsed.light[variable]
    if (key === 'buttonPrimaryText' && !value) continue // optional upstream
    if (!value) throw new Error(`theme.css is missing ${variable} (${key})`)
    colors[key] = value
  }
  if (!parsed.meta.fontSans) throw new Error('theme.css is missing fontSans')
  return {
    tokensHash: hash,
    colors,
    fontSans: parsed.meta.fontSans,
    ...(parsed.meta.fontHeading ? { fontHeading: parsed.meta.fontHeading } : {}),
  }
}
