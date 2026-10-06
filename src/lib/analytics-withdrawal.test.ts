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
  }
});

describe('clearAnalyticsCookies', () => {
  it('clears host-only tracker cookies and keeps unrelated ones', () => {
    document.cookie = '_ga=GA1.2.1; Path=/';
    document.cookie = '_ga_ABC123=GS1.1; Path=/';
    document.cookie = '_gat_UA1=1; Path=/';
    document.cookie = '_gid=GA1.2.2; Path=/';
    document.cookie = '_fbp=fb.1.1; Path=/';
    document.cookie = 'session-id=abc; Path=/';
    document.cookie = 'cavuno_cookie_consent=accepted; Path=/';
    document.cookie = '_gallery_view=grid; Path=/';
    document.cookie = 'theme=dark; Path=/';

    clearAnalyticsCookies();

    expect(cookieNames()).toEqual([
      '_gallery_view',
      'cavuno_cookie_consent',
      'theme',
    ]);
  });

  it('clears AdSense cookies but keeps its opt-out marker', () => {
    document.cookie = '__gads=ID=1; Path=/';
    document.cookie = '__gpi=UID=1; Path=/';
    document.cookie = '__eoi=ID=1; Path=/';
    document.cookie = '__gpi_optout=1; Path=/';

    clearAnalyticsCookies();

    expect(cookieNames()).toEqual(['__gpi_optout']);
  });

  it('keeps AdSense cookies when Google’s consent message governs ads', () => {
    document.cookie = '__gads=ID=1; Path=/';
    document.cookie = '_ga=GA1.2.1; Path=/';

    clearAnalyticsCookies({ keepAdSense: true });

    expect(cookieNames()).toEqual(['__gads']);
  });
});
