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
  it('provides modal semantics and portals its content to the document body', () => {
    const { container } = render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Add a company</DialogTitle>
          <DialogDescription>Create a company workspace.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Add a company' });
    expect(dialog).toHaveAccessibleDescription('Create a company workspace.');
    expect(dialog).toHaveAttribute('data-slot', 'dialog-content');
    // Real portaling check: the content mounts to the document body, not
    // inside the component's own subtree — so the app's <body> theme applies.
    expect(container).not.toContainElement(dialog);
    expect(document.body).toContainElement(dialog);
    expect(dialog).toHaveClass('motion-reduce:animate-none');
    expect(document.querySelector('[data-slot="dialog-overlay"]')).toHaveClass(
      'motion-reduce:animate-none',
    );
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
