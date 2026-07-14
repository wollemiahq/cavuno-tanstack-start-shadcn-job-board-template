import { describe, expect, it } from 'vitest';

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, posix, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const SRC_ROOT = join(ROOT, 'src');
const BASELINE_PATH = join(ROOT, 'legacy-token-baseline.json');

const LEGACY_ICON_RE = /from\s+['"]@untitledui\/(?:icons|file-icons)['"]/g;
const UNMISTAKABLE_UUI_TOKEN_RE =
  /(?<![\w-])(?:bg|text|border|ring|outline|fill|stroke)-(?:fg(?:[-_][\w]+)?|brand(?:[-_][\w]+)?|error(?:[-_][\w]+)?|warning(?:[-_][\w]+)?|success(?:[-_][\w]+)?|utility(?:[-_][\w]+)?|tertiary(?:[-_][\w]+)?|quaternary(?:[-_][\w]+)?|placeholder(?:[-_][\w]+)?|(?:primary|secondary)_(?:hover|alt)(?:[-_][\w]+)?)(?![\w-])/g;
const RADIX_IMPORT_RE = /from\s+['"]@radix-ui\//;
const BASE_UI_PACKAGE = '@base-ui/react';

type Counts = {
  imports: number;
  icons: number;
  tokens: number;
};

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'paraglide') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name))
      out.push(path);
  }
  return out;
}

