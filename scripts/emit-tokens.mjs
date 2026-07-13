/**
 * MIGRATION EMITTER (ADR-0065 D1) — emit the board's current platform
 * theme into the repo's canonical `src/tokens.css`, ONCE, at migration.
 *
 * After this runs, tokens.css IS the theme: the app renders from it
 * statically (no runtime theme fetch), `npm run gen:theme` derives the
 * resolved module OG consumes, and the platform snapshot is synced from
 * the same file (`--payload` prints the `boards/themeSnapshot:sync`
 * args). Re-running is safe — it overwrites tokens.css from the wire
 * theme, which is only meaningful before the board cuts over.
 *
 *   CAVUNO_API_URL=https://api.cavuno.com \
 *   CAVUNO_BOARD=pk_… node scripts/emit-tokens.mjs
 */
import { writeFileSync } from 'node:fs'

import { boardThemeToCss, googleFontsUrl, themeMode } from '@cavuno/board/theme'

const apiUrl = (process.env.CAVUNO_API_URL ?? 'https://api.cavuno.com').replace(
  /\/+$/,
  '',
)
const board = process.env.CAVUNO_BOARD
if (!board) {
  console.error('CAVUNO_BOARD (pk_…) is required')
  process.exit(2)
}

const res = await fetch(`${apiUrl}/v1/boards/${board}`)
if (!res.ok) {
  console.error(`board context fetch failed: HTTP ${res.status}`)
  process.exit(1)
}
const context = await res.json()
if (!context.theme) {
  console.error('board has no wire theme to emit')
  process.exit(1)
}

const fonts = googleFontsUrl(context.theme)
const banner = `/*
 * CANONICAL BOARD THEME (ADR-0065). This file is the single source of
 * truth for the board's look: the app renders from it, src/theme/
 * resolved.ts is generated from it (npm run gen:theme), and the platform
 * theme snapshot is synced from its content hash. Edit THIS file (or let
 * your agent edit it), then re-run gen:theme and re-sync the snapshot.
 *
 * mode: ${themeMode(context.theme)}
 * fontSans: ${context.theme.typography.fontSans}
 * fontHeading: ${context.theme.typography.fontHeading ?? ''}
 * fontsImport: ${fonts}
 */
`

writeFileSync('src/tokens.css', banner + boardThemeToCss(context.theme) + '\n')
console.log(
  `src/tokens.css emitted from ${context.slug} (${context.theme.schemeId ?? 'custom'})`,
)
