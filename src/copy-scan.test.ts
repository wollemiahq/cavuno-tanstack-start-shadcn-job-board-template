// TS 7.0's default export exposes only `version`; its compiler API moved to
// unstable/* subpaths and won't stabilise until 7.1. This runtime AST scan
// stays on the TS 6 API via the official @typescript/typescript6 compat
// package while the project's tsc/editor run on TypeScript 7.
import ts from 'typescript-6'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Hardcoded-copy ratchet (Phase-1 gate; ported from the monorepo's
 * registry copy-catalog scan, ADR-0059 gate 1).
 *
 * Finds user-visible string literals in source: JSX text with letters,
 * string literals in known user-visible attributes, and bare literals in
 * JSX expression containers. Hardcoded copy renders English on every
 * locale and is invisible on /en-XA/ (unbracketed).
 *
 * RATCHET, not allowlist: `copy-scan-baseline.json` freezes the offender
 * count per file at gate-introduction time. New offenders fail CI; burning
 * offenders down requires re-baselining (run with
 * UPDATE_COPY_SCAN_BASELINE=1) so the count only ever decreases.
 */

const ROOT = join(import.meta.dirname, '..')
const SRC_ROOT = join(ROOT, 'src')
const BASELINE_PATH = join(ROOT, 'copy-scan-baseline.json')

const USER_VISIBLE_ATTRS = new Set([
  'placeholder',
  'aria-label',
  'title',
  'alt',
  'label',
])

/** Generated output and non-UI sources the scan skips. */
const SKIP_DIRS = new Set(['paraglide'])
const SKIP_FILES = /\.test\.tsx?$|routeTree\.gen\.ts$/

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

function scanFile(path: string): string[] {
  const violations: string[] = []
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  const report = (node: ts.Node, text: string) => {
    const trimmed = text.trim()
    if (!/[A-Za-z]{2,}/.test(trimmed)) return // symbols/single letters: not copy
    const { line } = source.getLineAndCharacterOfPosition(node.getStart())
    violations.push(`:${line + 1} — ${JSON.stringify(trimmed)}`)
  }

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      report(node, node.text)
    } else if (
      ts.isJsxAttribute(node) &&
      USER_VISIBLE_ATTRS.has(node.name.getText()) &&
      node.initializer
    ) {
      if (ts.isStringLiteral(node.initializer)) {
        report(node, node.initializer.text)
      } else if (
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression &&
        ts.isStringLiteral(node.initializer.expression)
      ) {
        report(node, node.initializer.expression.text)
      }
    } else if (
      ts.isJsxExpression(node) &&
      node.expression &&
      ts.isStringLiteral(node.expression) &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
    ) {
      report(node, node.expression.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return violations
}

function scan(): Map<string, string[]> {
  const byFile = new Map<string, string[]>()
  for (const path of sourceFiles(SRC_ROOT)) {
    const violations = scanFile(path)
    if (violations.length > 0) {
      byFile.set(relative(ROOT, path), violations)
    }
  }
  return byFile
}

describe('hardcoded-copy ratchet (en-XA coverage companion)', () => {
  const results = scan()
  const counts = Object.fromEntries(
    [...results.entries()].map(([file, v]) => [file, v.length]),
  )

  if (process.env.UPDATE_COPY_SCAN_BASELINE === '1') {
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

  it('no file gains hardcoded user-visible strings', () => {
    const regressions: string[] = []
    for (const [file, violations] of results) {
      const allowed = baseline[file] ?? 0
      if (violations.length > allowed) {
        regressions.push(
          `${file} — ${violations.length} > baseline ${allowed}:\n` +
            violations.map((v) => `  ${file}${v}`).join('\n'),
        )
      }
    }
    expect(
      regressions,
      `New hardcoded copy — route it through Paraglide messages ` +
        `(messages/en.json + de/fr, npm run gen:messages) or the boardCopy ` +
        `seam:\n${regressions.join('\n')}`,
    ).toEqual([])
  })

  it('the baseline ratchets down as strings are burned down', () => {
    const stale: string[] = []
    for (const [file, allowed] of Object.entries(baseline)) {
      const current = counts[file] ?? 0
      if (current < allowed) stale.push(`${file}: ${allowed} → ${current}`)
    }
    expect(
      stale,
      `Offender counts dropped — lock in the progress: ` +
        `UPDATE_COPY_SCAN_BASELINE=1 npx vitest run src/copy-scan.test.ts\n${stale.join('\n')}`,
    ).toEqual([])
  })
})
