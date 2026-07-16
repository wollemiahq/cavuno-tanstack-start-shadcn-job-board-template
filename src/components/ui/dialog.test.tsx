// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './dialog';

afterEach(cleanup);

describe('Dialog', () => {
  it('provides modal semantics and keeps its portal inside the Rhea theme scope', () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Add a company</DialogTitle>
          <DialogDescription>Create a company workspace.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Add a company' });
    expect(dialog).toHaveAccessibleDescription('Create a company workspace.');
    expect(dialog.closest('.rhea-theme')).toBeNull();
  });

  it('shows the canonical close control by default and lets callers hide it', () => {
    const { rerender } = render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Default close</DialogTitle>
          <DialogDescription>
            Close controls are on by default.
          </DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole('button', { name: 'Close' })).toBeVisible();

    rerender(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Hidden close</DialogTitle>
          <DialogDescription>
            The caller owns the close control.
          </DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});
