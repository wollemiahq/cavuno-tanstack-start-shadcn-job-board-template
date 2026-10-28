/**
 * `node:fs` for the paraglide compiler, with at most
 * `PARAGLIDE_MAX_PARALLEL_WRITES` file writes open at once.
 *
 * A production build compiles `message-modules`: one file per message,
 * about 2,000 here. The compiler starts every write at once and settles
 * them with `Promise.allSettled`, so a write that fails is dropped without
 * an error. Under the usual 1,024 open-file limit (the builder's publish
 * sandbox and Linux defaults) some writes fail with EMFILE, and when
 * `messages/_index.js` is one of them the build stops with "Could not
 * resolve './messages/_index.js'". Which writes fail changes from run to
 * run, so the same checkout can pass once and fail the next time.
 *
 * Rollup caps its own file operations the same way (`maxParallelFileOps`).
 */
import nodeFs from 'node:fs';

export const PARAGLIDE_MAX_PARALLEL_WRITES = 32;

/** Runs at most `limit` of the given tasks at a time. */
export function createLimit(limit) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= limit || queue.length === 0) return;
    active += 1;
    const { task, resolve, reject } = queue.shift();
    task()
      .then(resolve, reject)
      .finally(() => {
        active -= 1;
        next();
      });
  };
  return (task) =>
    new Promise((resolve, reject) => {
      queue.push({ task, resolve, reject });
      next();
    });
}

const limit = createLimit(PARAGLIDE_MAX_PARALLEL_WRITES);

/**
 * One object for the process: the plugin keeps its warm compile state per
 * `fs` identity, so a new object on each config load would recompile.
 */
export const paraglideBoundedFs = {
  ...nodeFs,
  promises: {
    ...nodeFs.promises,
    writeFile: (...args) => limit(() => nodeFs.promises.writeFile(...args)),
  },
};
