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

import type { CandidateProfile } from '@cavuno/board';

const mocks = vi.hoisted(() => ({
  checkHandle: vi.fn(),
  invalidate: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return { ...actual, useRouter: () => ({ invalidate: mocks.invalidate }) };
});

vi.mock('../server/account', () => ({
  checkHandle: mocks.checkHandle,
  updateProfile: mocks.updateProfile,
}));

vi.mock('../lib/action-toast', () => ({
  toastActionError: vi.fn(),
  toastActionSuccess: vi.fn(),
}));

vi.mock('./location-suggest-field', () => ({
  LocationSuggestField: ({
    id,
    value,
    onValueChange,
  }: {
    id: string;
    value: string;
    onValueChange: (next: string) => void;
  }) => (
    <input
      id={id}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
}));

import { ProfileForm } from './profile-form';

const profile = {
  id: 'profile_1',
  object: 'candidate_profile',
  displayName: 'Ada Lovelace',
  bio: null,
  avatarUrl: null,
  handle: 'ada',
  headline: 'Engineer',
  location: 'London',
  profileVisibility: 'public',
  jobSearchStatus: 'open_to_offers',
  jobSearchStatusVisibleTo: 'everyone',
  openToRelocate: false,
} satisfies CandidateProfile;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ProfileForm country', () => {
  it('submits only the explicitly selected ISO country code, independently of free-text location', async () => {
    mocks.updateProfile.mockResolvedValue(undefined);
    render(
      <ProfileForm
        profile={profile}
        language="en"
        locationSuggestions={{
          suggestions: [],
          loading: false,
          onQueryChange: vi.fn(),
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText('Country'), {
      target: { value: 'AU' },
    });
    fireEvent.submit(document.querySelector('[data-test="profile-form"]')!);

    await waitFor(() =>
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        data: expect.objectContaining({
          location: 'London',
          countryCode: 'AU',
        }),
      }),
    );
  });
});
