// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BoardAnalyticsBoot } from './board-analytics-boot';
import { CookieConsentProvider, useCookieConsent } from './cookie-consent';

import {
  clearBrowserAudienceAttribution,
  readAudienceCookie,
} from '@/lib/audience-attribution';

afterEach(() => {
  cleanup();
  clearBrowserAudienceAttribution('pk_test_board');
  document.cookie = 'cavuno_cookie_consent=; Path=/; Max-Age=0';
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('BoardAnalyticsBoot', () => {
  it('installs Cavuno Analytics for a publishable key', () => {
    const install = vi.fn();
    render(
      <BoardAnalyticsBoot publishableKey="pk_test_board" install={install} />,
    );
    expect(install).toHaveBeenCalledWith({ publishableKey: 'pk_test_board' });
  });

  it('skips install when the key is not publishable', () => {
    const install = vi.fn();
    render(<BoardAnalyticsBoot publishableKey="not-a-pk" install={install} />);
    expect(install).not.toHaveBeenCalled();
  });

  it.each([
    '5173-workspace-token.preview.cavuno.com',
    '5173-workspace-token.preview-dev.cavuno.com',
  ])('skips install in a WORKING preview on %s', (hostname) => {
    const install = vi.fn();
    render(
      <BoardAnalyticsBoot
        publishableKey="pk_test_board"
        install={install}
        hostname={hostname}
      />,
    );
    expect(install).not.toHaveBeenCalled();
  });
});

function ConsentButtons() {
  const consent = useCookieConsent();
  return (
    <>
      <button onClick={consent.accept}>Accept</button>
      <button onClick={consent.deny}>Deny</button>
      <button onClick={consent.reopenBanner}>Reopen</button>
    </>
  );
}

describe('audience capture consent', () => {
  it('captures the original landing page after consent and clears on revoke', () => {
    window.history.replaceState({}, '', '/?utm_medium=email');
    const screen = render(
      <CookieConsentProvider required>
        <BoardAnalyticsBoot publishableKey="pk_test_board" install={vi.fn()} />
        <ConsentButtons />
      </CookieConsentProvider>,
    );
    expect(
      readAudienceCookie(document.cookie, 'pk_test_board'),
    ).toBeUndefined();
    window.history.replaceState({}, '', '/jobs?utm_medium=cpc');
    fireEvent.click(screen.getByText('Accept'));
    expect(readAudienceCookie(document.cookie, 'pk_test_board')?.channel).toBe(
      'email',
    );
    fireEvent.click(screen.getByText('Reopen'));
    expect(
      readAudienceCookie(document.cookie, 'pk_test_board'),
    ).toBeUndefined();
    fireEvent.click(screen.getByText('Deny'));
    expect(
      readAudienceCookie(document.cookie, 'pk_test_board'),
    ).toBeUndefined();
  });
  it('never captures a persisted denial even when consent is optional', () => {
    document.cookie = 'cavuno_cookie_consent=denied; Path=/';
    render(
      <CookieConsentProvider required={false}>
        <BoardAnalyticsBoot publishableKey="pk_test_board" install={vi.fn()} />
      </CookieConsentProvider>,
    );
    expect(
      readAudienceCookie(document.cookie, 'pk_test_board'),
    ).toBeUndefined();
  });
  it('does not capture on previews', () => {
    render(
      <BoardAnalyticsBoot
        publishableKey="pk_test_board"
        hostname="5173-workspace-token.preview.cavuno.com"
        install={vi.fn()}
      />,
    );
    expect(
      readAudienceCookie(document.cookie, 'pk_test_board'),
    ).toBeUndefined();
  });
});
