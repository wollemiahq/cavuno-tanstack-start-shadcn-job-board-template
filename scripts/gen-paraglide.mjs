import { syncDirectory } from './write-if-changed.mjs';

/**
 * `pnpm run gen:paraglide` — `paraglide-js compile` without the write storm.
 *
 * Takes the same flags as `paraglide-js compile`. The CLI wipes and rewrites
 * every file in `--outdir` on each run, even when the output is
 * byte-identical, and each rewrite is a Vite reload on a live dev server
 * (pretest/pretypecheck run this against the builder's preview). So compile
 * into a temp directory, then sync only changed files into `--outdir`.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const outdirFlag = args.indexOf('--outdir');
const outdir = args[outdirFlag + 1];
if (outdirFlag === -1 || outdir === undefined) {
  console.error('gen-paraglide: --outdir <dir> is required');
  process.exit(1);
}

const bin = join(
  import.meta.dirname,
  '..',
  'node_modules/@inlang/paraglide-js/bin/run.js',
);
const temp = mkdtempSync(join(tmpdir(), 'paraglide-'));
try {
  const compileArgs = args.with(outdirFlag + 1, temp);
  execFileSync(process.execPath, [bin, 'compile', ...compileArgs], {
    stdio: 'inherit',
  });
  const { written, removed } = syncDirectory(temp, resolve(outdir));
  console.log(
    `${outdir}: ${written.length} written, ${removed.length} removed`,
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
