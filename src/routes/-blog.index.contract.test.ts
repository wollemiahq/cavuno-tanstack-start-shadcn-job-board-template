import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('blog index presentation contract', () => {
  it('does not append the job-alert acquisition band to the editorial archive', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/blog.index.tsx'),
      'utf8',
    );

    expect(source).not.toContain('AlertsBand');
    expect(source).not.toContain('subscribeJobAlert');
  });
});
