import { describe, expect, it } from 'vitest';

import {
  REFERENCE_BOARD_KEY,
  usesReferenceBoardKey,
} from '../scripts/check-board-key.mjs';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `wrangler.jsonc` commits a WORKING board key so a fresh clone shows real
 * jobs. Nothing in the app objects to keeping it — `src/lib/env.ts` throws
 * only when CAVUNO_BOARD is ABSENT, and it never is — so a fork that deploys
 * without swapping it serves the reference board under its own domain. A
 * production board did exactly that on 2026-09-04.
 *
 * The gate is only as good as its constant, so pin the constant to the file
 * it guards: rotate the committed key and this test tells you the gate went
 * blind, instead of the gate silently passing forever.
 */
const wranglerSource = readFileSync(
  join(import.meta.dirname, '..', 'wrangler.jsonc'),
  'utf8',
);
const packageJson: { scripts?: Record<string, string> } = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8'),
);

describe('reference board key deploy gate', () => {
  it('still recognises the key wrangler.jsonc actually commits', () => {
    expect(wranglerSource).toContain(REFERENCE_BOARD_KEY);
    expect(usesReferenceBoardKey(wranglerSource)).toBe(true);
  });

  it('passes once an operator has swapped in their own key', () => {
    const swapped = wranglerSource.replace(
      REFERENCE_BOARD_KEY,
      'pk_0000000000000000000000000000000f',
    );
    expect(usesReferenceBoardKey(swapped)).toBe(false);
  });

  it('runs before deploy, not as a step someone has to remember', () => {
    expect(packageJson.scripts?.predeploy).toBe(
      'node scripts/check-board-key.mjs',
    );
  });
});
