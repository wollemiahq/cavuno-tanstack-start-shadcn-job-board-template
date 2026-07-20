import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('package metadata', () => {
  // The one machine contract this file still pins. The prose-pinning tests
  // that used to live here (README phrasing, publish-gate wording) were
  // deleted deliberately: copy is the owner's voice, and a test that must be
  // rewritten whenever the words change pins nothing.
  it('carries useful package metadata without becoming publishable to npm', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      description?: string;
      keywords?: string[];
      license?: string;
      private?: boolean;
      repository?: { type?: string; url?: string };
    };

    expect(packageJson.private).toBe(true);
    expect(packageJson.description).toMatch(/shadcn\/ui job board/i);
    expect(packageJson.license).toBe('MIT');
    expect(packageJson.repository).toEqual({
      type: 'git',
      url: 'https://github.com/wollemiahq/cavuno-shadcn-ui-job-board-template.git',
    });
    expect(packageJson.keywords).toEqual(
      expect.arrayContaining(['shadcn-ui', 'job-board', 'base-ui']),
    );
  });
});
