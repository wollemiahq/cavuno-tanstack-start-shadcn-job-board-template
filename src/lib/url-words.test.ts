import { afterEach, describe, expect, it } from 'vitest';

import { readPreviousUrlWords } from '../../scripts/url-words-plugin.mjs';

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const COMPILED = new Set(['nl', 'fr']);
const dirs: string[] = [];

function file(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'url-words-'));
  dirs.push(dir);
  const path = join(dir, 'url-words-previous.json');
  writeFileSync(path, contents);
  return path;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true });
});

describe('retired URL word file', () => {
  it('keeps compiled locales only', () => {
    const path = file(
      JSON.stringify({
        nl: { jobs: ['vacatures'] },
        de: { jobs: ['stellen'] },
      }),
    );
    expect(readPreviousUrlWords(path, COMPILED)).toEqual({
      nl: { jobs: ['vacatures'] },
    });
  });

  it('reads a missing or malformed file as no retired words', () => {
    expect(
      readPreviousUrlWords(join(tmpdir(), 'missing.json'), COMPILED),
    ).toEqual({});
    for (const contents of ['{ nope', '[]', '"x"', 'null']) {
      expect(readPreviousUrlWords(file(contents), COMPILED)).toEqual({});
    }
  });

  it('drops entries that are not the documented shape', () => {
    const path = file(
      JSON.stringify({
        nl: { jobs: 'vacatures', companies: ['ondernemingen', 7], skills: [] },
        fr: ['emplois'],
      }),
    );
    expect(readPreviousUrlWords(path, COMPILED)).toEqual({
      nl: { companies: ['ondernemingen'] },
    });
  });
});
