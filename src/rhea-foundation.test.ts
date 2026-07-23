import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('shadcn Rhea foundation', () => {
  it('declares the official Base UI Rhea preset contract', () => {
    const config = JSON.parse(read('components.json'));

    expect(config).toMatchObject({
      style: 'base-rhea',
      rsc: false,
      iconLibrary: 'lucide',
      menuColor: 'default',
      menuAccent: 'subtle',
      tailwind: {
        cssVariables: true,
        prefix: '',
      },
    });
    // `tailwind.baseColor` is deliberately NOT pinned to a value.
    // `shadcn apply` rewrites components.json to match the applied preset
    // (a taupe-based preset legitimately flips it to `taupe`), and the
    // field's job is to keep a LATER `shadcn add` resolving registry colors
    // against the theme that is actually installed. Pinning `neutral` would
    // turn every real theme swap red for no correctness gain; what must hold
    // is that the CLI-owned field is still declared.
    expect(typeof config.tailwind.baseColor).toBe('string');
    expect(config.tailwind.baseColor.length).toBeGreaterThan(0);
  });

  it('owns the Rhea theme globally without a parallel compatibility theme', () => {
    const styles = read('src/styles.css');

    expect(styles).toMatch(/@import ['"]\.\/theme\.css['"]/);
    expect(styles).not.toMatch(/styles\/untitled-ui|\.rhea-theme/);
  });

  it('applies the canonical shadcn base border and outline colors globally', () => {
    const theme = read('src/theme.css');
    const styles = read('src/styles.css');

    expect(theme).toMatch(
      /@layer base\s*{\s*\*\s*{\s*@apply border-border outline-ring\/50;/s,
    );
    expect(styles).not.toMatch(
      /border-color:\s*currentColor|outline-color:\s*currentColor/,
    );
  });

  it('keeps the auth pilot entirely on owned Rhea components', () => {
    const pilot = [
      'src/components/rhea-auth-pilot.tsx',
      'src/routes/auth.join.tsx',
      'src/routes/auth.sign-up.tsx',
      'src/routes/auth.employer.sign-up.tsx',
    ].map(read);

    for (const source of pilot) {
      expect(source).not.toMatch(/@untitledui|components\/base\//);
    }
    expect(pilot[1]).toContain('RoleSelector');
    expect(pilot[2]).toContain('RheaRegistrationPage');
    expect(pilot[3]).toContain('RheaRegistrationPage');
  });

  it('keeps the migrated candidate auth shell entirely on owned Rhea components', () => {
    const candidateAuth = read('src/components/auth-form.tsx');
    expect(candidateAuth).toMatch(/rhea-auth-pilot|components\/ui\//);
    expect(candidateAuth).not.toMatch(/@untitledui|components\/base\//);
  });

  it('loads the static tokens through the one global stylesheet entry', () => {
    expect(read('src/styles.css')).toMatch(/@import ['"]\.\/theme\.css['"]/);
    expect(JSON.parse(read('components.json')).tailwind.css).toBe(
      'src/theme.css',
    );
    expect(read('src/styles.css')).not.toContain('tokens.css');
    expect(read('src/routes/__root.tsx')).not.toContain('tokens.css?url');
  });

  // The starter's headline claim (docs/theming.md) is that ANY shadcn preset
  // re-skins the board with zero component edits. That makes token VALUES the
  // preset's business, not the test suite's — pinning literals here turned
  // every real swap red. What the foundation must guarantee is STRUCTURE: a
  // complete shadcn token set declared in both color schemes, so no surface
  // can reference a token the applied theme forgot to define.
  it('declares the complete shadcn token set in both color schemes', () => {
    const theme = read('src/theme.css');

    const declaredIn = (selector: string) => {
      const body = theme.match(
        new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`),
      )?.[1];
      expect(body, `${selector} must declare a token block`).toBeTruthy();
      return [...(body ?? '').matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]);
    };

    const REQUIRED_COLOR_TOKENS = [
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
    for (const token of REQUIRED_COLOR_TOKENS) {
      expect(light, `:root must declare ${token}`).toContain(token);
      expect(dark, `.dark must declare ${token}`).toContain(token);
    }

    // The radius scale in @theme is computed from one root-level `--radius`.
    expect(light).toContain('--radius');
  });

  it('derives the whole radius scale from the single --radius token', () => {
    const theme = read('src/theme.css');

    for (const step of ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl']) {
      expect(
        theme,
        `--radius-${step} must be derived from var(--radius)`,
      ).toMatch(new RegExp(`--radius-${step}:[^;]*var\\(--radius\\)`));
    }
  });

  it('keeps app composition on replaceable Base UI-backed shadcn APIs', () => {
    const auth = read('src/components/rhea-auth-pilot.tsx');
    expect(auth).not.toMatch(/@base-ui\/react|data-checked|data-state/);
    expect(auth).toContain('@/components/ui/radio-group');
  });

  it('tells future agents to use owned shadcn components exclusively', () => {
    // Contract anchor, not a prose pin: the builder derives its system
    // prompt from AGENTS.md, so the single-design-system rule must exist —
    // its wording is the owner's.
    const agents = read('AGENTS.md');
    expect(agents).toMatch(/shadcn.*Base UI/i);
    expect(agents).toMatch(/parallel component/i);
  });
});
