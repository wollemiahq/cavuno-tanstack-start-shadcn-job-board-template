// @vitest-environment jsdom

import { act, cleanup, fireEvent, render } from '@testing-library/react';
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
  delete window.__cavunoAnalyticsOff;
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

describe('Cavuno Analytics consent', () => {
  function renderWithConsent(required: boolean) {
    const install = vi.fn();
    const withdraw = vi.fn();
    const screen = render(
      <CookieConsentProvider required={required} withdrawAnalytics={withdraw}>
        <BoardAnalyticsBoot publishableKey="pk_test_board" install={install} />
        <ConsentButtons />
      </CookieConsentProvider>,
    );
    return { install, withdraw, screen };
  }

  it('installs when the board does not require consent', () => {
    const { install } = renderWithConsent(false);
    expect(install).toHaveBeenCalledWith({ publishableKey: 'pk_test_board' });
  });

  it('does not install while the visitor is undecided', () => {
    const { install } = renderWithConsent(true);
    expect(install).not.toHaveBeenCalled();
  });

  it('does not install after a saved denial', () => {
    document.cookie = 'cavuno_cookie_consent=denied; Path=/';
    const { install } = renderWithConsent(true);
    expect(install).not.toHaveBeenCalled();
  });

  it('installs after a saved acceptance', () => {
    document.cookie = 'cavuno_cookie_consent=accepted; Path=/';
    const { install } = renderWithConsent(true);
    expect(install).toHaveBeenCalledWith({ publishableKey: 'pk_test_board' });
  });

  it('installs when the visitor accepts later, and withdraws on deny', () => {
    const { install, withdraw, screen } = renderWithConsent(true);
    fireEvent.click(screen.getByText('Accept'));
    document.cookie = 'session-id=abc; Path=/';
    expect(install).toHaveBeenCalledTimes(1);
    expect(withdraw).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Deny'));
    expect(withdraw).toHaveBeenCalledTimes(1);
    expect(document.cookie).not.toContain('session-id');
  });

  it('sweeps analytics cookies left behind when the page reloads denied', () => {
    document.cookie = 'cavuno_cookie_consent=denied; Path=/';
    document.cookie = '_ga_ABC123=GS2.1; Path=/';
    const { withdraw } = renderWithConsent(true);
    expect(document.cookie).not.toContain('_ga_ABC123');
    expect(withdraw).not.toHaveBeenCalled();
  });

  it('keeps running when the banner is reopened after acceptance', () => {
    document.cookie = 'cavuno_cookie_consent=accepted; Path=/';
    const { withdraw, screen } = renderWithConsent(true);
    fireEvent.click(screen.getByText('Reopen'));
    fireEvent.click(screen.getByText('Accept'));
    expect(withdraw).not.toHaveBeenCalled();
  });

  it('withdraws once on a decline after reopening', () => {
    document.cookie = 'cavuno_cookie_consent=accepted; Path=/';
    const { withdraw, screen } = renderWithConsent(true);
    fireEvent.click(screen.getByText('Reopen'));
    fireEvent.click(screen.getByText('Deny'));
    fireEvent.click(screen.getByText('Deny'));
    expect(withdraw).toHaveBeenCalledTimes(1);
  });

  function otherTab(newValue: string | null) {
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'cavuno:cookie-consent', newValue }),
      );
    });
  }

  it('stops, but does not reload, when another tab declines', () => {
    document.cookie = 'cavuno_cookie_consent=accepted; Path=/';
    const { install, withdraw } = renderWithConsent(true);
    expect(install).toHaveBeenCalledTimes(1);
    document.cookie = 'session-id=abc; Path=/';
    otherTab('denied');
    expect(withdraw).not.toHaveBeenCalled();
    expect(window.__cavunoAnalyticsOff).toBe(true);
    expect(document.cookie).not.toContain('session-id');
  });

  it('ignores a reopen in another tab', () => {
    document.cookie = 'cavuno_cookie_consent=accepted; Path=/';
    const { withdraw } = renderWithConsent(true);
    document.cookie = 'session-id=abc; Path=/';
    otherTab(null);
    expect(withdraw).not.toHaveBeenCalled();
    expect(window.__cavunoAnalyticsOff).toBeUndefined();
    expect(document.cookie).toContain('session-id');
  });

  it('never withdraws what was never installed', () => {
    const { withdraw, screen } = renderWithConsent(true);
    fireEvent.click(screen.getByText('Deny'));
    expect(withdraw).not.toHaveBeenCalled();
  });
});

describe('audience capture consent', () => {
  it('captures the original landing page after consent and clears on revoke', () => {
    window.history.replaceState({}, '', '/?utm_medium=email');
    const screen = render(
      <CookieConsentProvider required withdrawAnalytics={vi.fn()}>
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
