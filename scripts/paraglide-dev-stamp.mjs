/**
 * One Paraglide compile per dev boot instead of two.
 *
 * `vp dev` starts in a tree where `gen:paraglide` has just compiled
 * `src/paraglide` (the builder runs it before Vite, `predev` does locally),
 * and then the Vite plugin compiles the same project again on startup: two
 * seconds of inlang SDK work on every boot for output that is already on
 * disk. The generator records a digest of everything the compile depends
 * on; the plugin skips its startup compile when the digest still matches.
 *
 * The digest covers the project's settings, every catalog under the
 * messages directory, the plugin modules the project loads, the compiler's
 * version and the compile options. Not the rest of the project directory:
 * the inlang SDK writes its own `.gitignore`, `.meta.json` and README there
 * during a compile, so they would differ between the generator's digest and
 * the plugin's on a fresh checkout. The stamp lives inside the output
 * directory, so a tree without output has no stamp and always compiles.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/**
 * The plugin's own `isServer` under Vite. The generator passes the same
 * expression, so its output is byte-identical to the plugin's and a skipped
 * compile serves exactly what a compile would have written.
 */
export const PARAGLIDE_VITE_IS_SERVER =
  "import.meta.env?.SSR ?? typeof window === 'undefined'";

export const PARAGLIDE_STAMP_FILE = '.inputs-digest';

function filesUnder(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true, recursive: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

/**
 * Digest of a compile of `project` with `options`: the compiler options
 * other than project and outdir (the generator's are outputStructure,
 * strategy, isServer). Returns null when the project cannot be read, which
 * never matches a stamp.
 */
export function paraglideInputsDigest(project, options) {
  const projectDir = resolve(project);
  const root = dirname(projectDir);
  let settings;
  try {
    settings = JSON.parse(
      readFileSync(join(projectDir, 'settings.json'), 'utf8'),
    );
  } catch {
    return null;
  }
  const pathPattern =
    settings['plugin.inlang.messageFormat']?.pathPattern ?? '';
  const messagesDir = pathPattern.includes('{locale}')
    ? resolve(root, dirname(pathPattern.split('{locale}')[0] + 'x'))
    : null;
  const modules = (settings.modules ?? [])
    .filter((module) => module.startsWith('.'))
    .map((module) => resolve(root, module));
  const compiler = resolve(
    root,
    'node_modules/@inlang/paraglide-js/package.json',
  );

  const hash = createHash('sha256');
  // Every option, not a known few: one the generator does not pass (say
  // `urlPatterns` in vite.config.ts) changes the plugin's output, so it
  // must move the digest.
  hash.update(JSON.stringify(options));
  const inputs = [
    join(projectDir, 'settings.json'),
    ...(messagesDir === null ? [] : filesUnder(messagesDir)),
    ...modules,
    compiler,
  ];
  for (const file of inputs) {
    let content;
    try {
      content = readFileSync(file);
    } catch {
      content = Buffer.from('\0missing');
    }
    const name = relative(root, file);
    hash.update(`\0${name.length}:${name}:${content.length}:`);
    hash.update(content);
  }
  return hash.digest('hex');
}

/** The digest the last complete compile into `outdir` recorded, or null. */
export function readParaglideStamp(outdir) {
  try {
    return readFileSync(join(outdir, PARAGLIDE_STAMP_FILE), 'utf8').trim();
  } catch {
    return null;
  }
}
