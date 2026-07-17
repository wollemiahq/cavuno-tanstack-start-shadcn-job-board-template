/**
 * The `<title>` seam (`Page | {boardName}`). These lock the WHY, not the
 * string concat:
 *
 *  - the app-side format must equal the SDK's `listingHead` format, because
 *    ~60 routes compose titles here while the 7 listing routes compose them
 *    in the SDK, and a board's indexed titles must not split into two house
 *    styles (the em-dash drift this seam replaced);
 *  - the board name is an explicit argument, resolved by the route's OWN
 *    loader — see the module doc for why root-match data cannot be used;
 *  - an unresolvable board name degrades to a bare page title, because a
 *    route renders its head before/without loader data in real branches and
 *    `Settings | undefined` would be worse than `Settings`.
 */
import { listingHead } from '@cavuno/board/seo';
import { describe, expect, it } from 'vitest';

import { headTitle, pageTitle, TITLE_SEPARATOR } from './page-title';

describe('pageTitle (format authority)', () => {
  it('appends the board name after a pipe', () => {
    expect(pageTitle(['Jobs'], 'Robotics Engineer Jobs')).toBe(
      'Jobs | Robotics Engineer Jobs',
    );
  });

  it('joins multiple parts outermost-first', () => {
    expect(pageTitle(['Anduril', 'Jobs'], 'Acme Careers')).toBe(
      'Anduril | Jobs | Acme Careers',
    );
  });

  it("agrees with the SDK's listingHead, so the two title surfaces cannot drift", () => {
    // The 7 listing routes compose through the SDK and must NOT be wrapped by
    // this module; that only stays safe while both emit the same shape.
    const heading = 'Robotics jobs in Berlin';
    const boardName = 'Acme Careers';
    const sdkTitle = listingHead({
      boardName,
      origin: 'https://careers.acme.test',
      path: '/jobs/robotics',
      heading,
    }).meta.find((entry) => 'title' in entry);

    expect(sdkTitle).toEqual({ title: pageTitle([heading], boardName) });
  });

  it('uses the same separator the SDK does', () => {
    expect(TITLE_SEPARATOR).toBe(' | ');
  });

  it('drops a blank page part rather than emitting a leading separator', () => {
    expect(pageTitle(['', null, 'Jobs', undefined], 'Acme Careers')).toBe(
      'Jobs | Acme Careers',
    );
  });

  it('degrades to a bare page title when the board name is unresolved', () => {
    // Real branch: a route rendering its head with no loader data.
    expect(pageTitle(['Settings'], undefined)).toBe('Settings');
    expect(pageTitle(['Settings'], '   ')).toBe('Settings');
  });

  // Titles sourced from data this code does not author — a CMS seoTitle, a
  // legal page title, a company name — must not double-suffix.
  it('does not repeat a board name the copy already ends with', () => {
    expect(pageTitle(['Why we hire | Acme Careers'], 'Acme Careers')).toBe(
      'Why we hire | Acme Careers',
    );
    expect(pageTitle(['Acme Careers'], 'Acme Careers')).toBe('Acme Careers');
    expect(pageTitle(['Why we hire | acme careers'], 'Acme Careers')).toBe(
      'Why we hire | acme careers',
    );
  });

  it('still suffixes when the board name merely appears mid-title', () => {
    // "Life at Acme Careers HQ" is a page title, not a suffixed one.
    expect(pageTitle(['Life at Acme Careers HQ'], 'Acme Careers')).toBe(
      'Life at Acme Careers HQ | Acme Careers',
    );
  });
});

describe('headTitle (the route-facing call)', () => {
  it("suffixes the board name the route's own loader resolved", () => {
    expect(headTitle('Acme Careers', 'Sign in')).toBe('Sign in | Acme Careers');
  });

  it('composes page + section + board', () => {
    expect(headTitle('Acme Careers', 'Ada Lovelace', 'Blog')).toBe(
      'Ada Lovelace | Blog | Acme Careers',
    );
  });

  it('renders the page title alone when the loader had no board name', () => {
    // The `loaderData ? … : …` fallback branch every route carries.
    expect(headTitle(undefined, 'Sign in')).toBe('Sign in');
  });
});
