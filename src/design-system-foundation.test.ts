import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('shadcn design system foundation', () => {
  it('declares the installed Base UI preset contract', () => {
    const config = JSON.parse(read('components.json'));

    expect(config).toMatchObject({
      style: 'base-rhea',
      rsc: false,
      menuColor: 'default',
      menuAccent: 'subtle',
      tailwind: {
        cssVariables: true,
        prefix: '',
      },
    });
    expect(typeof config.iconLibrary).toBe('string');
    expect(config.iconLibrary.length).toBeGreaterThan(0);
    expect(typeof config.tailwind.baseColor).toBe('string');
    expect(config.tailwind.baseColor.length).toBeGreaterThan(0);
  });

  it('declares the complete color-token contract for light and dark themes', () => {
    const theme = read('src/theme.css');
    const declaredIn = (selector: string) => {
      const body = theme.match(
        new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`),
      )?.[1];
      expect(body, `${selector} must declare a token block`).toBeTruthy();
      return [...(body ?? '').matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]);
    };
    const required = [
      '--background',
      '--foreground',
      '--card',
      '--card-foreground',
      '--popover',
      '--popover-foreground',
      '--primary',
      '--primary-foreground',
      '--secondary',
      '--secondary-foreground',
      '--muted',
      '--muted-foreground',
      '--accent',
      '--accent-foreground',
      '--destructive',
      '--destructive-foreground',
      '--border',
      '--input',
      '--ring',
      '--chart-1',
      '--chart-2',
      '--chart-3',
      '--chart-4',
      '--chart-5',
      '--sidebar',
      '--sidebar-foreground',
      '--sidebar-primary',
      '--sidebar-primary-foreground',
      '--sidebar-accent',
      '--sidebar-accent-foreground',
      '--sidebar-border',
      '--sidebar-ring',
    ];

    const light = declaredIn(':root');
    const dark = declaredIn('.dark');
    for (const token of required) {
      expect(light, `:root must declare ${token}`).toContain(token);
      expect(dark, `.dark must declare ${token}`).toContain(token);
    }
    expect(light).toContain('--radius');
  });

  it('derives the radius scale from one theme token', () => {
    const theme = read('src/theme.css');

    for (const step of ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl']) {
      expect(
        theme,
        `--radius-${step} must be derived from var(--radius)`,
      ).toMatch(new RegExp(`--radius-${step}:[^;]*var\\(--radius\\)`));
    }
  });
});
