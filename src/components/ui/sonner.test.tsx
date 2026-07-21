// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it } from 'vitest';

import { Toaster } from './sonner';

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove('dark');
});

/**
 * The app mounts no next-themes provider, so the toaster must derive its
 * mode from the SAME source the app themes with: the `dark` class that
 * `themeModeScript` toggles on <html>. These pin that the toaster follows
 * the board's resolved mode (sonner writes it to `data-sonner-theme` on the
 * rendered toast list), and that a runtime mode flip re-themes it — not the
 * OS. Sonner only renders the themed list once a toast is visible, so each
 * case emits one.
 */
describe('Toaster theming', () => {
  const themedList = () =>
    document.querySelector('[data-sonner-toaster]') as HTMLElement | null;

  it('follows the board light mode when <html> has no dark class', async () => {
    render(<Toaster />);
    act(() => {
      toast('Saved');
    });
    await waitFor(() =>
      expect(themedList()).toHaveAttribute('data-sonner-theme', 'light'),
    );
  });

  it('follows the board dark mode when <html> carries the dark class', async () => {
    document.documentElement.classList.add('dark');
    render(<Toaster />);
    act(() => {
      toast('Saved');
    });
    await waitFor(() =>
      expect(themedList()).toHaveAttribute('data-sonner-theme', 'dark'),
    );
  });

  it('re-themes when the resolved mode flips at runtime', async () => {
    render(<Toaster />);
    act(() => {
      toast('Saved');
    });
    await waitFor(() =>
      expect(themedList()).toHaveAttribute('data-sonner-theme', 'light'),
    );

    act(() => {
      document.documentElement.classList.add('dark');
    });

    await waitFor(() =>
      expect(themedList()).toHaveAttribute('data-sonner-theme', 'dark'),
    );
  });
});
