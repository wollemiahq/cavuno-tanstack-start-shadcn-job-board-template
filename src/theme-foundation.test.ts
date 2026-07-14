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

  it('owns Geist, Rhea tokens, and the only custom responsive breakpoint', () => {
    const theme = read('src/theme.css');

    expect(theme).toMatch(/@import ['"]@fontsource-variable\/geist['"]/);
    expect(theme).toMatch(/--font-sans: ['"]Geist Variable['"], sans-serif/);
    expect(theme).toContain('--breakpoint-xs: 37.5rem');
    expect(theme).toContain('@apply bg-background text-foreground');
  });

  it('uses the document dark class without the retired dark-mode variant', () => {
    const styles = `${read('src/styles.css')}\n${read('src/theme.css')}`;

    expect(styles).not.toContain('dark-mode');
    expect(styles).toContain('@custom-variant dark');
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
