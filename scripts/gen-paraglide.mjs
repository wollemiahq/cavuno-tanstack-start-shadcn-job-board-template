import {
  PARAGLIDE_STAMP_FILE,
  PARAGLIDE_VITE_IS_SERVER,
  paraglideInputsDigest,
} from './paraglide-dev-stamp.mjs';
import { syncDirectory } from './write-if-changed.mjs';

/**
 * `pnpm run gen:paraglide` — `paraglide-js compile` without the write storm.
 *
 * Takes the same flags as `paraglide-js compile`. The CLI wipes and rewrites
 * every file in `--outdir` on each run, even when the output is
 * byte-identical, and each rewrite is a Vite reload on a live dev server
 * (pretest/pretypecheck run this against the builder's preview). So compile
 * into a temp directory, then sync only changed files into `--outdir`.
 *
 * Unless `--is-server` is given, the runtime gets the Vite plugin's own
 * `isServer` expression, so this output is what the plugin would write and
 * the stamp lets the plugin skip its startup compile
 * (scripts/paraglide-dev-stamp.mjs).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const outdirFlag = args.indexOf('--outdir');
const outdir = args[outdirFlag + 1];
if (outdirFlag === -1 || outdir === undefined) {
  console.error('gen-paraglide: --outdir <dir> is required');
  process.exit(1);
}

/** The values after `name`, up to the next flag. */
function flagValues(name) {
  const at = args.indexOf(name);
  if (at === -1) return [];
  const values = [];
  for (const value of args.slice(at + 1)) {
    if (value.startsWith('--')) break;
    values.push(value);
  }
  return values;
}

const isServer = flagValues('--is-server')[0] ?? PARAGLIDE_VITE_IS_SERVER;
const cliArgs = args.includes('--is-server')
  ? args
  : [...args, '--is-server', isServer];

const bin = join(
  import.meta.dirname,
  '..',
  'node_modules/@inlang/paraglide-js/bin/run.js',
);
const temp = mkdtempSync(join(tmpdir(), 'paraglide-'));
try {
  // Taken before the compile: an input edited mid-compile leaves a stamp
  // that no longer matches, so the next dev start compiles again.
  const digest = paraglideInputsDigest(
    flagValues('--project')[0] ?? './project.inlang',
    {
      outputStructure: flagValues('--output-structure')[0],
      strategy: flagValues('--strategy'),
      isServer,
    },
  );
  const compileArgs = cliArgs.with(outdirFlag + 1, temp);
  execFileSync(process.execPath, [bin, 'compile', ...compileArgs], {
    stdio: 'inherit',
  });
  if (digest !== null) {
    writeFileSync(join(temp, PARAGLIDE_STAMP_FILE), `${digest}\n`);
  }
  const { written, removed } = syncDirectory(temp, resolve(outdir));
  console.log(
    `${outdir}: ${written.length} written, ${removed.length} removed`,
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
