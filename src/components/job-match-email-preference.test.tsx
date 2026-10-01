// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JobMatchEmailPreference } from './job-match-email-preference';

import { toastActionError } from '@/lib/action-toast';
import { m } from '@/paraglide/messages';
import type { updateNotificationPreference } from '@/server/settings';
import type { NotificationPreference } from '@cavuno/board';

vi.mock('@/lib/action-toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/action-toast')>()),
  toastActionError: vi.fn(),
  toastActionSuccess: vi.fn(),
}));

const preference: NotificationPreference = {
  object: 'notification_preference',
  channel: 'recommendedJobEmails',
  subscribed: false,
  waitlisted: false,
  updatedAt: null,
};

function response(pref: NotificationPreference) {
  return {
    object: 'list' as const,
    url: '/v1/me/notification-preferences',
    data: [pref],
    hasMore: false,
    nextCursor: null,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('email opt-in from job matches', () => {
  it('shows the saved choice without opting in on mount', () => {
    const updatePreference = vi.fn<typeof updateNotificationPreference>();
    render(
      <JobMatchEmailPreference
        preference={{ ...preference, subscribed: true }}
        onRefresh={vi.fn()}
        updatePreference={updatePreference}
      />,
    );

    expect(
      screen.getByRole('switch', { name: m.accountRecommended_emailLabel() }),
    ).toBeChecked();
    expect(updatePreference).not.toHaveBeenCalled();
  });

  it('saves once, waits for the write, and reflects the SDK waiting-list response', async () => {
    let complete!: (result: ReturnType<typeof response>) => void;
    const updatePreference = vi
      .fn<typeof updateNotificationPreference>()
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          }),
      );
    const onRefresh = vi.fn();
    render(
      <JobMatchEmailPreference
        preference={preference}
        onRefresh={onRefresh}
        updatePreference={updatePreference}
      />,
    );
    const control = screen.getByRole('switch', {
      name: m.accountRecommended_emailLabel(),
    });

    fireEvent.click(control);
    expect(control).toHaveAttribute('aria-disabled', 'true');
    expect(control).not.toBeChecked();
    fireEvent.click(control);
    expect(updatePreference).toHaveBeenCalledExactlyOnceWith({
      data: { channel: 'recommendedJobEmails', subscribed: true },
    });
    complete(response({ ...preference, subscribed: true, waitlisted: true }));

    await waitFor(() =>
      expect(control).not.toHaveAttribute('aria-disabled', 'true'),
    );
    expect(control).toBeChecked();
    expect(
      screen.getByText(m.accountRecommended_emailWaitlistedText()),
    ).toBeInTheDocument();
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('keeps the saved choice and reports a rejected write', async () => {
    const updatePreference = vi
      .fn<typeof updateNotificationPreference>()
      .mockRejectedValue(new Error('failed'));
    const onRefresh = vi.fn();
    render(
      <JobMatchEmailPreference
        preference={{ ...preference, subscribed: true }}
        onRefresh={onRefresh}
        updatePreference={updatePreference}
      />,
    );
    const control = screen.getByRole('switch', {
      name: m.accountRecommended_emailLabel(),
    });

    fireEvent.click(control);
    await waitFor(() =>
      expect(control).not.toHaveAttribute('aria-disabled', 'true'),
    );
    expect(control).toBeChecked();
    expect(toastActionError).toHaveBeenCalledOnce();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('offers a reload instead of guessing the preference, and reflects a later settings change', async () => {
    const onRefresh = vi.fn();
    const { rerender } = render(
      <JobMatchEmailPreference preference={null} onRefresh={onRefresh} />,
    );
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      m.accountRecommended_emailLoadError(),
    );
    fireEvent.click(
      screen.getByRole('button', { name: m.appError_retryAction() }),
    );
    await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce());

    rerender(
      <JobMatchEmailPreference preference={preference} onRefresh={onRefresh} />,
    );
    expect(screen.getByRole('switch')).not.toBeChecked();
    rerender(
      <JobMatchEmailPreference
        preference={{ ...preference, subscribed: true }}
        onRefresh={onRefresh}
      />,
    );
    expect(screen.getByRole('switch')).toBeChecked();
  });
});
