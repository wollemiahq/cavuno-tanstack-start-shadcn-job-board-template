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
 * Observed live in production: sign-in navigated to
 * `/auth/sign-in?email=…&password=…`.
 *
 * `method="post"` with no `action` re-posts to the same URL, so behaviour is
 * unchanged when JS works and the fields ride in the body when it does not.
 * This gate is source-level because the defect is a missing source attribute:
 * rendering the tree cannot tell a declared GET from the HTML default.
 *
 * Whole-file granularity, deliberately. Pairing each `<form>` with the inputs
 * inside it means parsing the opening tag, and these tags carry an `onSubmit`
 * arrow whose body holds both `=>` and TypeScript generics
 * (`Awaited<ReturnType<…>>`) — a regex cannot find where the tag ends. Every
 * credential file here holds exactly one form, so file scope is exact for
 * them; a second, non-credential form in the same file would weaken it, and
 * the count assertion below is what would notice that drift.
 */

/** Inputs whose value must never reach a URL. */
const SECRET_INPUT =
  /type=['"]password['"]|autoComplete=['"](?:current-password|new-password|one-time-code)['"]/;

/**
 * Files carrying a credential form today. A change here is the thing to review.
 *
 * `-auth.confirm-email-change.tsx` also declares `method="post"` but is not in
 * this set: it renders no secret input, and its reason is different — a native
 * GET there submits zero fields, which replaces `?token=…` with an empty query
 * and loses the token.
 */
const GUARDED_FILE_COUNT = 6;

function sourceFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(path);
    if (!/\.tsx$/.test(entry.name)) return [];
    return /\.test\.tsx$/.test(entry.name) ? [] : [path];
  });
}

describe('credential forms declare method="post"', () => {
  it('every file rendering a password or one-time code declares a POST form', () => {
    const guarded = [
      ...sourceFilesUnder(join(import.meta.dirname, 'components')),
      ...sourceFilesUnder(join(import.meta.dirname, 'routes')),
    ].filter((path) => SECRET_INPUT.test(readFileSync(path, 'utf8')));

    // A drop here means a credential form moved somewhere this scan cannot
    // see — a wrapper component, say — and the surface silently stopped being
    // guarded. Update the count with the new home, do not just lower it.
    expect(guarded).toHaveLength(GUARDED_FILE_COUNT);

    const offenders = guarded.filter(
      (path) => !/\bmethod="post"/.test(readFileSync(path, 'utf8')),
    );
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
