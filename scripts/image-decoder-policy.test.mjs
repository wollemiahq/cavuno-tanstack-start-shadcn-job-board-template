import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const consumers = ['miniflare'];

for (const consumer of consumers) {
  const wrangler = createRequire(require.resolve('wrangler/package.json'));
  const resolve = createRequire(wrangler.resolve('miniflare/package.json'));
  const entry = resolve.resolve('sharp');

  for (const mode of ['cjs', 'esm']) {
    test(`${consumer}: ${mode} rejects HEIF-family input before decoding`, () => {
      // Separate processes ensure one entrypoint cannot mask a missing policy in another.
      const target = mode === 'esm'
        ? pathToFileURL(join(dirname(entry), 'index.mjs')).href
        : entry;
      const probe = `
        const assert = require('node:assert/strict');
        const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
        const { tmpdir } = require('node:os');
        const { join } = require('node:path');
        const { Readable } = require('node:stream');
        (async () => {
          const sharp = MODE === 'esm' ? (await import(TARGET)).default : require(TARGET);
          assert.equal(sharp.versions.sharp, '0.35.4');
          const image = () => sharp({ create: { width: 8, height: 8, channels: 3,
            background: { r: 30, g: 90, b: 160 } } });
          for (const format of ['jpeg', 'png', 'webp', 'gif']) {
            const buffer = await image().toFormat(format).toBuffer();
            const result = await sharp(buffer).resize(4, 4).png().toBuffer({ resolveWithObject: true });
            assert.equal(result.info.width, 4);
            assert.equal(result.info.height, 4);
          }
          // Benign AVIF exercises the same HEIF loader without an exploit fixture.
          const avif = await image().avif().toBuffer();
          const unsupported = /unsupported|blocked|not allowed/i;
          await assert.rejects(sharp(avif).metadata(), unsupported);
          await assert.rejects(sharp(avif).png().toBuffer(), unsupported);
          const directory = mkdtempSync(join(tmpdir(), 'image-policy-'));
          try {
            const disguised = join(directory, 'photo.jpg');
            writeFileSync(disguised, avif);
            await assert.rejects(sharp(disguised).metadata(), unsupported);
          } finally {
            rmSync(directory, { recursive: true, force: true });
          }
          const stream = sharp().png();
          Readable.from([avif]).pipe(stream);
          await assert.rejects(stream.toBuffer(), unsupported);
          console.log(JSON.stringify({ sharp: sharp.versions.sharp, heif: sharp.versions.heif, input: 'blocked' }));
        })().catch(error => { console.error(error); process.exitCode = 1; });
      `.replaceAll('MODE', JSON.stringify(mode)).replaceAll('TARGET', JSON.stringify(target));
      const output = execFileSync(process.execPath, ['-e', probe], { encoding: 'utf8', timeout: 30000 });
      assert.match(output, /"input":"blocked"/);
    });
  }
}
