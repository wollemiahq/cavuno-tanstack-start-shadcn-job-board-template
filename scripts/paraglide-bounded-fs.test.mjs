import {
  PARAGLIDE_MAX_PARALLEL_WRITES,
  createLimit,
  paraglideBoundedFs,
} from './paraglide-bounded-fs.mjs';

/**
 * The paraglide compiler starts every output write at once; the bounded
 * fs must keep that under the open-file limit and still write every file.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('createLimit never runs more than the limit at once', async () => {
  const limit = createLimit(3);
  let active = 0;
  let peak = 0;
  const task = () =>
    limit(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
    });
  await Promise.all(Array.from({ length: 20 }, task));
  assert.equal(peak, 3);
});

test('createLimit passes rejections through and keeps going', async () => {
  const limit = createLimit(1);
  const failed = limit(() => Promise.reject(new Error('boom')));
  const after = limit(async () => 'ok');
  await assert.rejects(failed, /boom/);
  assert.equal(await after, 'ok');
});

test('writes many more files than the cap, all of them', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'paraglide-bounded-'));
  try {
    const count = PARAGLIDE_MAX_PARALLEL_WRITES * 40;
    await Promise.all(
      Array.from({ length: count }, (_, i) =>
        paraglideBoundedFs.promises.writeFile(join(dir, `m${i}.js`), `${i}`),
      ),
    );
    assert.equal(readdirSync(dir).length, count);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
