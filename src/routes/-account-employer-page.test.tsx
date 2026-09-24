// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderRouted } from '@/test/render-routed';
import type { BoardUser, CandidateProfile } from '@cavuno/board';

const mocks = {
  updateProfile: vi.fn(),
  toastActionError: vi.fn(),
  toastActionReconciliationError: vi.fn(),
  toastActionSuccess: vi.fn(),
};

import { EmployerAccountPageView } from './-account-employer-page';

import { m } from '@/paraglide/messages';

const me = {
  object: 'board_user',
  id: 'user-1',
  role: 'employer',
  email: 'ada@example.com',
  displayName: 'Ada Lovelace',
  emailVerified: true,
  hasPassword: true,
} satisfies BoardUser;

const profile = {
  id: 'user-1',
  object: 'candidate_profile',
  displayName: 'Ada Lovelace',
  bio: null,
  avatarUrl: 'https://cdn.example.com/ada.png',
  handle: null,
  headline: null,
  location: null,
  countryCode: null,
  profileVisibility: 'public',
  jobSearchStatus: 'not_looking',
  jobSearchStatusVisibleTo: 'everyone',
  openToRelocate: false,
} satisfies CandidateProfile;

function renderPage() {
  return renderRouted(
    <EmployerAccountPageView me={me} profile={profile} dependencies={mocks} />,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('EmployerAccountPageView', () => {
  it('shows the employer profile: name, avatar, save and the dashboard link', async () => {
    await renderPage();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: m.accountEmployer_heading({ firstName: 'Ada' }),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: m.profileForm_displayNameLabel() }),
    ).toHaveValue('Ada Lovelace');
    expect(
      screen.getByRole('button', { name: m.avatarUpload_changePhotoLabel() }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: m.profileForm_saveLabel() }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: m.accountEmployer_dashboardLink() }),
    ).toHaveAttribute('href', '/employers/dashboard');
  });

  it('does not offer the candidate profile fields', async () => {
    await renderPage();

    for (const label of [
      m.profileForm_handleLabel(),
      m.profileForm_headlineLabel(),
      m.profileForm_locationLabel(),
      m.profileForm_bioLabel(),
      m.profileForm_visibilityLabel(),
    ]) {
      expect(screen.queryByLabelText(label)).toBeNull();
    }
    expect(
      screen.queryByRole('heading', { name: m.experienceSection_heading() }),
    ).toBeNull();
  });

  it('saves only the display name', async () => {
    mocks.updateProfile.mockResolvedValue({ ok: true });
    await renderPage();

    fireEvent.change(
      screen.getByRole('textbox', { name: m.profileForm_displayNameLabel() }),
      {
        target: { value: '  Ada King  ' },
      },
    );
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: m.profileForm_saveLabel() }),
      );
    });

    await waitFor(() => expect(mocks.toastActionSuccess).toHaveBeenCalled());
    expect(mocks.updateProfile).toHaveBeenCalledTimes(1);
    expect(mocks.updateProfile).toHaveBeenCalledWith({
      data: { displayName: 'Ada King' },
    });
    expect(mocks.toastActionError).not.toHaveBeenCalled();
  });

  it('reports a failed save', async () => {
    mocks.updateProfile.mockRejectedValue(new Error('forbidden'));
    await renderPage();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: m.profileForm_saveLabel() }),
      );
    });

    await waitFor(() => expect(mocks.toastActionError).toHaveBeenCalled());
    expect(mocks.toastActionSuccess).not.toHaveBeenCalled();
  });

  it('requires a display name before saving', async () => {
    await renderPage();

    const name = screen.getByRole('textbox', {
      name: m.profileForm_displayNameLabel(),
    });
    fireEvent.change(name, { target: { value: '   ' } });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: m.profileForm_saveLabel() }),
      );
    });

    expect(mocks.updateProfile).not.toHaveBeenCalled();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(
      screen.getByText(
        m.profileForm_fieldRequiredError({
          field: m.profileForm_displayNameLabel(),
        }),
      ),
    ).toBeInTheDocument();
  });
});
