import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('package metadata', () => {
  it('carries useful package metadata without becoming publishable to npm', () => {
    const packageJson: unknown = JSON.parse(read('package.json'));

    expect(packageJson).toMatchObject({
      private: true,
      description: expect.stringMatching(/shadcn\/ui job board/i),
      homepage: 'https://cavuno.com',
      license: 'MIT',
      repository: {
        type: 'git',
        url: 'https://github.com/wollemiahq/cavuno-tanstack-start-shadcn-job-board-template.git',
      },
      keywords: expect.arrayContaining([
        'shadcn-ui',
        'tanstack-start',
        'job-board',
        'base-ui',
      ]),
    });
  });
});
