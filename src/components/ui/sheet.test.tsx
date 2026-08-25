// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Sheet, SheetContent, SheetTitle } from './sheet';

afterEach(cleanup);

describe('Sheet', () => {
  it('shows the canonical close control by default and lets callers hide it', () => {
    const { rerender } = render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Default close</SheetTitle>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.getByRole('button', { name: 'Close' })).toBeVisible();
    const sheet = screen.getByRole('dialog', { name: 'Default close' });
    expect(sheet).toHaveClass('motion-reduce:transition-none');
    expect(sheet).toHaveClass(
      'motion-reduce:data-[side=right]:data-starting-style:translate-x-0',
    );
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toHaveClass(
      'motion-reduce:transition-none',
    );

    rerender(
      <Sheet open>
        <SheetContent showCloseButton={false}>
          <SheetTitle>Hidden close</SheetTitle>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});
