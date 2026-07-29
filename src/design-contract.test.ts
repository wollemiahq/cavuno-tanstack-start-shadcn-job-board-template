import { describe, expect, it } from 'vitest';

import { parseTokens } from '../scripts/theme-resolved-lib.mjs';

/**
 * The template must carry:
 *  - AGENTS.md — the workflow rule source (agents.md convention). The
 *    contract anchors below are load-bearing, not style.
 *  - DESIGN.md + design/tokens.dtcg.json — GENERATED artifacts (Google
 *    Labs design.md spec pinned at `alpha`; DTCG 2025.10 interchange).
 *    Hand-editing either fails the explicit `gen:design -- --check` CI step.
 *    Unit tests here cover the lightweight parsing and splice contracts
 *    without repeating the full repository-wide generator inside Vitest.
 *  - The pnpm 11 supply-chain posture: dependency lifecycle
 *    scripts blocked unless allowlisted, minimumReleaseAge cooldown on.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Lazy: the generator is the artifact under test — its absence should
// fail the generator tests, not prevent the rest of the contract from
// running.
const generatorLib = () => import('../scripts/gen-design-lib.mjs');

const root = join(import.meta.dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('AGENTS.md workflow rules', () => {
  const agents = read('AGENTS.md');

  it('stays inside the ~190-line budget', () => {
    // Raised from 150 when AGENTS.md became the carrier for repo
    // orientation + working style (hosted-builder native-dialect arc):
    // those sections REPLACED the platform's larger computed
    // workspace-map injection, so net prompt size fell. The budget
    // stays tight on purpose — additions must trim elsewhere.
    expect(agents.split('\n').length).toBeLessThanOrEqual(190);
  });

  it('carries the five required rule anchors', () => {
    // Never-greenfield: generation customizes this template, never
    // rebuilds from scratch.
    expect(agents).toMatch(/never.{0,40}(greenfield|from scratch)/i);
    // Grounding config is not editable by agents.
    expect(agents).toContain('CAVUNO_BOARD');
    expect(agents).toContain('CAVUNO_API_URL');
    // Dependency policy is stated where agents read rules.
    expect(agents).toMatch(/minimumReleaseAge/);
    expect(agents).toMatch(/allowBuilds/);
    // Verify commands.
    expect(agents).toMatch(/pnpm (run )?typecheck/);
    expect(agents).toMatch(/pnpm (run )?test|pnpm test/);
    // Pointer to DESIGN.md for visual/component rules (three-layer split).
    expect(agents).toContain('DESIGN.md');
    // Agents must select a documented page-level pattern before composing a
    // route.
    expect(agents).toContain('docs/patterns/');
    expect(agents).toMatch(/select a pattern before composing a route/i);
  });

  it('names the view-model seam layer boundary', () => {
    // Agents must be told which layer they may restructure. Layer 1b
    // (`src/board` view-models)
    // and the SDK (Layer 1a) are CONSUMED, never rewritten — that is what
    // keeps a redesign from mis-calling the correctness functions. Layer 2
    // (`src/components`) is the redesign surface, free to restructure.
    expect(agents).toContain('src/board');
    expect(agents).toMatch(/Layer 1b|view-model/i);
    // `[\s\S]` not `.` — the invariant must survive a prose reflow that
    // wraps "never rewrite" across a line break.
    expect(agents).toMatch(/never[\s\S]{0,40}rewrit/i);
    expect(agents).toMatch(/Layer 2|restructure/i);
  });

  it('is the single rule source — CLAUDE.md defers to it', () => {
    expect(read('CLAUDE.md').trim()).toBe('@AGENTS.md');
  });
});

describe('DESIGN.md + DTCG generated artifacts', () => {
  it('frontmatter tokens are derived from theme.css', async () => {
    const { parseDesignFrontmatter } = await generatorLib();
    const fm = parseDesignFrontmatter(read('DESIGN.md'));
    const tokens = parseTokens(read('src/theme.css'));
    expect(fm.version).toBe('alpha');
    // Every :root color custom property surfaces as a frontmatter color.
    expect(fm.colors.background).toBe(tokens.light['--background']);
    expect(fm.colors.primary).toBe(tokens.light['--primary']);
    expect(fm.colors.accent).toBe(tokens.light['--accent']);
    expect(fm.colors).not.toHaveProperty('radius');
    // Typography derives from the font vars — assert the DERIVATION, not
    // the family: any preset may name a different one (docs/theming.md).
    expect(fm.typography.sans.fontFamily).toBe(tokens.light['--font-sans']);
  });

  it('documents theme.css as the radius token source', () => {
    const design = read('DESIGN.md');

    expect(design).toContain('`--radius` in `src/theme.css`');
    expect(design).not.toContain('`--radius` in `src/styles.css`');
  });

  it('the Components section is a full inventory of the component source', () => {
    const design = read('DESIGN.md');
    // Spot the required spec sections, in the spec's order.
    for (const section of [
      '## Overview',
      '## Colors',
      '## Typography',
      '## Components',
      "## Do's and Don'ts",
    ]) {
      expect(design).toContain(section);
    }
    // Every component module under src/components appears by name.
    for (const name of [
      'JobCard',
      'JobList',
      'JobSearchPage',
      'JobDetail',
      'Breadcrumb',
      'Badge',
      'Button',
      'Card',
    ]) {
      expect(design).toContain(name);
    }
    // Prop metadata is extracted from source, not hand-listed: a known
    // typed prop of a block component must be present.
    expect(design).toMatch(/JobCard[\s\S]{0,600}\bjob\b/);
  });

  it('attributes a local cva contract only to the component that consumes it', () => {
    const design = read('DESIGN.md');
    const componentBlock = (name: string) => {
      const start = design.indexOf(`### ${name} —`);
      const next = design.indexOf('\n### ', start + 1);
      return design.slice(start, next === -1 ? undefined : next);
    };

    expect(componentBlock('Empty')).not.toContain('Variants —');
    expect(componentBlock('EmptyContent')).not.toContain('Variants —');
    expect(componentBlock('EmptyDescription')).not.toContain('Variants —');
    expect(componentBlock('EmptyHeader')).not.toContain('Variants —');
    expect(componentBlock('EmptyMedia')).toContain(
      'Variants — `variant`: default, icon',
    );
    expect(componentBlock('EmptyTitle')).not.toContain('Variants —');
  });

  it('documents the token-to-pattern hierarchy and the constrained layout contracts', () => {
    const design = read('DESIGN.md');
    const sections = [
      '## Layout primitives',
      '## Components',
      '## Layout compositions',
      '## Patterns',
    ];
    let previous = -1;
    for (const section of sections) {
      const current = design.indexOf(section);
      expect(current, `${section} is missing`).toBeGreaterThan(previous);
      previous = current;
    }
    expect(design).toMatch(/### Box[\s\S]{0,1200}Defaults:/);
    expect(design).toMatch(/### PageContent[\s\S]{0,1600}Invariants:/);
  });

  it('imports the owned shadcn Typeset stylesheet and exposes one content preset', () => {
    const styles = read('src/styles.css');
    const typeset = read('src/typeset.css');
    expect(styles).toMatch(/@import ['"]\.\/typeset\.css['"];?/);
    expect(typeset).toContain('.typeset {');
    expect(typeset).toContain('.typeset-content');
    expect(typeset).not.toMatch(/\.typeset-(?:docs|article|compact)/);
  });

  it('the DTCG export is valid 2025.10-shaped token JSON matching theme.css', () => {
    const dtcg = JSON.parse(read('design/tokens.dtcg.json'));
    const tokens = parseTokens(read('src/theme.css'));
    expect(dtcg.color.background.$type).toBe('color');
    expect(dtcg.color.background.$value.toLowerCase()).toBe(
      tokens.light['--background'].toLowerCase(),
    );
    expect(dtcg.color['background-dark'].$value.toLowerCase()).toBe(
      tokens.dark['--background'].toLowerCase(),
    );
    expect(dtcg.fontFamily.sans.$type).toBe('fontFamily');
    // Shape + derivation, not the value: `--radius` is the preset's to set.
    const [, radiusValue, radiusUnit] =
      tokens.light['--radius'].match(/^([\d.]+)([a-z%]+)$/) ?? [];
    expect(dtcg.dimension.radius).toEqual({
      $type: 'dimension',
      $value: { value: Number(radiusValue), unit: radiusUnit },
    });
  });
});

describe('dependency posture', () => {
  it('pins pnpm 11 as the package manager', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.packageManager).toMatch(/^pnpm@11\./);
  });

  it('blocks dependency lifecycle scripts and keeps the release-age cooldown', () => {
    const workspace = read('pnpm-workspace.yaml');
    // allowBuilds present and every entry explicitly false (empty
    // allowlist — nothing runs lifecycle scripts) unless a reviewed
    // exception is set to true with a comment.
    expect(workspace).toMatch(/allowBuilds:/);
    expect(workspace).not.toMatch(/allowBuilds:[\s\S]*?:\s*true/);
    // The cooldown is stated explicitly at the pnpm 11 default or stricter.
    const age = workspace.match(/minimumReleaseAge:\s*(\d+)/);
    expect(age).not.toBeNull();
    expect(Number(age![1])).toBeGreaterThanOrEqual(1440);
  });
});

describe('gen:design --frontmatter mode', () => {
  // Frontmatter-only mode preserves a customized DESIGN.md body while
  // regenerating the token-derived metadata.
  it('generateDesignFrontmatter reproduces the committed frontmatter and DTCG export', async () => {
    const { generateDesignFrontmatter } = await generatorLib();
    const partial = await generateDesignFrontmatter(root);
    expect(read('DESIGN.md').startsWith(partial.frontmatterBlock + '\n')).toBe(
      true,
    );
    expect(partial.dtcgJson).toBe(read('design/tokens.dtcg.json'));
  });

  it('spliceDesignFrontmatter replaces only the frontmatter — an edited body survives byte-for-byte', async () => {
    const { generateDesignFrontmatter, spliceDesignFrontmatter } =
      await generatorLib();
    const { frontmatterBlock } = await generateDesignFrontmatter(root);
    const body =
      '\n\n## Overview\n\nOperator intent: warm, trustworthy, sage green.\n';
    const stale = '---\nversion: stale\ncolors:\n  primary: "#000"\n---' + body;
    expect(spliceDesignFrontmatter(stale, frontmatterBlock)).toBe(
      frontmatterBlock + body,
    );
  });

  it('spliceDesignFrontmatter fails loud when the document has no frontmatter block', async () => {
    const { spliceDesignFrontmatter } = await generatorLib();
    expect(() =>
      spliceDesignFrontmatter('just a body, no block', '---\nx: y\n---'),
    ).toThrow(/frontmatter/);
  });
});
