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
  toastActionReconciliationError: vi.fn(),
  toastActionSuccess: vi.fn(),
};

import { ProfileForm, resolveTalentForm } from './profile-form';

import { m } from '@/paraglide/messages';

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

describe('ProfileForm — operator form layout', () => {
  function builtin(
    key: string,
    options: { visible?: boolean; required?: boolean; locked?: boolean } = {},
  ) {
    return {
      kind: 'builtin' as const,
      key,
      visible: options.visible ?? true,
      required: options.required ?? options.locked ?? false,
      locked: options.locked ?? false,
      lockReason: options.locked ? ('identity' as const) : null,
    };
  }
  const suggestions = {
    suggestions: [],
    loading: false,
    onQueryChange: vi.fn(),
  };

  it('renders the layout order, leaves hidden fields out and does not send them', async () => {
    mocks.updateProfile.mockResolvedValue(undefined);
    await renderWithRouter(
      <ProfileForm
        profile={profile}
        language="en"
        dependencies={mocks}
        locationSuggestions={suggestions}
        entries={resolveTalentForm(
          [
            builtin('bio'),
            builtin('name', { locked: true }),
            builtin('headline', { visible: false }),
            builtin('jobSearchStatus'),
          ],
          null,
        )}
      />,
    );

    const bio = screen.getByLabelText(m.profileForm_bioLabel());
    const name = screen.getByLabelText(m.profileForm_displayNameLabel());
    expect(
      bio.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByLabelText(m.profileForm_headlineLabel())).toBeNull();
    expect(screen.queryByLabelText(m.profileForm_locationLabel())).toBeNull();

    fireEvent.submit(document.querySelector('[data-test="profile-form"]')!);

    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledTimes(1));
    const data = mocks.updateProfile.mock.calls[0]?.[0]?.data;
    expect(data).toMatchObject({ displayName: 'Ada Lovelace', bio: '' });
    expect(data).not.toHaveProperty('headline');
    expect(data).not.toHaveProperty('location');
  });

  it('blocks the save while a required field or section is empty', async () => {
    await renderWithRouter(
      <ProfileForm
        profile={profile}
        language="en"
        dependencies={mocks}
        locationSuggestions={suggestions}
        entries={resolveTalentForm(
          [
            builtin('name', { locked: true }),
            builtin('experience', { required: true }),
          ],
          null,
        )}
        sectionCounts={{ experience: 0 }}
      />,
    );

    fireEvent.submit(document.querySelector('[data-test="profile-form"]')!);

    expect(
      await screen.findByText(
        m.profileForm_fieldRequiredError({
          field: m.experienceSection_heading(),
        }),
      ),
    ).toBeInTheDocument();
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });
});
