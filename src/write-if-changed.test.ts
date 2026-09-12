import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  syncDirectory,
  writeFileIfChanged,
} from '../scripts/write-if-changed.mjs';

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Generators run against a live `vp dev` server; every write is a reload,
 * and back-to-back reloads 500 the preview. Unchanged output must leave the
 * file (and its mtime) alone; real changes must still land.
 */

const PAST = new Date('2020-01-01T00:00:00Z');

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'write-if-changed-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function seed(path: string, content: string) {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content);
  utimesSync(path, PAST, PAST);
}

describe('writeFileIfChanged', () => {
  it('leaves a byte-identical file untouched', () => {
    const file = join(dir, 'a.ts');
    seed(file, 'export const a = 1;\n');

    expect(writeFileIfChanged(file, 'export const a = 1;\n')).toBe(false);
    expect(statSync(file).mtime).toEqual(PAST);
  });

  it('replaces a file whose bytes differ', () => {
    const file = join(dir, 'a.ts');
    seed(file, 'export const a = 1;\n');

    expect(writeFileIfChanged(file, 'export const a = 2;\n')).toBe(true);
    expect(readFileSync(file, 'utf8')).toBe('export const a = 2;\n');
    expect(readdirSync(dir)).toEqual(['a.ts']);
  });

  it('creates a missing file and its directory', () => {
    const file = join(dir, 'nested', 'b.json');

    expect(writeFileIfChanged(file, '{}\n')).toBe(true);
    expect(readFileSync(file, 'utf8')).toBe('{}\n');
  });
});

describe('syncDirectory', () => {
  it('writes nothing when the compiled output is unchanged', () => {
    const from = join(dir, 'from');
    const to = join(dir, 'to');
    for (const root of [from, to]) {
      seed(join(root, 'runtime.js'), 'runtime');
      seed(join(root, 'messages', 'en.js'), 'hello');
    }

    expect(syncDirectory(from, to)).toEqual({ written: [], removed: [] });
    expect(statSync(join(to, 'runtime.js')).mtime).toEqual(PAST);
    expect(statSync(join(to, 'messages', 'en.js')).mtime).toEqual(PAST);
  });

  it('updates changed files, adds new ones, and deletes removed ones', () => {
    const from = join(dir, 'from');
    const to = join(dir, 'to');
    seed(join(from, 'runtime.js'), 'runtime');
    seed(join(from, 'messages', 'en.js'), 'hello v2');
    seed(join(from, 'messages', 'de.js'), 'hallo');
    seed(join(to, 'runtime.js'), 'runtime');
    seed(join(to, 'messages', 'en.js'), 'hello');
    seed(join(to, 'messages', 'fr.js'), 'bonjour');

    const result = syncDirectory(from, to);

    expect(result.written.sort()).toEqual(
      [join('messages', 'de.js'), join('messages', 'en.js')].sort(),
    );
    expect(result.removed).toEqual([join('messages', 'fr.js')]);
    expect(readFileSync(join(to, 'messages', 'en.js'), 'utf8')).toBe(
      'hello v2',
    );
    expect(readFileSync(join(to, 'messages', 'de.js'), 'utf8')).toBe('hallo');
    expect(existsSync(join(to, 'messages', 'fr.js'))).toBe(false);
    expect(statSync(join(to, 'runtime.js')).mtime).toEqual(PAST);
  });

  it('populates a missing output directory', () => {
    const from = join(dir, 'from');
    const to = join(dir, 'to');
    seed(join(from, 'runtime.js'), 'runtime');

    expect(syncDirectory(from, to)).toEqual({
      written: ['runtime.js'],
      removed: [],
    });
    expect(readFileSync(join(to, 'runtime.js'), 'utf8')).toBe('runtime');
  });
});
