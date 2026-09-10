import { build } from 'vite';
import { expect, it } from 'vitest';

import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);

it('keeps a real Vite chunk failure rejected while the document reloads', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stale-chunk-recovery-'));
  try {
    const recoveryPath = fileURLToPath(
      new URL('./stale-chunk-reload.ts', import.meta.url),
    );
    await writeFile(
      join(directory, 'entry.js'),
      `export { installStaleChunkReload } from ${JSON.stringify(recoveryPath)};
       export function loadRoute() {
         return import('./route.js');
       }`,
    );
    await writeFile(
      join(directory, 'route.js'),
      "export const component = 'company-page';",
    );
    await build({
      configFile: false,
      root: directory,
      logLevel: 'silent',
      build: {
        minify: false,
        modulePreload: { polyfill: false },
        rolldownOptions: {
          input: join(directory, 'entry.js'),
          preserveEntrySignatures: 'strict',
          output: { entryFileNames: 'entry.mjs', chunkFileNames: '[name].mjs' },
        },
      },
    });
    await rm(join(directory, 'dist', 'route.mjs'));

    // Execute the emitted helper in native ESM: Vitest's module loader must
    // not intercept the missing dynamic import whose rejection we are testing.
    const { stdout } = await exec(process.execPath, [
      '--input-type=module',
      '--eval',
      `const store = new Map();
       let reloads = 0;
       globalThis.window = Object.assign(new EventTarget(), {
         location: { reload() { reloads++; } },
         sessionStorage: {
           getItem(key) { return store.get(key) ?? null; },
           setItem(key, value) { store.set(key, value); }
         }
       });
       const { installStaleChunkReload, loadRoute } = await import(
         ${JSON.stringify(pathToFileURL(join(directory, 'dist', 'entry.mjs')).href)}
       );
       installStaleChunkReload(window);
       const errors = [];
       for (let attempt = 0; attempt < 2; attempt++) {
         try { await loadRoute().then(route => route.component); }
         catch (error) { errors.push({ code: error.code, message: error.message }); }
       }
       console.log(JSON.stringify({ errors, reloads }));`,
    ]);
    expect(JSON.parse(stdout)).toEqual({
      reloads: 1,
      errors: [
        {
          code: 'ERR_MODULE_NOT_FOUND',
          message: expect.stringContaining('route.mjs'),
        },
        {
          code: 'ERR_MODULE_NOT_FOUND',
          message: expect.stringContaining('route.mjs'),
        },
      ],
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
