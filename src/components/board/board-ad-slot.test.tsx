// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { StrictMode } from 'react';
import type { ReactElement, ReactNode } from 'react';

import {
  cleanup,
  render as renderUI,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BoardAdPreviewProvider } from './board-ad-preview';
import { BoardAdSlot } from './board-ad-slot';
import { BoardAdsProvider } from './board-ads-provider';

import {
  CookieConsentProvider,
  useCookieConsent,
} from '@/components/cookie-consent';

const state = { previewAds: false, required: false, width: 1280 };
function TestProviders({ children }: { children: ReactNode }) {
  return (
    <BoardAdPreviewProvider enabled={state.previewAds}>
      <CookieConsentProvider required={state.required}>
        {children}
      </CookieConsentProvider>
    </BoardAdPreviewProvider>
  );
}
function render(element: ReactElement) {
  sessionStorage.setItem(
    'cavuno:preview-ad-placements',
    String(state.previewAds),
  );
  return renderUI(element, { wrapper: TestProviders });
}
const ads = {
  enabled: true,
  clientId: 'ca-pub-1234567890123456',
  defaultSlotId: '1234567890',
};
// SAFETY: The tested AdSense adapter initializes this optional queue on Window.
const adsWindow = window as Window & { adsbygoogle?: unknown[] };

beforeEach(() => {
  state.previewAds = false;
  state.required = false;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
  document.cookie = 'cavuno_cookie_consent=; Max-Age=0; Path=/';
  document.getElementById('cavuno-adsense-loader')?.remove();
  delete adsWindow.adsbygoogle;
  vi.unstubAllGlobals();
});
function expectNoRequest() {
  expect(document.getElementById('cavuno-adsense-loader')).toBeNull();
  expect(adsWindow.adsbygoogle).toBeUndefined();
}

describe('BoardAdSlot', () => {
  it('uses the board default from context and requests its unit once under StrictMode', () => {
    const { container } = render(
      <StrictMode>
        <BoardAdsProvider ads={ads}>
          <BoardAdSlot />
        </BoardAdsProvider>
      </StrictMode>,
    );
    expect(container.querySelector('ins')).toHaveAttribute(
      'data-ad-client',
      ads.clientId,
    );
    expect(container.querySelector('ins')).toHaveAttribute(
      'data-ad-slot',
      ads.defaultSlotId,
    );
    expect(adsWindow.adsbygoogle).toHaveLength(1);
    expect(document.querySelectorAll('#cavuno-adsense-loader')).toHaveLength(1);
  });

  it('uses an explicit slot without changing the publisher', () => {
    const { container } = render(<BoardAdSlot ads={ads} slotId="9876543210" />);
    expect(container.querySelector('ins')).toHaveAttribute(
      'data-ad-client',
      ads.clientId,
    );
    expect(container.querySelector('ins')).toHaveAttribute(
      'data-ad-slot',
      '9876543210',
    );
  });

  it('respects the advertising switch even with an explicit slot', () => {
    const { container } = render(
      <BoardAdSlot ads={{ ...ads, enabled: false }} slotId="9876543210" />,
    );
    expect(container).toBeEmptyDOMElement();
    expectNoRequest();
  });

  it('does not request a unit when no slot is configured', () => {
    const { container } = render(
      <BoardAdSlot ads={{ ...ads, defaultSlotId: null }} />,
    );
    expect(container).toBeEmptyDOMElement();
    expectNoRequest();
  });

  it('waits for required consent and remains off when it is declined', () => {
    state.required = true;
    function ConsentActions() {
      const consent = useCookieConsent();
      return (
        <>
          <button onClick={consent.deny}>Deny</button>
          <button onClick={consent.accept}>Accept</button>
        </>
      );
    }
    const { container, getByRole } = render(
      <>
        <BoardAdSlot ads={ads} />
        <ConsentActions />
      </>,
    );
    expectNoRequest();
    fireEvent.click(getByRole('button', { name: 'Deny' }));
    expectNoRequest();
    fireEvent.click(getByRole('button', { name: 'Accept' }));
    expect(container.querySelector('ins')).toBeInTheDocument();
    expect(adsWindow.adsbygoogle).toHaveLength(1);
  });

  it('previews placements without loading Google or requesting ads', () => {
    state.previewAds = true;
    const { container, getByRole } = render(
      <BoardAdSlot placement="detail:sidebar" ads={ads} />,
    );
    expect(getByRole('complementary')).toHaveAttribute(
      'data-ad-preview',
      'detail:sidebar',
    );
    expect(container.querySelector('ins')).toBeNull();
    expectNoRequest();
  });

  it('does not request an ad below its media breakpoint', () => {
    const { container } = render(
      <BoardAdSlot ads={ads} media="(min-width: 1024px)" />,
    );
    expect(container).toBeEmptyDOMElement();
    expectNoRequest();
  });

  it('collapses an unfilled unit and reports its status', async () => {
    const onStatusChange = vi.fn();
    const { container } = render(
      <BoardAdSlot ads={ads} onStatusChange={onStatusChange} />,
    );
    container.querySelector('ins')!.setAttribute('data-ad-status', 'unfilled');
    await waitFor(() =>
      expect(onStatusChange).toHaveBeenCalledWith('unfilled'),
    );
    expect(container.querySelector('[data-ad-placement]')).not.toBeVisible();
    expect(adsWindow.adsbygoogle).toHaveLength(1);
  });
});
