import { describe, expect, it } from 'vitest';

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Test-doctrine gate (AGENTS.md "Tests assert structure, never formatted
 * values"): formatted output — salary ranges, dates, location labels — is
 * pinned exactly once, by the SDK's golden tests. Component and mapper
 * tests here must not re-pin it: a currency-shaped literal in a test means
 * either an assertion is pinning formatter output (convert it to a
 * symbolic `vm.field` reference — never replay the SDK formatter) or a
 * fixture embeds formatter-shaped values (use neutral values /
 * `src/test/fixtures.ts`).
 *
 * Every re-pinned literal makes presentation edits fan out into unrelated
 * test-content rewrites, so the suite enforces this rule mechanically.
 */

/** `$120k` / `$120K` / `$120,000` / `$90 K` — currency-shaped literals. */
const CURRENCY_LITERAL = /\$\d+(?:[.,]\d+)*\s?[kK]?(?![a-zA-Z0-9_])/;

/** Allowed: `$0` (empty-state "never invents a value" absence checks). */
const ALLOWED = new Set(['$0']);

function testFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return testFilesUnder(path);
    return /\.test\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function currencyLiterals(path: string): string[] {
  const hits: string[] = [];
  const lines = readFileSync(path, 'utf8').split('\n');
  // Scan EVERY match on the line — an allowed `$0` early in a line must
  // never hide a real pin later on it (grok review, chassis #6).
  const global = new RegExp(CURRENCY_LITERAL.source, 'g');
  lines.forEach((line, index) => {
    for (const match of line.matchAll(global)) {
      if (!ALLOWED.has(match[0].trim())) {
        hits.push(`${path}:${index + 1} → ${match[0].trim()}`);
      }
    }
  });
  return hits;
}

describe('test doctrine — no formatter-shaped literals in tests', () => {
  it('components/ and board/ tests carry no currency-shaped literals', () => {
    const files = [
      ...testFilesUnder(join(import.meta.dirname, 'components')),
      ...testFilesUnder(join(import.meta.dirname, 'board')),
      ...testFilesUnder(join(import.meta.dirname, 'routes')),
    ];
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.flatMap(currencyLiterals);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
