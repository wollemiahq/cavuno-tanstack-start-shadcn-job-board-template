// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JobMatchEmailInvitation } from './job-match-email-invitation';

import {
  toastActionError,
  toastActionSuccess,
  toastActionReconciliationError,
} from '@/lib/action-toast';
import { m } from '@/paraglide/messages';
import { updateNotificationPreference } from '@/server/settings';
import type { NotificationPreference } from '@cavuno/board';

vi.mock('@/server/settings', () => ({ updateNotificationPreference: vi.fn() }));
vi.mock('@/lib/action-toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/action-toast')>()),
  toastActionSuccess: vi.fn(),
  toastActionError: vi.fn(),
  toastActionReconciliationError: vi.fn(),
}));

const preference: NotificationPreference = {
  object: 'notification_preference',
  channel: 'recommendedJobEmails',
  subscribed: false,
  waitlisted: false,
  updatedAt: null,
};
const updatePreference = vi.mocked(updateNotificationPreference);
const onEnabled = vi.fn<() => Promise<void>>();
type SaveResult = Awaited<ReturnType<typeof updateNotificationPreference>>;

function savedResult(
  overrides: Partial<NotificationPreference> = {},
): SaveResult {
  return {
    object: 'list',
    url: '/v1/me/notification-preferences',
    hasMore: false,
    nextCursor: null,
    data: [{ ...preference, subscribed: true, updatedAt: 10, ...overrides }],
  };
}

function invitationButton() {
  return screen.getByRole('button', {
    name: m.accountRecommended_emailInvitationAction(),
  });
}

function invitationHeading() {
  return screen.queryByRole('heading', {
    name: m.accountRecommended_emailInvitationTitle(),
  });
}

function renderInvitation(saved: NotificationPreference | null = preference) {
  return render(
    <JobMatchEmailInvitation preference={saved} onEnabled={onEnabled} />,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  updatePreference.mockResolvedValue(savedResult());
  onEnabled.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('job match email invitation', () => {
  it.each([false, true])(
    'stays visible until the response confirms subscription, including waitlisted=%s',
    async (waitlisted) => {
      let resolve!: (value: SaveResult) => void;
      updatePreference.mockReturnValue(
        new Promise((done) => {
          resolve = done;
        }),
      );
      renderInvitation();

      expect(updatePreference).not.toHaveBeenCalled();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      fireEvent.click(invitationButton());
      expect(invitationHeading()).toBeInTheDocument();
      expect(onEnabled).not.toHaveBeenCalled();
      expect(updatePreference).toHaveBeenCalledWith({
        data: { channel: 'recommendedJobEmails', subscribed: true },
      });

      await act(async () => {
        resolve(savedResult({ waitlisted }));
      });
      expect(invitationHeading()).not.toBeInTheDocument();
      expect(onEnabled).toHaveBeenCalledOnce();
      await waitFor(() => expect(toastActionSuccess).toHaveBeenCalledOnce());
    },
  );

  it('disables the pending action and prevents duplicate submissions', async () => {
    let resolve!: (value: SaveResult) => void;
    updatePreference.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    renderInvitation();
    const button = invitationButton();
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAccessibleName(m.profileForm_savingLabel());
    expect(updatePreference).toHaveBeenCalledOnce();
    await act(async () => {
      resolve(savedResult());
    });
  });

  it('retains the invitation on a rejected save with an accessible error and retry', async () => {
    updatePreference.mockRejectedValueOnce(new Error('save rejected'));
    renderInvitation();
    fireEvent.click(invitationButton());

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent(m.candidateAction_errorText());
    expect(invitationButton()).toBeEnabled();
    expect(invitationButton()).toHaveAccessibleDescription(
      m.candidateAction_errorText(),
    );
    expect(invitationHeading()).toBeInTheDocument();
    expect(onEnabled).not.toHaveBeenCalled();

    fireEvent.click(invitationButton());
    await waitFor(() => expect(invitationHeading()).not.toBeInTheDocument());
    expect(updatePreference).toHaveBeenCalledTimes(2);
    expect(onEnabled).toHaveBeenCalledOnce();
  });

  it.each(['unsubscribed', 'missing'] as const)(
    'does not hide or refresh after an unconfirmed %s response',
    async (state) => {
      const response = savedResult({ subscribed: false });
      if (state === 'missing') response.data = [];
      updatePreference.mockResolvedValue(response);
      renderInvitation();
      fireEvent.click(invitationButton());

      await screen.findByRole('alert');
      expect(invitationHeading()).toBeInTheDocument();
      expect(invitationButton()).toBeEnabled();
      expect(onEnabled).not.toHaveBeenCalled();
      expect(toastActionSuccess).not.toHaveBeenCalled();
    },
  );

  it('keeps a confirmed subscription hidden when refreshing fails', async () => {
    onEnabled.mockRejectedValue(new Error('refresh failed'));
    renderInvitation();
    fireEvent.click(invitationButton());

    await waitFor(() => expect(onEnabled).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(toastActionReconciliationError).toHaveBeenCalledOnce(),
    );
    expect(invitationHeading()).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(toastActionError).not.toHaveBeenCalled();
    expect(updatePreference).toHaveBeenCalledOnce();
  });

  it('shows a fresh invitation after a newer server preference opts out', async () => {
    const { rerender } = renderInvitation();
    fireEvent.click(invitationButton());
    await waitFor(() => expect(invitationHeading()).not.toBeInTheDocument());

    rerender(
      <JobMatchEmailInvitation
        preference={{ ...preference, subscribed: true, updatedAt: 10 }}
        onEnabled={onEnabled}
      />,
    );
    expect(invitationHeading()).not.toBeInTheDocument();
    rerender(
      <JobMatchEmailInvitation
        preference={{ ...preference, updatedAt: 20 }}
        onEnabled={onEnabled}
      />,
    );
    expect(invitationButton()).toBeEnabled();
    expect(updatePreference).toHaveBeenCalledOnce();
  });

  it.each([null, 1])(
    'keeps the confirmed save ahead of a refreshed snapshot with updatedAt=%s',
    async (updatedAt) => {
      const { rerender } = renderInvitation({ ...preference, updatedAt });
      fireEvent.click(invitationButton());
      await waitFor(() => expect(invitationHeading()).not.toBeInTheDocument());

      rerender(
        <JobMatchEmailInvitation
          preference={{ ...preference, updatedAt }}
          onEnabled={onEnabled}
        />,
      );
      expect(invitationHeading()).not.toBeInTheDocument();
    },
  );

  it.each([false, true])(
    'hides the invitation for subscribed candidates, including waitlisted=%s',
    (waitlisted) => {
      renderInvitation({ ...preference, subscribed: true, waitlisted });
      expect(invitationHeading()).not.toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(updatePreference).not.toHaveBeenCalled();
    },
  );

  it('hides the invitation when the preference is unknown', () => {
    renderInvitation(null);
    expect(invitationHeading()).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(updatePreference).not.toHaveBeenCalled();
  });
});
