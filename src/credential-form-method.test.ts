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
 *
 * Known gap: a password input written with a computed type
 * (`type={visible ? 'text' : 'password'}`) and no `autoComplete` does not match
 * `SECRET_INPUT`, so a NEW file using that shape would never enter the scan.
 * On an existing guarded file the count assertion catches it.
 */

/** Inputs whose value must never reach a URL. */
const SECRET_INPUT =
  /type=['"]password['"]|autoComplete=['"](?:current-password|new-password|one-time-code)['"]/;

/** An opening `<form` tag, counted without parsing its attributes. */
const FORM_OPENING = /<form[\s>]/g;

/**
 * Comments are stripped before anything is counted or matched. The repo's idiom
 * for explaining this bug class writes `<form>` and `method="post"` inside a
 * comment — `embed-jobs-header.tsx` does exactly that — so prose beside a
 * guarded form would otherwise both report a form that does not exist and
 * satisfy the method check for one that does.
 *
 * The line-comment rule is anchored so it cannot eat a `https://…` URL.
 */
function withoutComments(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
}

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
    // new auth page, most likely. Review it and update the count; do not just
    // lower it.
    const paths = guarded.map((file) => file.path);
    expect(paths, paths.join('\n')).toHaveLength(GUARDED_FILE_COUNT);

    const counted = guarded.map((file) => {
      const code = withoutComments(file.source);
      return {
        ...file,
        code,
        formCount: (code.match(FORM_OPENING) ?? []).length,
      };
    });

    // A credential file with no form of its own has had its form moved into a
    // wrapper this scan cannot see. The file count does not notice — the
    // secret input stays behind — so it is asserted directly.
    const noForm = counted.filter((file) => file.formCount === 0);
    expect(
      noForm.map((file) => file.path),
      `credential input with no <form> of its own — the form moved to a wrapper. Guard the wrapper and list it here:\n${noForm.map((file) => file.path).join('\n')}`,
    ).toEqual([]);

    // File scope only stands in for per-form scope while each file holds one
    // form. With two, `method="post"` on either satisfies a file-level search
    // while the other silently keeps the GET default.
    const multiForm = counted
      .filter((file) => file.formCount > 1)
      .map((file) => file.path);
    expect(multiForm, `more than one <form>:\n${multiForm.join('\n')}`).toEqual(
      [],
    );

    const offenders = counted
      .filter((file) => !/\bmethod="post"/.test(file.code))
      .map((file) => file.path);
    expect(
      offenders,
      `<form> without method="post":\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  /**
   * Forms that carry no secret but do carry personal data — an email address,
   * an applicant's name — so the scan above never sees them, yet a native
   * submit still writes their fields into the URL, history and referrer.
   * Seen live 2026-09-05: forcing the degraded path on `/settings` produced
   * `/settings?email=leak-probe%40example.com`.
   *
   * Listed by path rather than widening the scan to every email input: the
   * board's public alert-signup and listing-search forms take an address
   * too, and a GET query in the URL is the whole point of those.
   *
   * Every `<form>` in a listed file must declare POST, not just one of them.
   * `apply-button.tsx` holds two forms and only one was POST before this
   * list covered it — a file-level `method="post"` search would have been
   * satisfied by the wrong form.
   */
  const PII_FORM_FILES = [
    // Signed-in account forms.
    'components/settings-email-card.tsx',
    'components/profile-form.tsx',
    // Guest apply on the public board: applicant name, email, cover text.
    'components/board/apply-button.tsx',
    // Auth form with an email but no password, so the secret scan skips it.
    'routes/-auth.forgot-password.tsx',
    // Employer surfaces that take an email address.
    'components/employer/invite-member-dialog.tsx',
    'routes/-employers.onboarding.tsx',
    'components/post-job-form.tsx',
  ];

  it('every form in a PII-carrying file declares method="post"', () => {
    const offenders = PII_FORM_FILES.flatMap((relative) => {
      const code = withoutComments(
        readFileSync(join(import.meta.dirname, relative), 'utf8'),
      );
      const forms = (code.match(FORM_OPENING) ?? []).length;
      const posts = (code.match(/\bmethod="post"/g) ?? []).length;
      if (forms === 0) return [`${relative}: no <form> — guard its wrapper`];
      if (posts < forms) {
        return [`${relative}: ${forms} <form>, ${posts} method="post"`];
      }
      return [];
    });
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
