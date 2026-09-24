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
    mocks.updateProfile.mockResolvedValue({ ok: true });
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
    mocks.updateProfile.mockResolvedValue({ ok: true });
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

describe('ProfileForm — handle', () => {
  const suggestions = {
    suggestions: [],
    loading: false,
    onQueryChange: vi.fn(),
  };

  async function renderForm(overrides: Partial<CandidateProfile> = {}) {
    await renderWithRouter(
      <ProfileForm
        profile={{ ...profile, ...overrides }}
        language="en"
        dependencies={mocks}
        locationSuggestions={suggestions}
      />,
    );
  }

  const handleInput = () =>
    screen.getByRole('textbox', { name: m.profileForm_handleLabel() });
  const nameInput = () =>
    screen.getByRole('textbox', { name: m.profileForm_displayNameLabel() });
  const typeHandle = (value: string) =>
    fireEvent.change(handleInput(), { target: { value } });
  const submit = () =>
    fireEvent.submit(document.querySelector('[data-test="profile-form"]')!);

  async function expectHandleError(message: string) {
    await waitFor(() =>
      expect(handleInput()).toHaveAccessibleDescription(
        expect.stringContaining(message),
      ),
    );
    expect(handleInput()).toHaveAttribute('aria-invalid', 'true');
  }

  it('blocks the save with an inline error when the handle is blank', async () => {
    await renderForm();

    typeHandle('');
    submit();

    await expectHandleError(m.profileForm_handleRequiredError());
    expect(mocks.updateProfile).not.toHaveBeenCalled();
    expect(mocks.toastActionSuccess).not.toHaveBeenCalled();
  });

  it.each([
    ['too short', 'ab', m.profileForm_handleLengthError()],
    ['too long', 'a'.repeat(51), m.profileForm_handleLengthError()],
    ['a leading hyphen', '-ada', m.profileForm_handleFormatError()],
    ['a trailing hyphen', 'ada-', m.profileForm_handleFormatError()],
    ['other characters', 'ada_l', m.profileForm_handleFormatError()],
  ])('rejects a handle with %s', async (_case, value, message) => {
    await renderForm();

    typeHandle(value);
    submit();

    await expectHandleError(message);
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it('lower-cases the handle and turns spaces into hyphens as it is typed', async () => {
    await renderForm();

    typeHandle('Ada Byron');

    expect(handleInput()).toHaveValue('ada-byron');
  });

  it('suggests a handle from the name until the candidate edits it', async () => {
    await renderForm({ handle: null, displayName: 'Ada Lovelace' });
    expect(handleInput()).toHaveValue('ada-lovelace');

    fireEvent.change(nameInput(), { target: { value: 'Grace M. Hopper!' } });
    expect(handleInput()).toHaveValue('grace-m-hopper');

    typeHandle('amazing-grace');
    fireEvent.change(nameInput(), { target: { value: 'Grace Brewster' } });
    expect(handleInput()).toHaveValue('amazing-grace');
  });

  it('leaves a short name without a suggestion, so the save stays blocked', async () => {
    await renderForm({ handle: null, displayName: 'Al' });
    expect(handleInput()).toHaveValue('');

    submit();

    await expectHandleError(m.profileForm_handleRequiredError());
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it('keeps a stored handle when the name changes', async () => {
    await renderForm();

    fireEvent.change(nameInput(), { target: { value: 'Grace Hopper' } });

    expect(handleInput()).toHaveValue('ada');
  });

  it('shows a handle the probe reports taken and blocks the save', async () => {
    mocks.checkHandle.mockResolvedValue({ available: false });
    await renderForm();

    typeHandle('grace');

    await expectHandleError(m.profileForm_handleTakenText());
    expect(mocks.checkHandle).toHaveBeenCalledWith({
      data: { handle: 'grace' },
    });
    submit();
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it('shows the taken error when the save is refused for the handle', async () => {
    mocks.checkHandle.mockResolvedValue({ available: true });
    mocks.updateProfile.mockResolvedValue({
      ok: false,
      code: 'candidate_handle_taken',
    });
    await renderForm();

    typeHandle('grace');
    submit();

    await expectHandleError(m.profileForm_handleTakenText());
    expect(mocks.toastActionSuccess).not.toHaveBeenCalled();
    expect(mocks.toastActionError).not.toHaveBeenCalled();
  });

  it('sends a valid handle in the patch', async () => {
    mocks.checkHandle.mockResolvedValue({ available: true });
    mocks.updateProfile.mockResolvedValue({ ok: true });
    await renderForm();

    typeHandle('grace-hopper');
    expect(
      await screen.findByText(
        m.profileForm_handleAvailableText(),
        {},
        { timeout: 2000 },
      ),
    ).toBeInTheDocument();
    submit();

    await waitFor(() =>
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        data: expect.objectContaining({ handle: 'grace-hopper' }),
      }),
    );
    expect(mocks.toastActionSuccess).toHaveBeenCalled();
  });
});
