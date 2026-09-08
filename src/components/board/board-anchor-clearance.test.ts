// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { observeAnchorClearance } from './board-anchor-clearance';

let stop = () => {};
let resize = () => {};
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(0), 0),
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) =>
    window.clearTimeout(id),
  );
  vi.stubGlobal('innerHeight', 800);
});
afterEach(() => {
  stop();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});
function anchor(top = 710, bottom = 800) {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;bottom:0px';
  let bounds = new DOMRect(0, top, 1280, bottom - top);
  container.getBoundingClientRect = () => bounds;
  const creative = document.createElement('ins');
  creative.className = 'adsbygoogle';
  container.appendChild(creative);
  document.body.appendChild(container);
  return {
    container,
    setBounds: (nextTop: number, nextBottom = 800) => {
      bounds = new DOMRect(0, nextTop, 1280, nextBottom - nextTop);
    },
  };
}
describe('live anchor clearance', () => {
  it('tracks an inserted anchor, its resize and removal without editing the ad', async () => {
    const onChange = vi.fn();
    stop = observeAnchorClearance(onChange);
    expect(onChange).toHaveBeenLastCalledWith(0);
    const ad = anchor();
    const markup = ad.container.outerHTML;
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(90));
    expect(ad.container.outerHTML).toBe(markup);
    ad.setBounds(650);
    resize();
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(150));
    ad.container.remove();
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(0));
  });
  it('clears the offset when dismissed and remeasures a reopened anchor', async () => {
    const ad = anchor();
    const onChange = vi.fn();
    stop = observeAnchorClearance(onChange);
    ad.setBounds(800, 890);
    ad.container.setAttribute('data-anchor-status', 'dismissed');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(0));
    ad.setBounds(750);
    ad.container.setAttribute('data-anchor-status', 'displayed');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(50));
  });
  it('ignores in-page units, hidden anchors and top overlays', () => {
    const inline = anchor();
    inline.container.style.position = 'static';
    const hidden = anchor();
    hidden.container.style.display = 'none';
    const top = anchor(0, 90);
    top.container.style.cssText = 'position:fixed;top:0px';
    const onChange = vi.fn();
    stop = observeAnchorClearance(onChange);
    expect(onChange).toHaveBeenLastCalledWith(0);
  });
  it('remeasures viewport changes and uses the tallest visible anchor', async () => {
    anchor();
    const taller = anchor(600);
    const onChange = vi.fn();
    stop = observeAnchorClearance(onChange);
    expect(onChange).toHaveBeenLastCalledWith(200);
    taller.setBounds(700);
    window.dispatchEvent(new Event('resize'));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(100));
  });
  it('does not reserve bottom clearance for a top anchor outside body', () => {
    const ad = anchor(0, 95);
    document.documentElement.appendChild(ad.container);
    ad.container.style.cssText = 'position:fixed;top:0px';
    const onChange = vi.fn();
    stop = observeAnchorClearance(onChange);
    expect(onChange).toHaveBeenLastCalledWith(0);
    ad.container.remove();
  });
  it('releases the offset and disconnects on cleanup', async () => {
    const ad = anchor();
    const onChange = vi.fn();
    stop = observeAnchorClearance(onChange);
    stop();
    stop = () => {};
    expect(onChange).toHaveBeenLastCalledWith(0);
    onChange.mockClear();
    ad.container.remove();
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    expect(onChange).not.toHaveBeenCalled();
  });
});
