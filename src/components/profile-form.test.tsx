// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CandidateProfile } from '@cavuno/board';

const mocks = {
  checkHandle: vi.fn(),
  updateProfile: vi.fn(),
  toastActionError: vi.fn(),
  toastActionSuccess: vi.fn(),
};

import { ProfileForm } from './profile-form';

async function renderWithRouter(node: React.ReactNode) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <>{node}</>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}

const profile = {
  id: 'profile_1',
  object: 'candidate_profile',
  displayName: 'Ada Lovelace',
  bio: null,
  avatarUrl: null,
  handle: 'ada',
  headline: 'Engineer',
  location: 'London',
  countryCode: null,
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
    await renderWithRouter(
      <ProfileForm
        profile={profile}
        language="en"
        dependencies={mocks}
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