function occurrences(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

function importSpecifiers(source: string): string[] {
  return Array.from(
    source.matchAll(/(?:\bfrom\s+|\bimport\s*(?:\(\s*)?)["']([^"']+)["']/g),
    (match) => match[1],
  );
}

function legacyImportCount(file: string, source: string): number {
  return importSpecifiers(source).filter((specifier) => {
    const target = /^[@#]\//.test(specifier)
      ? `src/${specifier.slice(2)}`
      : specifier.startsWith('.')
        ? posix.normalize(posix.join(posix.dirname(file), specifier))
        : null;
    return /^src\/components\/(?:base|application|untitled-ui)(?:\/|$)/.test(
      target ?? '',
    );
  }).length;
}

function legacyTokenCount(_file: string, source: string): number {
  return occurrences(source, UNMISTAKABLE_UUI_TOKEN_RE);
}

function directBaseUiImportCount(file: string, source: string): number {
  const isOwnedUiSource = file.startsWith('src/components/ui/');
  return importSpecifiers(source).filter((specifier) => {
    if (
      specifier !== BASE_UI_PACKAGE &&
      !specifier.startsWith(`${BASE_UI_PACKAGE}/`)
    ) {
      return false;
    }
    if (!isOwnedUiSource) return true;
    return false;
  }).length;
}

function scan(): Record<string, Counts> {
  const counts: Record<string, Counts> = {};
  for (const path of sourceFiles(SRC_ROOT)) {
    const file = relative(ROOT, path);
    const source = readFileSync(path, 'utf8');
    const entry = {
      imports: legacyImportCount(file, source),
      icons: occurrences(source, LEGACY_ICON_RE),
      tokens: legacyTokenCount(file, source),
    };
    if (entry.imports + entry.icons + entry.tokens > 0) counts[file] = entry;
  }
  return counts;
}

describe('legacy Untitled UI compatibility ratchet', () => {
  const counts = scan();

  if (process.env.UPDATE_LEGACY_TOKEN_BASELINE === '1') {
    it('baseline updated', () => {
      writeFileSync(
        BASELINE_PATH,
        JSON.stringify(
          Object.fromEntries(Object.entries(counts).sort()),
          null,
          2,
        ) + '\n',
      );
      expect(true).toBe(true);
    });
    return;
  }

  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Record<
    string,
    Counts
  >;

  it('never increases legacy imports, icons, or tokens', () => {
    const regressions: string[] = [];
    for (const [file, current] of Object.entries(counts)) {
      const allowed = baseline[file] ?? { imports: 0, icons: 0, tokens: 0 };
      for (const key of ['imports', 'icons', 'tokens'] as const) {
        if (current[key] > allowed[key]) {
          regressions.push(
            `${file} — ${key}: ${current[key]} > baseline ${allowed[key]}`,
          );
        }
      }
    }
    expect(
      regressions,
      `New Untitled UI compatibility usage is forbidden:\n${regressions.join('\n')}`,
    ).toEqual([]);
  });

  it('requires the baseline to ratchet down with each migration', () => {
    const stale: string[] = [];
    for (const [file, allowed] of Object.entries(baseline)) {
      const current = counts[file] ?? { imports: 0, icons: 0, tokens: 0 };
      for (const key of ['imports', 'icons', 'tokens'] as const) {
        if (current[key] < allowed[key]) {
          stale.push(`${file} — ${key}: ${allowed[key]} → ${current[key]}`);
        }
      }
    }
    expect(
      stale,
      `Lock in removed legacy usage with UPDATE_LEGACY_TOKEN_BASELINE=1:\n${stale.join('\n')}`,
    ).toEqual([]);
  });
});

describe('pure legacy scanner fixtures', () => {
  it('detects aliased and relative imports of inherited UUI components', () => {
    expect(
      legacyImportCount(
        'src/routes/example.tsx',
        `import { Input } from '@/components/base/input/input'`,
      ),
    ).toBe(1);
    expect(
      legacyImportCount(
        'src/routes/example.tsx',
        `import { Input } from '../components/base/input/input'`,
      ),
    ).toBe(1);
  });

  it('allows canonical Rhea tokens in pilots but detects unmistakable UUI tokens', () => {
    const pilot = 'src/components/rhea-auth-pilot.tsx';
    expect(
      legacyTokenCount(
        pilot,
        'bg-primary text-primary-foreground border-border text-muted-foreground',
      ),
    ).toBe(0);
    expect(
      legacyTokenCount(
        pilot,
        'text-tertiary bg-brand-solid border-secondary_alt text-fg-quaternary',
      ),
    ).toBe(4);
    expect(
      legacyTokenCount(
        'src/routes/-messages-runtime.tsx',
        'bg-primary text-primary-foreground border-border text-muted-foreground',
      ),
    ).toBe(0);
  });

  it('rejects Base UI root-barrel imports outside owned UI components', () => {
    expect(
      directBaseUiImportCount(
        'src/routes/example.tsx',
        `import { Button } from '@base-ui/react'`,
      ),
    ).toBe(1);
  });

  it('rejects Base UI subpath imports outside owned UI components', () => {
    expect(
      directBaseUiImportCount(
        'src/routes/example.tsx',
        `import { Dialog } from '@base-ui/react/dialog'`,
      ),
    ).toBe(1);
  });

  it('rejects dynamic Base UI imports outside owned UI components', () => {
    expect(
      directBaseUiImportCount(
        'src/components/example.tsx',
        `const button = import('@base-ui/react/button')`,
      ),
    ).toBe(1);
  });

  it('rejects side-effect Base UI imports outside owned UI components', () => {
    expect(
      directBaseUiImportCount(
        'src/components/example.tsx',
        `import '@base-ui/react/button'`,
      ),
    ).toBe(1);
  });

  it('allows app code to consume owned UI components', () => {
    expect(
      directBaseUiImportCount(
        'src/routes/example.tsx',
        `import { Button } from '@/components/ui/button'`,
      ),
    ).toBe(0);
  });

  it('allows safe Base UI subpaths inside owned UI components', () => {
    expect(
      directBaseUiImportCount(
        'src/components/ui/example.tsx',
        `import { Button } from '@base-ui/react/button'`,
      ),
    ).toBe(0);
  });

  it('allows the official Base UI root barrel inside owned UI components', () => {
    expect(
      directBaseUiImportCount(
        'src/components/ui/example.tsx',
        `import { Button } from '@base-ui/react'`,
      ),
    ).toBe(0);
  });

  it('allows portal-family subpaths inside globally themed owned UI components', () => {
    expect(
      directBaseUiImportCount(
        'src/components/ui/example.tsx',
        `import { Dialog } from '@base-ui/react/dialog'`,
      ),
    ).toBe(0);
  });

  it('permits an owned Base UI Select when its popup stays in the themed tree', () => {
    expect(
      directBaseUiImportCount(
        'src/components/ui/select.tsx',
        `import { Select as SelectPrimitive } from '@base-ui/react/select'\n<SelectPrimitive.Positioner />`,
      ),
    ).toBe(0);
  });
});

describe('foundation dependency boundary', () => {
  it('introduces neither a direct Radix dependency nor a Radix source import', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    const directDependencies = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    expect(
      Object.keys(directDependencies).filter((name) =>
        name.startsWith('@radix-ui/'),
      ),
    ).toEqual([]);

    const offenders = sourceFiles(SRC_ROOT)
      .filter((path) => RADIX_IMPORT_RE.test(readFileSync(path, 'utf8')))
      .map((path) => relative(ROOT, path));
    expect(offenders).toEqual([]);
  });

  it('keeps direct Base UI imports behind owned shadcn components', () => {
    const offenders = sourceFiles(SRC_ROOT)
      .filter((path) => {
        const file = relative(ROOT, path);
        return directBaseUiImportCount(file, readFileSync(path, 'utf8')) > 0;
      })
      .map((path) => relative(ROOT, path));
    expect(offenders).toEqual([]);
  });
});
