// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Composer } from './composer';

describe('Composer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps the draft available for retry when sending fails', async () => {
    const onSend = vi
      .fn()
      .mockRejectedValueOnce(new Error('Message could not be sent.'));

    render(
      <Composer
        disabled={false}
        hint={null}
        onSend={onSend}
        onSent={vi.fn()}
      />,
    );

    const textarea = screen.getByRole('textbox', { name: 'Send a message' });
    expect(textarea).toHaveAttribute('data-slot', 'textarea');

    fireEvent.change(textarea, { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Message could not be sent.',
    );
    expect(textarea).toHaveValue('Keep this draft');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Send message' }),
      ).toBeEnabled(),
    );
  });
});
