// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ReactElement, ReactNode } from 'react';

import { cleanup, render as renderUI } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BoardAdFooter } from './board-ad-footer';
import { BoardAdPreviewProvider } from './board-ad-preview';
import { BoardAdsProvider } from './board-ads-provider';

import { CookieConsentProvider } from '@/components/cookie-consent';

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
const loader = () => document.getElementById('cavuno-adsense-loader');
function setup(config = ads, hasMobileBottomBar = false) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: state.width >= Number(query.match(/\d+/)?.[0]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  return render(
    <BoardAdsProvider ads={config}>
      <BoardAdFooter hasMobileBottomBar={hasMobileBottomBar} />
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
  Object.assign(state, {
    previewAds: false,
    required: false,
    width: 1280,
  });
});
describe('regular bottom anchor', () => {
  it('loads the supported non-expanding anchor without making a manual fixed unit', () => {
    const view = setup();
    expect(loader()).toHaveAttribute('data-overlays', 'collapsed-bottom');
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
  it('previews without requests and releases the space when switched off', () => {
    state.previewAds = true;
    const view = setup();
    expect(
      view.container.querySelector('[data-ad-preview="page:footer"]'),
    ).toBeInTheDocument();
    expect(loader()).toBeNull();
    expect(
      document.documentElement.style.getPropertyValue(
        '--board-ad-footer-height',
      ),
    ).toContain('90px');
    view.unmount();
    expect(
      document.documentElement.style.getPropertyValue(
        '--board-ad-footer-height',
      ),
    ).toBe('');
  });
  it('does not request or preview over the initial mobile Apply bar', () => {
    state.width = 390;
    const view = setup(ads, true);
    expect(loader()).toBeNull();
    expect(view.container).toBeEmptyDOMElement();
  });
});
