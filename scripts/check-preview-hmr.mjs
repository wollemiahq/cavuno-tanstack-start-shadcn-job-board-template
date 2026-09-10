import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
// Run against an already-running local starter: PREVIEW_HMR_ORIGIN=http://localhost:3000 node scripts/check-preview-hmr.mjs
// Keep the browser open while running to exercise client-triggered HMR imports too.
const root = fileURLToPath(new URL('../', import.meta.url));
const origin = process.env.PREVIEW_HMR_ORIGIN ?? 'http://localhost:3000';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname))
  throw new Error('Use a local dev server');
const file = root + '/src/theme.css';
const original = fs.readFileSync(file, 'utf8');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (let i = 0; i < 10; i++) {
    const dark = original.indexOf('.dark {');
    const changed =
      original.slice(0, dark) +
      original
        .slice(dark)
        .replace(
          /--primary: [^;]+;/,
          `--primary: ${i % 2 ? '#FAFAFA' : '#2557a7'};`,
        );
    fs.writeFileSync(file, changed);
    execFileSync('node', ['scripts/gen-theme-resolved.mjs'], {
      cwd: root,
      stdio: 'ignore',
    });
    execFileSync('node', ['scripts/gen-design.mjs'], {
      cwd: root,
      stdio: 'ignore',
    });
    await pause(1200);
    for (let j = 0; j < 2; j++) {
      const statuses = await Promise.all(
        ['/', '/jobs', '/', '/jobs'].map(async (path) => {
          const r = await fetch(new URL(path, origin));
          await r.text();
          return r.status;
        }),
      );
      console.log(JSON.stringify({ iteration: i + 1, probe: j + 1, statuses }));
      if (statuses.some((s) => s !== 200)) throw Error('HMR page failed');
      await pause(700);
    }
  }
} finally {
  fs.writeFileSync(file, original);
  execFileSync('node', ['scripts/gen-theme-resolved.mjs'], {
    cwd: root,
    stdio: 'ignore',
  });
  execFileSync('node', ['scripts/gen-design.mjs'], {
    cwd: root,
    stdio: 'ignore',
  });
}
