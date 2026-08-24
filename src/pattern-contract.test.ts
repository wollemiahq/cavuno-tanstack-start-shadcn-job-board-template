import { describe, expect, it } from 'vitest';

import {
  PATTERN_FRONTMATTER_KEYS,
  PATTERN_SECTION_ORDER,
  parsePatternDoc,
  patternDocFiles,
} from '../scripts/gen-design-lib.mjs';

/**
 * Pattern-doc contract. The pattern layer lives in
 * docs/patterns/ as markdown with a fixed shape, so agents (and the DESIGN.md
 * generator that reads the frontmatter) can rely on it. This gate keeps the
 * docs structurally honest:
 *
 *  (a) every pattern page carries the template's `## ` sections IN ORDER,
 *  (b) the frontmatter parses and carries name / purpose / primitives / usedBy,
 *  (c) the README taxonomy index links every pattern page.
 *
 * It does NOT assert prose — content review is a human job. Structure is what
 * the generator and the cross-links depend on.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dirname, '..');
const PATTERNS_DIR = join(root, 'docs', 'patterns');
const SRC_DIR = join(root, 'src');
const read = (p: string) => readFileSync(p, 'utf8');

/** Every `.tsx` source file (excluding tests), recursively. */
function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...tsxFiles(path));
    } else if (
      entry.name.endsWith('.tsx') &&
      !entry.name.endsWith('.test.tsx')
    ) {
      out.push(path);
    }
  }
  return out;
}

const patterns = patternDocFiles(root);

describe('pattern docs (docs/patterns/)', () => {
  it('there is at least one pattern page besides the template and index', () => {
    // Guards against the glob silently matching nothing (which would make
    // the per-file suites below vacuously pass).
    expect(patterns.length).toBeGreaterThanOrEqual(14);
  });

  it('the folder holds only markdown (template, index, and pattern pages)', () => {
    const stray = readdirSync(PATTERNS_DIR).filter((f) => !f.endsWith('.md'));
    expect(stray, `non-markdown files in docs/patterns: ${stray}`).toEqual([]);
  });

  describe.each(patterns)('$slug', ({ file }) => {
    const md = read(file);
    const doc = parsePatternDoc(md);

    it('carries the required frontmatter keys, non-empty', () => {
      const frontmatter = new Map(
        Object.entries({
          name: doc.name,
          purpose: doc.purpose,
          primitives: doc.primitives,
          usedBy: doc.usedBy,
        }),
      );
      for (const key of PATTERN_FRONTMATTER_KEYS) {
        const value = frontmatter.get(key);
        const present = Array.isArray(value)
          ? value.length > 0
          : Boolean(value);
        expect(present, `frontmatter key "${key}" missing/empty`).toBe(true);
      }
    });

    it('usedBy globs point at real repo paths', () => {
      // usedBy is the contract a usage test asserts against — a typo here
      // would silently exempt a route. Every entry must resolve to a file.
      for (const glob of doc.usedBy) {
        expect(
          () => read(join(root, glob)),
          `usedBy path ${glob}`,
        ).not.toThrow();
      }
    });

    it('has the template sections in the enforced order', () => {
      // The body may carry extra `## ` headings, but the template's seven
      // must appear, in order, with none missing.
      const wanted = PATTERN_SECTION_ORDER;
      const present = doc.sections.filter((s) => wanted.includes(s));
      expect(present).toEqual(wanted);
    });
  });
});

