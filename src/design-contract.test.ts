import { describe, expect, it } from 'vitest';

import { parseTokens } from '../scripts/theme-resolved-lib.mjs';

/**
 * The template must carry:
 *  - AGENTS.md — the contributor guidance source (agents.md convention).
 *    Runtime and behavior checks, not prose matching, protect correctness.
 *  - DESIGN.md + design/tokens.dtcg.json — GENERATED artifacts (Google
 *    Labs design.md spec pinned at `alpha`; DTCG 2025.10 interchange).
 *    CI checks token metadata; the generated component inventory is optional.
 *    Unit tests cover parsing and splicing without pinning documentation prose.
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
