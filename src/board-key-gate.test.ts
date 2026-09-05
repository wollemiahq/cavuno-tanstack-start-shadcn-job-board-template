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
 * The predicate and the `predeploy` wiring are what is pinned here. The live
 * wrangler.jsonc is deliberately NOT asserted to contain the key: every fork
 * swaps it, and the template must not ship a test that goes red on correct
 * use. Rotating the committed key upstream means updating REFERENCE_BOARD_KEY
 * by hand.
 */
const wranglerSource = readFileSync(
  join(import.meta.dirname, '..', 'wrangler.jsonc'),
  'utf8',
);
const packageJson: { scripts?: Record<string, string> } = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8'),
);

describe('reference board key deploy gate', () => {
  // Asserted against a fixture, not the live wrangler.jsonc: a fork that swaps
  // in its own key (the whole point of the gate) must not inherit a red test.
  it('refuses a config that still carries the reference key', () => {
    expect(
      usesReferenceBoardKey(`"CAVUNO_BOARD": "${REFERENCE_BOARD_KEY}"`),
    ).toBe(true);
  });

  it('passes once an operator has swapped in their own key', () => {
    const swapped = wranglerSource.replaceAll(
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