describe('breadcrumb singleton (P6 — one implementation only)', () => {
  // The chevron-separated trail markup (the `<ol>` + `aria-current="page"`
  // current-page crumb) is the canonical breadcrumb primitive. It must live
  // in exactly one file: src/components/ui/breadcrumb.tsx. A hand-rolled
  // trail anywhere else would fork the primitive and drift.
  const OL_SIGNATURE = 'flex flex-wrap items-center gap-1.5 text-sm';
  const CURRENT_CRUMB = 'aria-current="page"';
  const CANONICAL = join('src', 'components', 'ui', 'breadcrumb.tsx');

  it('the trail markup exists only in board/breadcrumb.tsx', () => {
    const owners = tsxFiles(SRC_DIR)
      .filter((path) => {
        const source = read(path);
        return source.includes(OL_SIGNATURE) && source.includes(CURRENT_CRUMB);
      })
      .map((path) => relative(root, path));
    expect(
      owners,
      'a second breadcrumb implementation exists — compose the owned shadcn ' +
        'Breadcrumb from @/components/ui/breadcrumb instead of hand-rolling the trail',
    ).toEqual([CANONICAL]);
    expect(read(join(SRC_DIR, 'components/board/breadcrumb.tsx'))).toMatch(
      /from ["']@\/components\/ui\/breadcrumb["']/,
    );
  });
});

describe('breadcrumb placement (P6 — one shell placement)', () => {
  // The root shell resolves and seats one visible trail after route content
  // and before the footer. Domain pages may still emit breadcrumb JSON-LD,
  // but they never render a second visible breadcrumb.
  const BREADCRUMB_ELEMENT = '<Breadcrumb';
  const PLACEMENT_ELEMENT = '<ShellBreadcrumb';
  const BREADCRUMB_OWNERS = [
    join('src', 'components', 'board', 'breadcrumb.tsx'),
  ];
  const PLACEMENT_OWNERS = [join('src', 'routes', '__root.tsx')];

  it('renders the <Breadcrumb> trail element only inside the placement primitive', () => {
    const owners = tsxFiles(SRC_DIR)
      .filter((path) => read(path).includes(BREADCRUMB_ELEMENT))
      .map((path) => relative(root, path))
      .sort();
    expect(
      owners,
      'a route/component renders <Breadcrumb> directly — pass the resolved ' +
        'trail through the root shell instead',
    ).toEqual(BREADCRUMB_OWNERS);
  });

  it('seats the <ShellBreadcrumb> placement primitive only in the root shell', () => {
    const owners = tsxFiles(SRC_DIR)
      .filter((path) => read(path).includes(PLACEMENT_ELEMENT))
      .map((path) => relative(root, path))
      .sort();
    expect(
      owners,
      'a route/component seats <ShellBreadcrumb> directly — the root shell ' +
        'is the single visible placement owner',
    ).toEqual(PLACEMENT_OWNERS);
  });
});

describe('typography scale (P17 — authored headings use the heading role)', () => {
  // Larger Tailwind sizes are valid only when the same authored heading also
  // carries `font-heading`. Prose is excluded because its headings come from
  // sanitized HTML rather than authored JSX.
  const HEADING = /<h[1-6]\b[^>]*>/g;
  const LARGE_SIZE = /\btext-(?:2xl|3xl|4xl|5xl|6xl)\b/;
  const SCANNED = [
    join(root, 'src', 'routes'),
    join(root, 'src', 'components', 'board'),
  ];

  it('no authored heading in routes/board carries a raw off-scale size class', () => {
    const offenders = tsxFiles(SRC_DIR)
      .filter((path) => SCANNED.some((dir) => path.startsWith(dir + '/')))
      .filter((path) =>
        Array.from(read(path).matchAll(HEADING), ([tag]) => tag).some(
          (tag) => LARGE_SIZE.test(tag) && !tag.includes('font-heading'),
        ),
      )
      .map((path) => relative(root, path))
      .sort();
    expect(
      offenders,
      'an authored heading carries a large size without the font-heading role ' +
        '(see docs/patterns/typography.md)',
    ).toEqual([]);
  });
});

describe('pattern index (docs/patterns/README.md)', () => {
  const readme = read(join(PATTERNS_DIR, 'README.md'));

  it('links every pattern page', () => {
    const missing = patterns.filter(
      ({ slug }) => !readme.includes(`(${slug}.md)`),
    );
    expect(
      missing.map((p) => p.slug),
      'pattern pages absent from the README taxonomy table',
    ).toEqual([]);
  });

  it('every link in the taxonomy table resolves to a pattern page', () => {
    const linked = [...readme.matchAll(/\(([\w-]+)\.md\)/g)]
      .map((m) => m[1])
      .filter((slug) => slug !== '_template');
    const slugs = new Set(patterns.map((p) => p.slug));
    const dangling = linked.filter((slug) => !slugs.has(slug));
    expect(dangling, 'README links a non-existent pattern page').toEqual([]);
  });
});
