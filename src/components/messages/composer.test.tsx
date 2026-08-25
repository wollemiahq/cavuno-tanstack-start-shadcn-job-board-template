// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Composer } from './composer';

describe('Composer', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

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

    fireEvent.change(textarea, { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      // errorMessage never echoes wire text — generic viewer-locale line.
      'Something went wrong. Please try again.',
    );
    expect(screen.getByRole('alert')).toHaveAttribute(
      'data-slot',
      'field-error',
    );
    expect(textarea).toHaveValue('Keep this draft');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Send message' }),
      ).toBeEnabled(),
    );
  });

  it('sends a trimmed draft with the keyboard shortcut', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const onSent = vi.fn();

    render(
      <Composer disabled={false} hint={null} onSend={onSend} onSent={onSent} />,
    );

    const textarea = screen.getByRole('textbox', { name: 'Send a message' });
    fireEvent.change(textarea, { target: { value: '  Hello there  ' } });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    await waitFor(() => expect(onSend).toHaveBeenCalledWith('Hello there'));
    expect(onSent).toHaveBeenCalledOnce();
    expect(textarea).toHaveValue('');
  });

  it('renders a localized messaging-policy error and keeps the draft', async () => {
    const onSend = vi
      .fn()
      .mockRejectedValue({ code: 'messaging_recipient_not_open' });

    render(
      <Composer
        disabled={false}
        hint={null}
        onSend={onSend}
        onSent={vi.fn()}
      />,
    );

    const textarea = screen.getByRole('textbox', { name: 'Send a message' });
    fireEvent.change(textarea, { target: { value: 'Keep this message' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This candidate isn’t accepting messages.',
    );
    expect(textarea).toHaveValue('Keep this message');
  });
});
