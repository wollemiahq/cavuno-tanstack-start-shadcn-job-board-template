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
});
