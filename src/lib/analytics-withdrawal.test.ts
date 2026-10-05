// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://jobs.example.com/"}

import { afterEach, describe, expect, it } from 'vitest';

import { clearAnalyticsCookies } from './analytics-withdrawal';

function cookieNames(): string[] {
  return document.cookie
    .split(';')
    .map((part) => part.split('=')[0]?.trim() ?? '')
    .filter(Boolean)
    .sort();
}

afterEach(() => {
  for (const name of cookieNames()) {
    document.cookie = `${name}=; Path=/; Max-Age=0`;
    document.cookie = `${name}=; Path=/; Domain=example.com; Max-Age=0`;
  }
});

describe('clearAnalyticsCookies', () => {
  it('clears tracker cookies on the host and its parent domains only', () => {
    // GA and Meta scope theirs to the registrable domain; the Cavuno
    // tracker's session cookie is host-only.
    document.cookie = '_ga=GA1.2.1; Path=/; Domain=example.com';
    document.cookie = '_ga_ABC123=GS1.1; Path=/; Domain=example.com';
    document.cookie = '_fbp=fb.1.1; Path=/; Domain=.example.com';
    document.cookie = 'session-id=abc; Path=/';
    document.cookie = 'cavuno_cookie_consent=accepted; Path=/';
    document.cookie = 'theme=dark; Path=/; Domain=example.com';
    expect(cookieNames()).toEqual([
      '_fbp',
      '_ga',
      '_ga_ABC123',
      'cavuno_cookie_consent',
      'session-id',
      'theme',
    ]);

    clearAnalyticsCookies('jobs.example.com');

    expect(cookieNames()).toEqual(['cavuno_cookie_consent', 'theme']);
  });

  it('clears AdSense cookies but keeps its opt-out marker', () => {
    document.cookie = '__gads=ID=1; Path=/; Domain=example.com';
    document.cookie = '__gpi=UID=1; Path=/; Domain=jobs.example.com';
    document.cookie = '__eoi=ID=1; Path=/';
    document.cookie = '__gpi_optout=1; Path=/; Domain=example.com';

    clearAnalyticsCookies('jobs.example.com');

    expect(cookieNames()).toEqual(['__gpi_optout']);
  });
});
