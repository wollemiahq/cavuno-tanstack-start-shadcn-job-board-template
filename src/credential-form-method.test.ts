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
 * (`Awaited<ReturnType<…>>`), so there is no regex that finds where the tag
 * ends. File scope is only equivalent to per-form scope while each file holds
 * exactly one form, so that is asserted rather than assumed — counting `<form`
 * openings needs no tag parsing.
 */

/** Inputs whose value must never reach a URL. */
const SECRET_INPUT =
  /type=['"]password['"]|autoComplete=['"](?:current-password|new-password|one-time-code)['"]/;

/** An opening `<form` tag, counted without parsing its attributes. */
const FORM_OPENING = /<form[\s>]/g;

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
    if (!entry.name.endsWith('.tsx')) return [];
    return entry.name.endsWith('.test.tsx') ? [] : [path];
  });
}

describe('credential forms declare method="post"', () => {
  it('every file rendering a password or one-time code declares a POST form', () => {
    const guarded = [
      ...sourceFilesUnder(join(import.meta.dirname, 'components')),
      ...sourceFilesUnder(join(import.meta.dirname, 'routes')),
    ]
      .map((path) => ({ path, source: readFileSync(path, 'utf8') }))
      .filter((file) => SECRET_INPUT.test(file.source));

    // A change here means a credential surface entered or left the scan — a
    // new auth page, or a form moved into a wrapper this file cannot see.
    // Review the new file and update the count; do not just lower it.
    expect(guarded.map((file) => file.path)).toHaveLength(GUARDED_FILE_COUNT);

    const withForm = guarded
      .map((file) => ({
        ...file,
        formCount: (file.source.match(FORM_OPENING) ?? []).length,
      }))
      .filter((file) => file.formCount > 0);

    // File scope only stands in for per-form scope while each file holds one
    // form. With two, `method="post"` on either satisfies a file-level search
    // while the other silently keeps the GET default.
    const multiForm = withForm
      .filter((file) => file.formCount !== 1)
      .map((file) => file.path);
    expect(multiForm, multiForm.join('\n')).toEqual([]);

    // Only files that actually hold a form can declare a method; one reduced to
    // inputs alone is caught by the count assertion above instead.
    const offenders = withForm
      .filter((file) => !/\bmethod="post"/.test(file.source))
      .map((file) => file.path);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
