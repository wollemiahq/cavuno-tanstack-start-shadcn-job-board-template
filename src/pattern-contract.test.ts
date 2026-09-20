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
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const PATTERNS_DIR = join(root, 'docs', 'patterns');
const read = (p: string) => readFileSync(p, 'utf8');

const patterns = patternDocFiles(root);

describe('pattern docs (docs/patterns/)', () => {
  it('there is at least one pattern page besides the template and index', () => {
    // Guards against the glob silently matching nothing (which would make
    // the per-file suites below vacuously pass).
    expect(patterns.length).toBeGreaterThan(0);
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
