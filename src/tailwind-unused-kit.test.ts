import { afterEach, describe, expect, it } from 'vitest';

import {
  excludedSourceDirectives,
  unusedKitFiles,
} from '../scripts/tailwind-unused-kit-plugin.mjs';

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * A UI kit component's classes may only leave the stylesheet while no file
 * imports it; the moment one does (an edit, or the builder), they must come
 * back.
 */

let dir: string | undefined;

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

function project(files: Record<string, string>) {
  dir = mkdtempSync(join(tmpdir(), 'kit-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return {
    srcDir: join(dir, 'src'),
    kitDir: join(dir, 'src/components/ui'),
  };
}

const names = (files: string[]) =>
  files.map((file) => file.split('/').pop()).sort();

describe('unusedKitFiles', () => {
  it('lists kit files that no other source file imports', () => {
    const dirs = project({
      'src/components/ui/button.tsx': 'export const Button = 1;',
      'src/components/ui/drawer.tsx': 'export const Drawer = 1;',
      'src/components/ui/sheet.tsx': "import { Button } from './button';",
      'src/routes/index.tsx': "import { Sheet } from '#/components/ui/sheet';",
    });

    expect(names(unusedKitFiles(dirs))).toEqual(['drawer.tsx']);
  });

  it('keeps a kit file once any file imports it, lazily or by alias', () => {
    const dirs = project({
      'src/components/ui/drawer.tsx': 'export const Drawer = 1;',
      'src/components/ui/tabs.tsx': 'export const Tabs = 1;',
      'src/routes/a.tsx':
        "const D = lazy(() => import('@/components/ui/drawer'));",
      'src/routes/b.tsx': 'import { Tabs } from "#/components/ui/tabs.tsx";',
    });

    expect(unusedKitFiles(dirs)).toEqual([]);
  });

  it('does not count tests or a file naming itself', () => {
    const dirs = project({
      'src/components/ui/drawer.tsx': "// see './drawer'",
      'src/components/ui/drawer.test.tsx': "import '#/components/ui/drawer';",
    });

    expect(names(unusedKitFiles(dirs))).toEqual(['drawer.tsx']);
  });
});

describe('excludedSourceDirectives', () => {
  it('writes paths relative to src/styles.css', () => {
    const file = resolve(import.meta.dirname, 'components/ui/drawer.tsx');

    expect(excludedSourceDirectives([file])).toBe(
      '@source not "./components/ui/drawer.tsx";',
    );
  });
});
