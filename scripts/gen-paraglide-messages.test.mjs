/**
 * `gen:messages` must leave an unchanged QA catalog alone whatever its
 * formatting. Every write to `messages/` restarts the dev server's runner,
 * and a burst of no-op rewrites tears it down while the browser is still
 * fetching the client entry.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const script = join(import.meta.dirname, 'gen-paraglide-messages.mjs');

function withCatalogs(run) {
  const directory = mkdtempSync(join(tmpdir(), 'gen-messages-'));
  mkdirSync(join(directory, 'messages'));
  writeFileSync(
    join(directory, 'messages/en.json'),
    JSON.stringify(
      {
        $schema: 'https://inlang.com/schema/inlang-message-format',
        greeting: 'Hello {name}',
        jobs: 'Jobs',
      },
      null,
      2,
    ) + '\n',
  );
  const generate = () =>
    execFileSync(process.execPath, [script], {
      cwd: directory,
      encoding: 'utf8',
    });
  try {
    run(directory, generate);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('a reformatted catalog with the same messages is left untouched', () => {
  withCatalogs((directory, generate) => {
    assert.match(generate(), /en-XA\.json — 2 QA keys/);
    assert.match(generate(), /en-XA\.json — 2 keys \(unchanged\)/);

    // Same messages, different whitespace — as a formatter or a patch tool
    // would leave them.
    const path = join(directory, 'messages/en-XA.json');
    writeFileSync(
      path,
      JSON.stringify(JSON.parse(readFileSync(path, 'utf8')), null, 4),
    );
    const before = statSync(path);

    assert.match(generate(), /en-XA\.json — 2 keys \(unchanged content\)/);
    const after = statSync(path);
    assert.equal(after.mtimeMs, before.mtimeMs);
    assert.equal(after.size, before.size);
  });
});

test('changed content, reordered keys, and an unparseable file are rewritten', () => {
  withCatalogs((directory, generate) => {
    generate();

    const path = join(directory, 'messages/en-XA.json');
    const messages = JSON.parse(readFileSync(path, 'utf8'));
    const reordered = Object.fromEntries(Object.entries(messages).reverse());
    writeFileSync(path, JSON.stringify(reordered, null, 2) + '\n');
    assert.match(generate(), /en-XA\.json — 2 QA keys/);

    writeFileSync(path, 'not json');
    assert.match(generate(), /en-XA\.json — 2 QA keys/);

    const english = join(directory, 'messages/en.json');
    const source = JSON.parse(readFileSync(english, 'utf8'));
    source.apply = 'Apply';
    writeFileSync(english, JSON.stringify(source, null, 2) + '\n');
    const output = generate();
    assert.match(output, /en-XA\.json — 3 QA keys/);
    assert.match(output, /ar-XB\.json — 3 QA keys/);
  });
});
