import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Legacy shadcn-token ratchet (CAV-504; mirrors the copy-scan ratchet's
 * baseline mechanics).
 *
 * The public board surfaces run on the Untitled UI token set
 * (`text-tertiary`, `ring-secondary_alt`, `text-error-primary`,
 * `text-display-*`, `bg-secondary`, …). The logged-in / employer / messages
 * / legal surfaces still carry the pre-UUI shadcn tokens below. This freezes
 * that frontier: existing offenders are baselined per file, any NEW
 * occurrence fails CI. It does NOT migrate anything — burning offenders down
 * (the pattern Do/Don't tables name the UUI replacement per surface) requires
 * re-baselining DOWN with UPDATE_LEGACY_TOKEN_BASELINE=1, so the count only
 * ever decreases.
 */

const ROOT = join(import.meta.dirname, '..')
const SRC_ROOT = join(ROOT, 'src')
const BASELINE_PATH = join(ROOT, 'legacy-token-baseline.json')

/**
 * The frozen legacy-token frontier. Each is a Tailwind class from the
 * shadcn palette this template is migrating off. `text-primary-foreground`
 * has zero offenders today and is frozen at 0 — a new one fails immediately.
 */
const LEGACY_TOKENS = [
  'text-muted-foreground',
  'border-border',
  'text-destructive',
  'bg-muted',
  'text-foreground',
  'font-heading',
  'bg-background',
  'text-primary-foreground',
  // CAV-509: the last compat-bridge frontier, freed as the LEGACY COMPAT
  // block was deleted. Frozen at 0 — a reintroduction fails immediately.
  'bg-card',
  'text-foreground-subtle',
  'divide-border',
  'border-destructive',
  'bg-foreground',
  'text-background',
]

// Guard each token so it matches the whole class only — `text-foreground`
// must NOT match `text-foreground-subtle`, but a Tailwind opacity/variant
// suffix (`bg-muted/50`) should still count. `(?<![\w-])`/`(?![\w-])` reject
// a hyphenated continuation while allowing `/`, whitespace, quotes.
const TOKEN_RE = new RegExp(
  `(?<![\\w-])(?:${LEGACY_TOKENS.map((t) => t.replace(/[-]/g, '\\$&')).join('|')})(?![\\w-])`,
  'g',
)

/** Generated output the scan skips (not hand-edited; regenerated). */
const SKIP_DIRS = new Set(['paraglide'])
const SKIP_FILES = /\.test\.tsx?$|routeTree\.gen\.ts$|resolved\.ts$/

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...sourceFiles(path))
    } else if (/\.tsx?$/.test(entry.name) && !SKIP_FILES.test(entry.name)) {
      out.push(path)
    }
  }
  return out
}

function countFile(path: string): number {
  const matches = readFileSync(path, 'utf8').match(TOKEN_RE)
  return matches ? matches.length : 0
}

function scan(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const path of sourceFiles(SRC_ROOT)) {
    const n = countFile(path)
    if (n > 0) counts[relative(ROOT, path)] = n
  }
  return counts
}

describe('legacy shadcn-token ratchet', () => {
  const counts = scan()

  if (process.env.UPDATE_LEGACY_TOKEN_BASELINE === '1') {
    it('baseline updated', () => {
      writeFileSync(
        BASELINE_PATH,
        JSON.stringify(
          Object.fromEntries(Object.entries(counts).sort()),
          null,
          2,
        ) + '\n',
      )
      expect(true).toBe(true)
    })
    return
  }

  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Record<
    string,
    number
  >

  it('no file gains legacy shadcn tokens', () => {
    const regressions: string[] = []
    for (const [file, count] of Object.entries(counts)) {
      const allowed = baseline[file] ?? 0
      if (count > allowed) {
        regressions.push(`${file} — ${count} > baseline ${allowed}`)
      }
    }
    expect(
      regressions,
      `New legacy shadcn tokens — compose Untitled UI tokens instead ` +
        `(see the UUI replacement named in the relevant pattern's Do/Don't ` +
        `table; index at docs/patterns/README.md):\n${regressions.join('\n')}`,
    ).toEqual([])
  })

  it('the baseline ratchets down as surfaces migrate', () => {
    const stale: string[] = []
    for (const [file, allowed] of Object.entries(baseline)) {
      const current = counts[file] ?? 0
      if (current < allowed) stale.push(`${file}: ${allowed} → ${current}`)
    }
    expect(
      stale,
      `Offender counts dropped — lock in the progress: ` +
        `UPDATE_LEGACY_TOKEN_BASELINE=1 npx vitest run src/legacy-token-scan.test.ts\n${stale.join('\n')}`,
    ).toEqual([])
  })
})
