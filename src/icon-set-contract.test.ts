import { iconLibraries } from 'shadcn/icons';
/**
 * ICO — one icon set, whichever one it is.
 *
 * AGENTS.md §Hard rules forbids a parallel icon set ("never add a parallel
 * component tree, icon set, CSS utility layer, or token system"), but until
 * this gate existed nothing enforced it. A half-finished icon migration
 * typechecks clean, builds clean, and passes every other test while the app
 * ships TWO icon libraries — verified empirically: a knowingly partial
 * lucide → tabler migration produced 0 type errors and a successful
 * production build.
 *
 * The shadcn CLI cannot close this itself. `shadcn migrate icons` skips any
 * icon it cannot map — no target equivalent, or a usage shape it does not
 * rewrite — prints them as warnings, and **exits 0**. "Migration complete."
 * is not the same claim as "nothing imports the old library any more".
 *
 * So this gate asserts CARDINALITY, not identity: exactly one icon library
 * may appear across `src/**`. It is deliberately NOT pinned to lucide — a
 * complete migration to tabler, phosphor, remixicon, hugeicons or radix
 * passes untouched, and only a PARTIAL one fails. That is the opposite of
 * the `iconLibrary: 'lucide'` string pins in `src/rhea-foundation.test.ts`
 * and `src/shadcn-only-release.test.ts`, which fail on any migration,
 * complete or not, and pass on a half-finished one.
 */
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

describe('icon set contract (ICO)', () => {
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
