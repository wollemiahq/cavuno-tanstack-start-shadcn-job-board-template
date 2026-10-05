// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ReactElement, ReactNode } from 'react';

import {
  cleanup,
  fireEvent,
  render as renderUI,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BoardAdPreviewProvider } from './board-ad-preview';
import { BoardAdsBoot } from './board-ads-boot';
import { BoardAdsProvider } from './board-ads-provider';

import {
  CookieConsentProvider,
  useCookieConsent,
} from '@/components/cookie-consent';

const withdraw = vi.fn();
const state = { previewAds: false, required: false, width: 1280 };
function TestProviders({ children }: { children: ReactNode }) {
  return (
    <BoardAdPreviewProvider enabled={state.previewAds}>
      <CookieConsentProvider
        required={state.required}
        withdrawAnalytics={withdraw}
      >
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
const loader = () => document.getElementById('cavuno-adsense-loader');
function ConsentButtons() {
  const { accept, deny } = useCookieConsent();
  return (
    <>
      <button type="button" onClick={accept}>
        accept
      </button>
      <button type="button" onClick={deny}>
        decline
      </button>
    </>
  );
}
function setup(config = ads, hasMobileBottomBar = false) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: state.width >= Number(query.match(/\d+/)?.[0]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  return render(
    <BoardAdsProvider ads={config}>
      <BoardAdsBoot hasMobileBottomBar={hasMobileBottomBar} />
      {state.required && <ConsentButtons />}
    </BoardAdsProvider>,
  );
}
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
  document.cookie = 'cavuno_cookie_consent=; Max-Age=0; Path=/';
  loader()?.remove();
  vi.unstubAllGlobals();
  withdraw.mockReset();
  Object.assign(state, {
    previewAds: false,
    required: false,
    width: 1280,
  });
});
describe('public AdSense loader', () => {
  it('loads AdSense without forcing anchors or rendering a unit', () => {
    const view = setup();
    expect(loader()).toHaveAttribute(
      'src',
      expect.stringContaining(ads.clientId),
    );
    expect(loader()).not.toHaveAttribute('data-overlays');
    expect(view.container.querySelector('ins')).toBeNull();
    expect(
      view.container.querySelector('[data-slot="board-ad-footer"]'),
    ).toBeNull();
  });
  it('does not load when advertising is off', () => {
    setup({ ...ads, enabled: false });
    expect(loader()).toBeNull();
  });
  it('waits for required consent', () => {
    state.required = true;
    setup();
    expect(loader()).toBeNull();
  });
  it('does not load or render a footer in placement preview', () => {
    state.previewAds = true;
    const view = setup();
    expect(loader()).toBeNull();
    expect(view.container).toBeEmptyDOMElement();
  });
  it('does not request or preview over the initial mobile Apply bar', () => {
    state.width = 390;
    const view = setup(ads, true);
    expect(loader()).toBeNull();
    expect(view.container).toBeEmptyDOMElement();
  });
  it('withdraws on decline once AdSense has loaded', () => {
    state.required = true;
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'accept' }));
    expect(loader()).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'decline' }));
    expect(withdraw).toHaveBeenCalledOnce();
  });
  it('has nothing to withdraw when AdSense never loaded', () => {
    state.required = true;
    setup({ ...ads, enabled: false });
    fireEvent.click(screen.getByRole('button', { name: 'accept' }));
    fireEvent.click(screen.getByRole('button', { name: 'decline' }));
    expect(loader()).toBeNull();
    expect(withdraw).not.toHaveBeenCalled();
  });
});
