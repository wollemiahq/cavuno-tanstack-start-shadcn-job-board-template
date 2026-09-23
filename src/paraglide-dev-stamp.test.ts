import { afterEach, describe, expect, it } from 'vitest';

import {
  PARAGLIDE_STAMP_FILE,
  PARAGLIDE_VITE_IS_SERVER,
  paraglideInputsDigest,
  readParaglideStamp,
} from '../scripts/paraglide-dev-stamp.mjs';

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * The Vite plugin skips its startup compile when `gen:paraglide` left a
 * stamp for the same inputs and options. A stale stamp would serve old
 * translations, so every input must move the digest, and the generator's
 * output must be what the plugin itself would have written.
 */

const root = resolve(import.meta.dirname, '..');
const DEV = {
  outputStructure: 'locale-modules',
  strategy: ['url', 'baseLocale'],
  isServer: PARAGLIDE_VITE_IS_SERVER,
};

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

/** A copy of the inlang project and its catalogs. */
function projectCopy(): string {
  const dir = mkdtempSync(join(tmpdir(), 'paraglide-stamp-'));
  dirs.push(dir);
  cpSync(join(root, 'project.inlang'), join(dir, 'project.inlang'), {
    recursive: true,
  });
  cpSync(join(root, 'messages'), join(dir, 'messages'), { recursive: true });
  return join(dir, 'project.inlang');
}

function edit(path: string, change: (text: string) => string) {
  writeFileSync(path, change(readFileSync(path, 'utf8')));
}

describe('paraglideInputsDigest', () => {
  it('is stable for unchanged inputs and options', () => {
    const project = projectCopy();
    expect(paraglideInputsDigest(project, DEV)).toMatch(/^[0-9a-f]{64}$/);
    expect(paraglideInputsDigest(project, DEV)).toBe(
      paraglideInputsDigest(project, { ...DEV }),
    );
  });

  it.each([
    ['output structure', { outputStructure: 'message-modules' }],
    ['strategy', { strategy: ['url'] }],
    ['isServer', { isServer: "typeof window === 'undefined'" }],
  ])('moves with the %s option', (_, change) => {
    const project = projectCopy();
    expect(paraglideInputsDigest(project, { ...DEV, ...change })).not.toBe(
      paraglideInputsDigest(project, DEV),
    );
  });

  it.each([
    [
      'a catalog edit',
      (project: string) =>
        edit(join(project, '..', 'messages', 'en.json'), (text) =>
          text.replace('{', '{ '),
        ),
    ],
    [
      'a new catalog',
      (project: string) =>
        writeFileSync(join(project, '..', 'messages', 'xx.json'), '{}'),
    ],
    [
      'a settings edit',
      (project: string) =>
        edit(join(project, 'settings.json'), (text) =>
          text.replace('"baseLocale"', '"$note": 1, "baseLocale"'),
        ),
    ],
  ])('moves with %s', (_, change) => {
    const project = projectCopy();
    const before = paraglideInputsDigest(project, DEV);
    change(project);
    expect(paraglideInputsDigest(project, DEV)).not.toBe(before);
  });

  it('is null when the project cannot be read', () => {
    expect(paraglideInputsDigest(join(tmpdir(), 'no-such.inlang'), DEV)).toBe(
      null,
    );
  });
});

describe('gen:paraglide', () => {
  it("writes the plugin's runtime and a stamp the plugin's dev options match", () => {
    const outdir = mkdtempSync(join(tmpdir(), 'paraglide-out-'));
    dirs.push(outdir);
    execFileSync(
      process.execPath,
      [
        join(root, 'scripts/gen-paraglide.mjs'),
        '--project',
        './project.inlang',
        '--outdir',
        outdir,
        '--output-structure',
        'locale-modules',
        '--strategy',
        'url',
        'baseLocale',
      ],
      { cwd: root, stdio: 'pipe' },
    );

    expect(readParaglideStamp(outdir)).toBe(
      paraglideInputsDigest(join(root, 'project.inlang'), DEV),
    );
    expect(readFileSync(join(outdir, 'runtime.js'), 'utf8')).toContain(
      `export const isServer = ${PARAGLIDE_VITE_IS_SERVER};`,
    );
    expect(readFileSync(join(outdir, PARAGLIDE_STAMP_FILE), 'utf8')).toMatch(
      /^[0-9a-f]{64}\n$/,
    );
  });
});
