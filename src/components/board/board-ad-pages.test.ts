import { describe, expect, it } from 'vitest';

import { isBoardAdPage } from './board-ad-pages';

describe('public advertising surfaces', () => {
  it.each([
    '/',
    '/jobs',
    '/jobs/skills/react',
    '/companies/example',
    '/companies/example/jobs/engineer',
    '/blog/article',
    '/salaries/titles/engineering',
    '/talent',
  ])('permits public browsing on %s', (path) => {
    expect(isBoardAdPage(path)).toBe(true);
  });
  it.each([
    '/account',
    '/messages',
    '/auth/sign-in',
    '/post',
    '/apply',
    '/employers/companies/example/jobs/new',
    '/password',
    '/embed/jobs',
    '/privacy-policy',
    '/unknown',
  ])('does not start ads on %s', (path) => {
    expect(isBoardAdPage(path)).toBe(false);
  });
});
