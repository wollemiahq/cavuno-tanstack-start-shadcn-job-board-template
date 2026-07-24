import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('package metadata', () => {
  it('carries useful package metadata without becoming publishable to npm', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      description?: string;
      homepage?: string;
      keywords?: string[];
      license?: string;
      private?: boolean;
      repository?: { type?: string; url?: string };
    };

    expect(packageJson.private).toBe(true);
    expect(packageJson.description).toMatch(/shadcn\/ui job board/i);
    expect(packageJson.homepage).toBe('https://cavuno.com');
    expect(packageJson.license).toBe('MIT');
    expect(packageJson.repository).toEqual({
      type: 'git',
      url: 'https://github.com/wollemiahq/cavuno-tanstack-start-shadcn-job-board-template.git',
    });
    expect(packageJson.keywords).toEqual(
      expect.arrayContaining([
        'shadcn-ui',
        'tanstack-start',
        'job-board',
        'base-ui',
      ]),
    );
  });
});
