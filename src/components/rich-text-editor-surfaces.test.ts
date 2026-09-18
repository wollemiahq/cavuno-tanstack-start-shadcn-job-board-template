import { describe, expect, it } from 'vitest';

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function sourceFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(path);
    if (!entry.name.endsWith('.tsx')) return [];
    return entry.name.endsWith('.test.tsx') ? [] : [path];
  });
}

describe('rich-text authoring surfaces', () => {
  it('every production editor clips paste to the shared character cap', () => {
    const root = join(import.meta.dirname, '..');
    const files = [
      ...sourceFilesUnder(join(root, 'components')),
      ...sourceFilesUnder(join(root, 'routes')),
    ];
    const usages = files.filter((path) => {
      if (path.endsWith(`${join('components', 'rich-text-editor.tsx')}`)) {
        return false;
      }
      const source = readFileSync(path, 'utf8');
      return (
        /<RichTextEditor[\s>]/.test(source) ||
        /<DescriptionEditor[\s>]/.test(source)
      );
    });

    expect(
      usages
        .map((path) => path.slice(root.length + 1).replaceAll('\\', '/'))
        .sort(),
    ).toEqual([
      'components/employer-job-form.tsx',
      'components/post-job-form.tsx',
      'routes/-employers.company-profile.tsx',
    ]);

    for (const path of usages) {
      expect(readFileSync(path, 'utf8')).toContain(
        'maxCharacters={RICH_TEXT_MAX_CHARACTERS}',
      );
    }
  });
});
