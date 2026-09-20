import { describe, expect, it } from 'vitest';

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

describe('shadcn component inventory', () => {
  it('validates the installed primitives, configuration and imports', () => {
    const result = spawnSync(
      process.execPath,
      [resolve(process.cwd(), 'scripts/check-shadcn-components.mjs')],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  });
});
