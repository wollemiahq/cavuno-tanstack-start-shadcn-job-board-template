import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('CI quality gate', () => {
  it('checks formatting and lint without mutating the checkout', () => {
    const workflow = readFileSync(
      resolve(process.cwd(), '.github/workflows/ci.yml'),
      'utf8',
    );

    expect(workflow).toContain('- name: Lint and formatting');
    expect(workflow).toContain('run: pnpm exec vp check');
    expect(workflow).not.toContain('run: pnpm exec vp check --fix');
  });

  it('does not format generated source that its owner rewrites', () => {
    const ignore = readFileSync(
      resolve(process.cwd(), '.prettierignore'),
      'utf8',
    );

    expect(ignore).toContain('src/routeTree.gen.ts');
    expect(ignore).toContain('src/theme/resolved.ts');
  });
});
