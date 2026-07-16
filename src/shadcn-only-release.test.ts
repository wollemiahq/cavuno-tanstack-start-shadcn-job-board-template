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

      if (!file.includes('/components/ui/')) {
        expect(source, file).not.toMatch(
          /from ['"](?:@base-ui\/react|@radix-ui\/)/,
        );
      }
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

  it('keeps the replaceable primitive seam in the local UI directory', () => {
    const components = JSON.parse(
      readFileSync(resolve(root, 'components.json'), 'utf8'),
    ) as {
      style: string;
      iconLibrary: string;
      aliases: { ui: string };
      tailwind: { css: string };
    };

    expect(components).toMatchObject({
      style: 'base-rhea',
      iconLibrary: 'lucide',
      aliases: { ui: '@/components/ui' },
      tailwind: { css: 'src/theme.css' },
    });
  });
});
