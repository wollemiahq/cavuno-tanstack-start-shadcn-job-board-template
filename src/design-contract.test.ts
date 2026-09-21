import { describe, expect, it } from 'vitest';

import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Lazy: the generator is the artifact under test — its absence should
// fail the generator tests, not prevent the rest of the contract from
// running.
const generatorLib = () => import('../scripts/gen-design-lib.mjs');

const root = join(import.meta.dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

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
  it('generates token metadata from a supplied theme without requiring committed docs', async () => {
    const { generateDesignFrontmatter, parseDesignFrontmatter } =
      await generatorLib();
    const fixture = mkdtempSync(join(tmpdir(), 'design-export-'));
    try {
      mkdirSync(join(fixture, 'src'));
      writeFileSync(
        join(fixture, 'src/theme.css'),
        `:root {
  --background: #fafafa;
  --primary: #123456;
  --accent: #abcdef;
  --radius: 0.75rem;
  --font-sans: 'Example Sans', sans-serif;
  --font-heading: 'Example Serif', serif;
}
.dark {
  --background: #121212;
}`,
      );
      const result = await generateDesignFrontmatter(fixture);
      const metadata = parseDesignFrontmatter(result.frontmatterBlock);
      expect(metadata.version).toBe('alpha');
      expect(metadata.colors).toMatchObject({
        background: '#fafafa',
        primary: '#123456',
        accent: '#abcdef',
      });
      expect(metadata.colors).not.toHaveProperty('radius');
      expect(metadata.typography.sans.fontFamily).toBe(
        "'Example Sans', sans-serif",
      );
      const dtcg = JSON.parse(result.dtcgJson);
      expect(dtcg.color.background).toMatchObject({
        $type: 'color',
        $value: '#fafafa',
      });
      expect(dtcg.color['background-dark']).toMatchObject({
        $type: 'color',
        $value: '#121212',
      });
      expect(dtcg.dimension.radius).toEqual({
        $type: 'dimension',
        $value: { value: 0.75, unit: 'rem' },
      });
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
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
