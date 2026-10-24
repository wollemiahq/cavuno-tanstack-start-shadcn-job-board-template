import { describe, expect, it } from 'vitest';

import { validateAnchorJobInput } from './anchor-job-input';
import { appendAuthConversionQuery } from './board-datalayer-events';
import { candidateReturnTo } from './candidate-return-to';
import { readCookieConsent } from './cookie-consent';
import { parseCustomFieldSearch } from './custom-field-filters';
import { parsePageParam } from './pagination';

describe('untrusted URL and cookie input', () => {
  it.each(['/a/..//outside.example/path', '/a/%2e%2e//outside.example'])(
    'rejects redirect paths that normalize into network paths: %s',
    (path) => {
      expect(candidateReturnTo(path)).toBe('/account');
      const destination = appendAuthConversionQuery(path, 'login', 'password');
      expect(new URL(destination, 'https://board.example').origin).toBe(
        'https://board.example',
      );
    },
  );

  it('ignores structured pagination and filter query values', () => {
    expect(parsePageParam({ valueOf: null, toString: null })).toBe(1);
    expect(
      // SAFETY: intentionally malformed wire input exercises the runtime parser, never typed application state.
      parseCustomFieldSearch({ 'cf.style': [null, {}, 'remote'] } as never),
    ).toEqual({ 'cf.style': 'remote' });
  });

  it('treats malformed consent encoding as an undecided visitor', () => {
    expect(readCookieConsent('cavuno_cookie_consent=%E0%A4%A')).toBeNull();
  });

  it('rejects array-like anchor input before expanding it', () => {
    expect(
      validateAnchorJobInput({ jobSlugs: { length: 100_000_000 } }),
    ).toEqual({ jobSlugs: [] });
    expect(
      validateAnchorJobInput({
        jobSlugs: ['first', 'first', null, {}, 'second'],
      }),
    ).toEqual({ jobSlugs: ['first', 'second'] });
    expect(
      validateAnchorJobInput({
        jobSlugs: Array.from({ length: 20 }, (_, i) => `job-${i}`),
      }).jobSlugs,
    ).toHaveLength(10);
  });
});
