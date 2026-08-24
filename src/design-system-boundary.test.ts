import { describe, expect, it } from 'vitest';

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = process.cwd();

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

describe('design system boundary', () => {
  it('keeps framework primitives behind the owned UI seam', () => {
    for (const file of productionSources(resolve(root, 'src'))) {
      const source = readFileSync(file, 'utf8');

      if (!file.includes('/components/ui/')) {
        expect(source, file).not.toMatch(
          /from ['"](?:@base-ui\/react|@radix-ui\/)/,
        );
      }
    }
  });

  it('keeps the replaceable primitive seam in the local UI directory', () => {
    const components = JSON.parse(
      readFileSync(resolve(root, 'components.json'), 'utf8'),
    );

    expect(components).toMatchObject({
      style: 'base-rhea',
      aliases: { ui: '@/components/ui' },
      tailwind: { css: 'src/theme.css' },
    });
    expect(components.iconLibrary).toBeTypeOf('string');
    expect(components.iconLibrary.length).toBeGreaterThan(0);
  });
});
