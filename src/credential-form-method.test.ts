import { describe, expect, it } from 'vitest';

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A `<form>` with no `method` is a GET form. While React is mounted its
 * `onSubmit` calls `preventDefault()` and nothing is submitted natively, so the
 * default never shows. The moment hydration does not run — a JS chunk that
 * failed to load, a hydration error, a degraded shell — the browser performs
 * its own submit and encodes every field into the query string. On a form
 * carrying a password or a one-time code that puts the secret in the URL bar,
 * session history, the `Referer` of every later request, and any access or CDN
 * log that records query strings.
 *
 * Observed live on cybersecurityjobslist.com: sign-in navigated to
 * `/auth/sign-in?email=…&password=…`.
 *
 * `method="post"` with no `action` re-posts to the same URL, so behaviour is
 * unchanged when JS works and the fields ride in the body when it does not.
 * This gate is source-level because the defect is a missing source attribute:
 * rendering the tree cannot tell a declared GET from the HTML default.
 */

/** Inputs whose value must never reach a URL. */
const SECRET_INPUT =
  /type=['"]password['"]|autoComplete=['"](?:current-password|new-password|one-time-code)['"]/;

function sourceFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(path);
    if (!/\.tsx$/.test(entry.name)) return [];
    return /\.test\.tsx$/.test(entry.name) ? [] : [path];
  });
}

/**
 * Files that render a secret-bearing input but whose form does not declare
 * `method="post"`. Whole-file granularity on purpose: a file with a credential
 * input and a GET-defaulted form is the thing to look at, and pairing each
 * `<form>` to the inputs inside it would need a parser this gate does not want.
 */
function offenders(path: string): string[] {
  const source = readFileSync(path, 'utf8');
  if (!SECRET_INPUT.test(source)) return [];
  if (!/<form\b/.test(source)) return [];
  const forms = source.match(/<form\b[^>]*>/gs) ?? [];
  return forms.some((form) => !/\bmethod="post"/.test(form)) ? [path] : [];
}

describe('credential forms declare method="post"', () => {
  it('no form rendering a password or one-time code defaults to GET', () => {
    const files = [
      ...sourceFilesUnder(join(import.meta.dirname, 'components')),
      ...sourceFilesUnder(join(import.meta.dirname, 'routes')),
    ];
    expect(files.length).toBeGreaterThan(0);
    const found = files.flatMap(offenders);
    expect(found, found.join('\n')).toEqual([]);
  });

  it('finds the forms it is meant to be guarding', () => {
    const files = [
      ...sourceFilesUnder(join(import.meta.dirname, 'components')),
      ...sourceFilesUnder(join(import.meta.dirname, 'routes')),
    ];
    // A gate that matches nothing passes forever. Pin that the scan still
    // reaches real credential forms, without pinning which ones.
    const guarded = files.filter(
      (path) =>
        SECRET_INPUT.test(readFileSync(path, 'utf8')) &&
        /<form\b/.test(readFileSync(path, 'utf8')),
    );
    expect(guarded.length).toBeGreaterThanOrEqual(5);
  });
});
