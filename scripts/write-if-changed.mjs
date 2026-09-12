/**
 * Generator writes that leave byte-identical files alone.
 *
 * Under `vp dev` every write to a watched file fires a Vite reload, and a
 * request that lands mid-reload can render with two React copies ("Invalid
 * hook call" → HTTP 500). Generators run by the builder against a live dev
 * server (gen:paraglide from pretest/pretypecheck, gen:theme, gen:design)
 * used to rewrite their outputs even when nothing changed; these helpers
 * write only real changes, so an unchanged regeneration is invisible to the
 * watcher while an actual edit still hot-reloads.
 */
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Write `content` to `path` only when its bytes differ. The replacement is
 * atomic (sibling temp file + rename), so a reader never sees a truncated
 * file. Returns whether the file was written.
 */
export function writeFileIfChanged(path, content) {
  const next = Buffer.from(content);
  try {
    if (readFileSync(path).equals(next)) return false;
  } catch {
    // Missing (or unreadable) — fall through and write it.
  }
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, next);
  renameSync(temp, path);
  return true;
}

/** Relative paths of every file under `dir` (empty when `dir` is absent). */
function listFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true, recursive: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(dir.length + 1));
}

/**
 * Make `to` mirror `from`: write files whose bytes changed, delete files
 * that no longer exist in `from`, leave everything else untouched.
 */
export function syncDirectory(from, to) {
  const written = [];
  const removed = [];
  const source = new Set(listFiles(from));
  for (const file of source) {
    if (writeFileIfChanged(join(to, file), readFileSync(join(from, file)))) {
      written.push(file);
    }
  }
  for (const file of listFiles(to)) {
    if (!source.has(file)) {
      rmSync(join(to, file));
      removed.push(file);
    }
  }
  return { written, removed };
}
