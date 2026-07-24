import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

/**
 * Every `@import '@fontsource…'` in theme.css, split into the npm package
 * name (what must be installed) and the family slug (what the token must
 * name). Handles both variable packages (`@fontsource-variable/inter`) and
 * the static per-weight subpaths (`@fontsource/poppins/400.css`).
 */
function fontsourceImports(css: string) {
  return [
    ...css.matchAll(
      /@import\s+['"](@fontsource(?:-variable)?)\/([a-z0-9-]+)(\/[^'"]*)?['"]/g,
    ),
  ].map(([, scope, slug, subpath]) => ({
    specifier: `${scope}/${slug}${subpath ?? ''}`,
    pkg: `${scope}/${slug}`,
    slug,
  }));
}

describe('shadcn theme foundation', () => {
  it('loads the canonical theme and single typeset preset', () => {
    const styles = read('src/styles.css');

    expect(styles).toMatch(/@import ['"]\.\/theme\.css['"]/);
    expect(styles).toMatch(/@import ['"]\.\/typeset\.css['"]/);
    expect(styles).not.toContain('Inter');
    expect(styles).not.toContain('@plugin');
  });

  it('owns the theme tokens and the only custom responsive breakpoint', () => {
    const theme = read('src/theme.css');

    expect(theme).toContain('--breakpoint-xs: 37.5rem');
    expect(theme).toContain('@apply bg-background text-foreground');
  });

  // Fonts are swappable theme tokens — assert the structure any
  // font must satisfy, never a specific family. The declared families
  // must be backed by an imported fontsource package (self-hosted; a
  // swap that forgets the import ships a fallback-only font silently).
  //
  // Quoting is NOT the contract: tweakcn-style presets write
  // `--font-sans: Poppins, sans-serif` with no quotes, which is valid CSS
  // for a single-word family. The contract is that whatever family the
  // token names has a matching `@import`.
  it('backs every declared font family with an imported fontsource package', () => {
    const theme = read('src/theme.css');

    const importedSlugs = fontsourceImports(theme).map((i) => i.slug);
    expect(importedSlugs.length).toBeGreaterThan(0);

    /** First family in a font stack, quoted or bare, as a fontsource slug. */
    const familySlug = (value: string) => {
      const first = value.split(',')[0]?.trim() ?? '';
      const family = first.match(/^['"]([^'"]+)['"]$/)?.[1] ?? first;
      if (!family) return null;
      return family
        .replace(/\s+Variable$/i, '')
        .toLowerCase()
        .replace(/\s+/g, '-');
    };

    const fontSans = theme.match(/--font-sans:\s*([^;]+);/)?.[1] ?? '';
    const sansSlug = familySlug(fontSans);
    expect(sansSlug, '--font-sans must name a family').toBeTruthy();
    expect(
      importedSlugs,
      `--font-sans names "${fontSans.trim()}" but no @fontsource import matches "${sansSlug}"`,
    ).toContain(sansSlug);

    const fontHeading = theme.match(/--font-heading:\s*([^;]+);/)?.[1] ?? '';
    if (!/var\(--font-sans\)/.test(fontHeading)) {
      const headingSlug = familySlug(fontHeading);
      expect(
        headingSlug,
        '--font-heading must inherit or name a family',
      ).toBeTruthy();
      expect(
        importedSlugs,
        `--font-heading names "${fontHeading.trim()}" but no @fontsource import matches "${headingSlug}"`,
      ).toContain(headingSlug);
    }
  });

  // An import whose package is not installed
  // is a PHANTOM font — Vite resolves nothing and the board silently renders
  // in a system fallback. Third-party presets (tweakcn `sera`/`lyra`) write
  // imports for Playfair Display, Noto Sans and JetBrains Mono; if none of
  // those got installed, the theme ships a font it does not have.
  //
  // This is a defect regardless of WHO applied the theme. It says nothing
  // about which families are allowed: an operator who deliberately installs
  // an off-catalog font (e.g. via `--only theme,font`, which does run an
  // install) passes this gate the moment the dependency is declared. The fix
  // is always "install the package / write the import", never "use fewer
  // fonts".
  it('installs every @fontsource package that theme.css imports', () => {
    const theme = read('src/theme.css');
    const pkg = JSON.parse(read('package.json')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const declared = new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ]);

    const imports = fontsourceImports(theme);
    expect(imports.length).toBeGreaterThan(0);

    for (const { pkg: name, specifier } of imports) {
      expect(
        declared.has(name),
        `src/theme.css imports "${specifier}" but "${name}" is not a declared dependency — ` +
          'the font will silently fall back to a system face. Install the package ' +
          '(an operator applying a preset with `--only theme,font` gets this ' +
          'automatically), or point the import at a family from the pre-installed ' +
          'catalog (docs/theming.md §Fonts).',
      ).toBe(true);
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
      expect(
        pkg.dependencies[name],
        `${name} must be pre-installed`,
      ).toBeTruthy();
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
