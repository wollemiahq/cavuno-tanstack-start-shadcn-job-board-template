import { describe, expect, it } from 'vitest';

import {
  ensureProtocol,
  isRichTextEmpty,
  looksLikeDomain,
  sanitizeLinkUrl,
  stripSocialHandle,
  toDomain,
  toSocialUrl,
} from './post-form';

describe('ensureProtocol', () => {
  it('prepends https:// to a bare domain', () => {
    expect(ensureProtocol('acme.com')).toBe('https://acme.com');
  });

  it('leaves an existing http(s) protocol untouched', () => {
    expect(ensureProtocol('https://acme.com')).toBe('https://acme.com');
    expect(ensureProtocol('http://acme.com')).toBe('http://acme.com');
  });

  it('detects the protocol case-insensitively', () => {
    expect(ensureProtocol('HTTPS://Acme.com')).toBe('HTTPS://Acme.com');
  });

  it('trims surrounding whitespace before deciding', () => {
    expect(ensureProtocol('  acme.com  ')).toBe('https://acme.com');
  });

  it('returns undefined for empty / whitespace-only input', () => {
    expect(ensureProtocol('')).toBeUndefined();
    expect(ensureProtocol('   ')).toBeUndefined();
    expect(ensureProtocol(undefined)).toBeUndefined();
  });
});

describe('toDomain', () => {
  it('strips the protocol and any path', () => {
    expect(toDomain('https://acme.com/careers/123')).toBe('acme.com');
    expect(toDomain('http://jobs.acme.com')).toBe('jobs.acme.com');
  });

  it('returns a bare domain unchanged', () => {
    expect(toDomain('acme.com')).toBe('acme.com');
  });

  it('trims whitespace', () => {
    expect(toDomain('  acme.com/x ')).toBe('acme.com');
  });
});

describe('looksLikeDomain', () => {
  it('accepts a plausible domain (with or without protocol/path)', () => {
    expect(looksLikeDomain('acme.com')).toBe(true);
    expect(looksLikeDomain('https://acme.com/careers')).toBe(true);
    expect(looksLikeDomain('jobs.acme.co')).toBe(true);
  });

  it('rejects a value with no dot', () => {
    expect(looksLikeDomain('acme')).toBe(false);
  });

  it('rejects values with spaces or that are empty', () => {
    expect(looksLikeDomain('foo bar')).toBe(false);
    expect(looksLikeDomain('')).toBe(false);
    expect(looksLikeDomain('   ')).toBe(false);
  });
});

describe('sanitizeLinkUrl', () => {
  it('prepends https:// to a bare domain', () => {
    expect(sanitizeLinkUrl('example.com')).toBe('https://example.com');
    expect(sanitizeLinkUrl('  example.com  ')).toBe('https://example.com');
  });

  it('keeps a host:port authority (no scheme) and adds https://', () => {
    expect(sanitizeLinkUrl('example.com:8080/apply')).toBe(
      'https://example.com:8080/apply',
    );
  });

  it('leaves an existing http(s) URL untouched (case-insensitive)', () => {
    expect(sanitizeLinkUrl('http://example.com')).toBe('http://example.com');
    expect(sanitizeLinkUrl('HTTPS://Example.com')).toBe('HTTPS://Example.com');
  });

  it('rejects non-http(s) schemes (no XSS via javascript:/mailto:)', () => {
    expect(sanitizeLinkUrl('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeLinkUrl('mailto:a@b.com')).toBeUndefined();
  });

  it('returns undefined for empty input (used to unset the link)', () => {
    expect(sanitizeLinkUrl('')).toBeUndefined();
    expect(sanitizeLinkUrl('   ')).toBeUndefined();
  });
});

describe('isRichTextEmpty', () => {
  it('treats an empty editor document as empty', () => {
    expect(isRichTextEmpty('')).toBe(true);
    expect(isRichTextEmpty('<p></p>')).toBe(true);
    expect(isRichTextEmpty('<p><br></p>')).toBe(true);
    expect(isRichTextEmpty('   <p>  &nbsp; </p> ')).toBe(true);
  });

  it('treats a document with visible text as non-empty', () => {
    expect(isRichTextEmpty('<p>Hello</p>')).toBe(false);
    expect(isRichTextEmpty('<ul><li>Role</li></ul>')).toBe(false);
  });
});

describe('stripSocialHandle', () => {
  it('reduces a pasted full URL to the bare handle', () => {
    expect(
      stripSocialHandle('https://www.linkedin.com/company/acme', [
        'linkedin.com',
      ]),
    ).toBe('company/acme');
  });

  it('strips a network alias (twitter.com for x.com)', () => {
    expect(
      stripSocialHandle('https://twitter.com/acme', ['x.com', 'twitter.com']),
    ).toBe('acme');
  });

  it('leaves a bare handle untouched', () => {
    expect(stripSocialHandle('acme', ['x.com'])).toBe('acme');
  });
});

describe('toSocialUrl', () => {
  it('canonicalises to the network domain regardless of pasted form', () => {
    expect(toSocialUrl('acme', 'x.com')).toBe('https://x.com/acme');
    expect(
      toSocialUrl('https://twitter.com/acme', 'x.com', [
        'x.com',
        'twitter.com',
      ]),
    ).toBe('https://x.com/acme');
  });

  it('returns an empty string for empty input', () => {
    expect(toSocialUrl('', 'x.com')).toBe('');
    expect(toSocialUrl('   ', 'x.com')).toBe('');
  });
});
