import { iconLibraries } from 'shadcn/icons';
import { describe, expect, it } from 'vitest';

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dirname, '..');

/**
 * Candidate icon packages come from the shadcn CLI's own catalog
 * (`shadcn/icons`), not a list we maintain — so a library the CLI learns to
 * target is a library this gate learns to police. `radix` is the one the
 * catalog omits: the CLI keeps `@radix-ui/react-icons` in its migration map
 * only, as a legacy source, so it is unioned in explicitly.
 */
const ICON_PACKAGES = new Map<string, string>([
  ...Object.entries(iconLibraries).flatMap(([library, meta]) =>
    ((meta as { packages?: readonly string[] }).packages ?? []).map(
      (pkg) => [pkg, library] as [string, string],
    ),
  ),
  ['@radix-ui/react-icons', 'radix'],
]);

/**
 * Hand-inlined third-party BRAND MARKS — Google, X, LinkedIn, Facebook.
 * No icon library ships them, and Google's mark carries literal brand fills
 * that must not be recolored, so they are out of scope of any icon migration
 * by definition. `src/theme-portability.test.ts` allowlists the same file for
 * the same underlying reason.
 */
const BRAND_MARK_FILES = ['src/components/brand-icons.tsx'];

/** Every .ts/.tsx file under src/, brand marks and this gate excluded. */
function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry)) out.push(full);
    }
  };
  walk(join(root, 'src'));
  const skip = new Set([...BRAND_MARK_FILES, 'src/icon-set-contract.test.ts']);
  return out.filter((file) => !skip.has(relative(root, file)));
}

/** library → the files importing it, derived from real import statements. */
function iconLibrariesInUse(): Map<string, string[]> {
  const inUse = new Map<string, string[]>();
  for (const file of sourceFiles()) {
    const source = readFileSync(file, 'utf8');
    for (const [pkg, library] of ICON_PACKAGES) {
      const imports = new RegExp(
        `from\\s+['"]${pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:/[^'"]*)?['"]`,
      ).test(source);
      if (!imports) continue;
      inUse.set(library, [...(inUse.get(library) ?? []), relative(root, file)]);
    }
  }
  return inUse;
}

describe('icon set contract', () => {
  it('ships exactly one icon library across src/**', () => {
    const inUse = iconLibrariesInUse();

    // Reported as a name→files map so a failure names the stragglers to fix
    // rather than just asserting a number.
    const report = Object.fromEntries(
      [...inUse].map(([library, files]) => [
        library,
        files.length <= 4
          ? files
          : [...files.slice(0, 4), `+${files.length - 4} more`],
      ]),
    );

    expect(
      [...inUse.keys()].sort(),
      `Expected one icon library, found ${inUse.size}: ${JSON.stringify(report, null, 2)}`,
    ).toHaveLength(1);
  });

  it('matches the library components.json declares', () => {
    const [inUse] = [...iconLibrariesInUse().keys()];
    const config = JSON.parse(
      readFileSync(join(root, 'components.json'), 'utf8'),
    ) as { iconLibrary: string };

    // Whichever library is actually imported must be the one the CLI config
    // names, so a later `shadcn add` resolves icons against the real set.
    // `shadcn migrate icons` does NOT write this field when it is given a
    // path or glob, which is exactly how a whole-repo migration runs it.
    expect(config.iconLibrary).toBe(inUse);
  });

  it('declares only the icon package it actually uses', () => {
    const [inUse] = [...iconLibrariesInUse().keys()];
    const pkg = JSON.parse(
      readFileSync(join(root, 'package.json'), 'utf8'),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const declared = { ...pkg.dependencies, ...pkg.devDependencies };

    const stale = [...ICON_PACKAGES]
      .filter(([pkgName, library]) => library !== inUse && pkgName in declared)
      .map(([pkgName]) => pkgName);

    expect(
      stale,
      `package.json still declares icon packages the app does not import: ${stale.join(', ')}`,
    ).toEqual([]);
  });
});
