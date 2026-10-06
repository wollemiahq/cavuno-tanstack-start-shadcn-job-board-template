// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The request flag is module state; each case gets a fresh copy so a request
// in one case cannot mount the Toaster in the next.
async function loadFresh() {
  vi.resetModules();
  const { DeferredToaster } = await import('./deferred-toaster');
  const { toastActionSuccess } = await import('@/lib/action-toast');
  return { DeferredToaster, toastActionSuccess };
}

// sonner's live region, present whenever the Toaster is mounted.
const toasterRegion = () => document.querySelector('section[aria-live]');

afterEach(() => {
  cleanup();
});

describe('DeferredToaster', () => {
  it('stays out of the page until something needs it', async () => {
    const { DeferredToaster } = await loadFresh();
    render(<DeferredToaster />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(toasterRegion()).toBeNull();
  });

  it('mounts on the first pointer press', async () => {
    const { DeferredToaster } = await loadFresh();
    render(<DeferredToaster />);
    fireEvent.pointerDown(window);
    await vi.waitFor(() => expect(toasterRegion()).not.toBeNull());
  });

  // A toast raised as a page loads (a greeting after a redirect, a failure
  // while polling a Stripe return) comes before any press.
  it('shows a toast raised before any interaction', async () => {
    const { DeferredToaster, toastActionSuccess } = await loadFresh();
    render(<DeferredToaster />);
    await act(async () => {
      await toastActionSuccess('Saved');
    });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });
});
