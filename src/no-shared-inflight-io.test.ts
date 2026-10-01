import { describe, expect, it } from 'vitest';

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * On Workers, a cancelled request's pending promises never settle, so a
 * promise kept in module scope hangs every later request that picks it up
 * (2026-10-02). Cross-request caches hold settled values via
 * src/lib/settled-cache.ts; this catches the two forms that brought the bug.
 */
const HANG_SOURCES = [
  { name: 'a Map of promises', pattern: /\b(?:Weak)?Map<[^;]*\bPromise</ },
  {
    name: 'a module-scope promise variable',
    pattern: /^(?:export )?(?:let|var|const) \w+\s*:\s*Promise</m,
  },
];

function sourceFiles(): string[] {
  const root = resolve(process.cwd(), 'src');
  return readdirSync(root, { recursive: true })
    .map(String)
    .filter(
      (path) =>
        /\.tsx?$/.test(path) &&
        !/\.test\.tsx?$/.test(path) &&
        !path.startsWith('paraglide'),
    )
    .map((path) => resolve(root, path));
}

describe('no in-flight I/O shared across requests', () => {
  it('keeps pending promises out of module-scope caches', () => {
    const files = sourceFiles();
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const { name, pattern } of HANG_SOURCES) {
        expect(pattern.test(source), `${file} holds ${name}`).toBe(false);
      }
    }
  });
});
