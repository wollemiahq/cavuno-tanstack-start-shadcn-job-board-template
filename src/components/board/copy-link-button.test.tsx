// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CopyLinkButton } from './copy-link-button';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CopyLinkButton', () => {
  it('copies the supplied URL and confirms success without changing its accessible purpose', async () => {
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <CopyLinkButton url="https://example.test/jobs/engineer" language="en" />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'copy link' }));

    expect(writeText).toHaveBeenCalledWith(
      'https://example.test/jobs/engineer',
    );
    expect(await screen.findByText('Copied')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'copy link' })).toHaveAttribute(
      'data-slot',
      'button',
    );
  });
});
