import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('shadcn Rhea theme foundation', () => {
  it('loads the canonical theme and single typeset preset', () => {
    const styles = read('src/styles.css');

    expect(styles).toMatch(/@import ['"]\.\/theme\.css['"]/);
    expect(styles).toMatch(/@import ['"]\.\/typeset\.css['"]/);
    expect(styles).not.toContain('styles/untitled-ui');
    expect(styles).not.toContain('Inter');
    expect(styles).not.toContain('@plugin');
  });

  it('owns Rhea tokens and the only custom responsive breakpoint', () => {
    const theme = read('src/theme.css');

    expect(theme).toContain('--breakpoint-xs: 37.5rem');
    expect(theme).toContain('@apply bg-background text-foreground');
  });

  // FNT-01: fonts are swappable theme tokens — assert the STRUCTURE any
  // font must satisfy, never a specific family. The declared families
  // must be backed by an imported fontsource package (self-hosted; a
  // swap that forgets the import ships a fallback-only font silently).
  it('backs every declared font family with an imported fontsource package', () => {
    const theme = read('src/theme.css');

    const importedSlugs = [
      ...theme.matchAll(
        /@import ['"]@fontsource(?:-variable)?\/([a-z0-9-]+)(?:\/[^'"]+)?['"]/g,
      ),
    ].map((m) => m[1]);
    expect(importedSlugs.length).toBeGreaterThan(0);

    const familySlug = (value: string) => {
      const family = value.match(/['"]([^'"]+)['"]/)?.[1];
      if (!family) return null;
      return family
        .replace(/\s+Variable$/i, '')
        .toLowerCase()
        .replace(/\s+/g, '-');
    };

    const fontSans = theme.match(/--font-sans:\s*([^;]+);/)?.[1] ?? '';
    const sansSlug = familySlug(fontSans);
    expect(sansSlug, '--font-sans must name a quoted family').toBeTruthy();
    expect(importedSlugs).toContain(sansSlug);

    const fontHeading = theme.match(/--font-heading:\s*([^;]+);/)?.[1] ?? '';
    if (!/var\(--font-sans\)/.test(fontHeading)) {
      const headingSlug = familySlug(fontHeading);
      expect(headingSlug, '--font-heading must inherit or name a quoted family').toBeTruthy();
      expect(importedSlugs).toContain(headingSlug);
    }
  });

  it('ships the full 20-font catalog so a swap never needs a dependency change', () => {
    const pkg = JSON.parse(read('package.json')) as {
      dependencies: Record<string, string>;
    };
    const CATALOG_PACKAGES = [
      '@fontsource-variable/inter',
      '@fontsource-variable/plus-jakarta-sans',
      '@fontsource-variable/dm-sans',
      '@fontsource-variable/outfit',
      '@fontsource-variable/space-grotesk',
      '@fontsource-variable/geist',
      '@fontsource-variable/public-sans',
      '@fontsource-variable/figtree',
      '@fontsource-variable/work-sans',
      '@fontsource-variable/open-sans',
      '@fontsource-variable/lexend',
      '@fontsource-variable/manrope',
      '@fontsource-variable/source-sans-3',
      '@fontsource-variable/source-serif-4',
      '@fontsource-variable/lora',
      '@fontsource-variable/crimson-pro',
      '@fontsource/be-vietnam-pro',
      '@fontsource/poppins',
      '@fontsource/hind',
      '@fontsource/fira-sans',
    ];
    for (const name of CATALOG_PACKAGES) {
      expect(pkg.dependencies[name], `${name} must be pre-installed`).toBeTruthy();
    }
  });

  it('uses the document dark class without the retired dark-mode variant', () => {
    const styles = `${read('src/styles.css')}\n${read('src/theme.css')}`;

    expect(styles).not.toContain('dark-mode');
    expect(styles).toContain('@custom-variant dark');
  });

  it('matches native controls to the active light or dark document theme', () => {
    const theme = read('src/theme.css');

    expect(theme).toMatch(/:root\s*{[^}]*color-scheme:\s*light/s);
    expect(theme).toMatch(/\.dark\s*{[^}]*color-scheme:\s*dark/s);
  });

  it('hands rich text to the owned shadcn Typeset preset', () => {
    const prose = read('src/components/prose.tsx');
    const typeset = read('src/typeset.css');

    expect(prose).toContain("'typeset typeset-content'");
    expect(typeset).toContain('.typeset-content');
    expect(typeset).toContain('--typeset-font-heading: var(--font-heading)');
  });

  it('mounts the owned not-found page as the router default', () => {
    const router = read('src/router.tsx');

    expect(router).toContain('./components/app-not-found');
    expect(router).toContain('defaultNotFoundComponent: NotFound');
  });
});
