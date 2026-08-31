import { describe, expect, it } from 'vitest';

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dirname, '..');
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const legacyGlobal = ['window', 'Tinybird'].join('.');
const legacyPackage = ['@tinybirdco', 'flock'].join('/');
const legacyToken = ['CAVUNO', 'TRACKER', 'TOKEN'].join('_');
const FORBIDDEN: { id: string; re: RegExp }[] = [
  {
    id: legacyGlobal,
    re: new RegExp(`\\b${legacyGlobal.replace('.', '\\.')}\\b`),
  },
  { id: legacyPackage, re: new RegExp(legacyPackage) },
  { id: legacyToken, re: new RegExp(`\\b${legacyToken}\\b`) },
];
const SKIP = new Set(['node_modules', 'dist', '.git', 'coverage', 'paraglide']);

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
      continue;
    }
    if (SOURCE_EXT.test(entry)) out.push(full);
  }
}

describe('analytics surface', () => {
  it('forbids legacy analytics APIs in src/', () => {
    const files: string[] = [];
    walk(join(root, 'src'), files);
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const rule of FORBIDDEN) {
        if (rule.re.test(text)) {
          hits.push(`${relative(root, file)}:${rule.id}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
