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
        baseColor: 'neutral',
        cssVariables: true,
        prefix: '',
      },
    });
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

  it('carries representative exact values from the official Neutral preset', () => {
    const theme = read('src/theme.css');
    expect(theme).toContain('--primary: oklch(0.205 0 0)');
    expect(theme).toContain('--destructive: oklch(0.577 0.245 27.325)');
    expect(theme).toContain('--radius: 0.625rem');
    expect(theme).toContain('--primary: oklch(0.922 0 0)');
    expect(theme).toContain('--sidebar-primary: oklch(0.488 0.243 264.376)');
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
