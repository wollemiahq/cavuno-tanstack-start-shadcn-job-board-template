import { describe, expect, it } from 'vitest';

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = process.cwd();
const retiredDirectories = [
  'src/components/base',
  'src/components/application',
  'src/components/shared-assets',
  'src/components/untitled-ui',
  'src/components/foundations',
  'src/styles/untitled-ui',
];

function productionSources(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return productionSources(path);
    if (!['.ts', '.tsx'].includes(extname(entry.name))) return [];
    if (/\.(test|spec|stories)\.[^.]+$/.test(entry.name)) return [];
    return [path];
  });
}

describe('shadcn-only release boundary', () => {
  it('runs the shadcn-only boundary in CI instead of the retired inverse gate', () => {
    const workflow = readFileSync(
      resolve(root, '.github/workflows/ci.yml'),
      'utf8',
    );

    expect(workflow).toContain('Shadcn-only release boundary');
    expect(workflow).toContain('src/shadcn-only-release.test.ts');
    expect(workflow).not.toContain('No legacy primitive-stack imports');
    expect(workflow).not.toContain(
      'Use the Untitled UI base components + @untitledui/icons',
    );
  });

  it('does not ship the retired Untitled UI source trees', () => {
    for (const directory of retiredDirectories) {
      expect(existsSync(resolve(root, directory)), directory).toBe(false);
    }
  });

  it('has no production dependency on the retired UI layer', () => {
    for (const file of productionSources(resolve(root, 'src'))) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(
        /@untitledui\/icons|@\/components\/(?:base|application|shared-assets|untitled-ui)\/|rhea-theme/,
      );
    }
  });

  it('does not install the retired icon package', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string> };

    expect(packageJson.dependencies).not.toHaveProperty('@untitledui/icons');
    expect(packageJson.dependencies).not.toHaveProperty(
      '@untitledui/file-icons',
    );
  });

  it('loads only the canonical shadcn theme and typeset layers', () => {
    const styles = readFileSync(resolve(root, 'src/styles.css'), 'utf8');

    expect(styles).toMatch(/@import ['"]\.\/theme\.css['"]/);
    expect(styles).toMatch(/@import ['"]\.\/typeset\.css['"]/);
    expect(styles).not.toContain('styles/untitled-ui');
    expect(styles).not.toContain('--background-color-primary');
    expect(styles).not.toContain('--text-color-primary');
  });
});
