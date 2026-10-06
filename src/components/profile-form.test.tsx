// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';

import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  act,
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
  updateCustomFields: vi.fn(),
  updateObjectReferences: vi.fn(),
  toastActionError: vi.fn(),
  toastActionReconciliationError: vi.fn(),
  toastActionSuccess: vi.fn(),
};

import {
  ProfileForm,
  resolveTalentForm,
  type TalentProfileFields,
} from './profile-form';
import {
  EMPTY_ROOT_PREVIEW,
  RootSessionProvider,
  type RootSessionDependencies,
  useRootSession,
} from './root-session';

import { m } from '@/paraglide/messages';
import { EMPTY_GRANT } from '@/server/talent-access';

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
  locationPlace: null,
  commuteRadiusKm: null,
  commuteRadiusDefaultKm: 50,
} satisfies CandidateProfile;

afterEach(() => {
  // The HTML fallback must keep credentials and personal data out of GET URLs.
  for (const input of document.querySelectorAll<HTMLInputElement>(
    'input[type="password"], input[autocomplete="one-time-code"], input[type="email"], textarea[name="coverLetter"]',
  )) {
    expect(input.form?.method).toBe('post');
  }
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

    fireEvent.change(screen.getByLabelText(m.profileForm_countryLabel()), {
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

describe('ProfileForm — location', () => {
  const lyon = {
    id: 'loc-lyon',
    slug: 'loc-lyon',
    name: 'Lyon',
    fullName: 'Lyon, Auvergne-Rhône-Alpes, France',
    contextLabel: 'Auvergne-Rhône-Alpes, France',
    countryCode: 'FR',
    regionCode: null,
  };

  async function renderForm() {
    mocks.updateProfile.mockResolvedValue({ ok: true });
    await renderWithRouter(
      <ProfileForm
        profile={profile}
        language="en"
        dependencies={mocks}
        locationSuggestions={{
          suggestions: [lyon],
          loading: false,
          onQueryChange: vi.fn(),
        }}
      />,
    );
    return screen.getByLabelText<HTMLInputElement>(
      m.profileForm_locationLabel(),
    );
  }

  function typeLocation(input: HTMLElement, value: string) {
    fireEvent.input(input, { target: { value }, inputType: 'insertText' });
  }

  function submit() {
    fireEvent.submit(document.querySelector('[data-test="profile-form"]')!);
  }

  it('saves a picked suggestion as its full name', async () => {
    const input = await renderForm();

    typeLocation(input, 'Lyo');
    fireEvent.click(screen.getByRole('option', { name: /Lyon/ }));
    submit();

    await waitFor(() =>
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        data: expect.objectContaining({
          location: 'Lyon, Auvergne-Rhône-Alpes, France',
        }),
      }),
    );
  });

  it('blocks the save with an inline error while typed text is unpicked', async () => {
    const input = await renderForm();

    typeLocation(input, 'Lyo');
    submit();

    expect(
      await screen.findByText(m.locationField_pickRequiredError()),
    ).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveFocus();
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it('keeps a saved location that was never picked, and allows clearing it', async () => {
    const input = await renderForm();
    expect(input.value).toBe('London');

    submit();
    await waitFor(() =>
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        data: expect.objectContaining({ location: 'London' }),
      }),
    );

    mocks.updateProfile.mockClear();
    typeLocation(input, '');
    submit();
    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByText(m.locationField_pickRequiredError()),
    ).not.toBeInTheDocument();
  });
});

describe('ProfileForm — committed overview refresh', () => {
  const imported = {
    ...profile,
    displayName: 'Rowan Example',
    headline: 'Senior platform engineer',
    location: 'Houston, Texas, United States',
    bio: 'Builds reliable platforms.',
  };
  const suggestions = {
    suggestions: [],
    loading: false,
    onQueryChange: vi.fn(),
  };
  async function mount(
    initial: CandidateProfile,
    profileFields?: TalentProfileFields,
  ) {
    let refresh!: (next: CandidateProfile) => void;
    function Editor() {
      const [current, setCurrent] = useState(initial);
      refresh = setCurrent;
      return (
        <ProfileForm
          profile={current}
          profileFields={profileFields}
          language="en"
          dependencies={mocks}
          locationSuggestions={suggestions}
        />
      );
    }
    await renderWithRouter(<Editor />);
    return (next: CandidateProfile) => act(() => refresh(next));
  }
  const field = (name: string) => screen.getByLabelText(name);
  const submit = () =>
    fireEvent.submit(document.querySelector('[data-test="profile-form"]')!);

  it.each(['', 'rowan'])(
    'refreshes and submits imported overview from initial name %s',
    async (displayName) => {
      mocks.updateProfile.mockResolvedValue({ ok: true });
      const refresh = await mount({
        ...profile,
        displayName,
        headline: null,
        location: null,
      });
      refresh(imported);
      expect(field(m.profileForm_displayNameLabel())).toHaveValue(
        'Rowan Example',
      );
      expect(field(m.profileForm_headlineLabel())).toHaveValue(
        'Senior platform engineer',
      );
      expect(field(m.profileForm_locationLabel())).toHaveValue(
        'Houston, Texas, United States',
      );
      expect(field(m.profileForm_bioLabel())).toHaveValue(
        'Builds reliable platforms.',
      );
      submit();
      await waitFor(() =>
        expect(mocks.updateProfile).toHaveBeenCalledWith({
          data: expect.objectContaining({
            displayName: 'Rowan Example',
            headline: 'Senior platform engineer',
            location: 'Houston, Texas, United States',
            bio: 'Builds reliable platforms.',
          }),
        }),
      );
    },
  );

  it('keeps automatic handle following after an imported name', async () => {
    const refresh = await mount({
      ...profile,
      handle: null,
      displayName: 'rowan',
    });
    refresh({ ...imported, handle: null });
    expect(field(m.profileForm_handleLabel())).toHaveValue('rowan-example');
    fireEvent.change(field(m.profileForm_displayNameLabel()), {
      target: { value: 'Rowan Edited' },
    });
    expect(field(m.profileForm_handleLabel())).toHaveValue('rowan-edited');
  });

  it('settles the location validation when adopting a committed import', async () => {
    mocks.updateProfile.mockResolvedValue({ ok: true });
    const refresh = await mount(profile);
    const input = field(m.profileForm_locationLabel());
    fireEvent.input(input, { target: { value: 'Lyo' } });
    fireEvent.input(input, { target: { value: 'London' } });
    submit();
    expect(
      await screen.findByText(m.locationField_pickRequiredError()),
    ).toBeInTheDocument();

    refresh(imported);
    expect(input).toHaveValue('Houston, Texas, United States');
    expect(
      screen.queryByText(m.locationField_pickRequiredError()),
    ).not.toBeInTheDocument();
    submit();
    await waitFor(() =>
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        data: expect.objectContaining({
          location: 'Houston, Texas, United States',
        }),
      }),
    );
  });

  it('keeps custom drafts, explicit handles and visibility when overview refreshes', async () => {
    const updateCustomFields = mocks.updateCustomFields.mockResolvedValue({
      ok: true,
    });
    const refresh = await mount(
      { ...profile, profileVisibility: 'hidden' },
      {
        customFields: {
          definitions: [
            {
              key: 'portfolio_note',
              label: 'Portfolio note',
              type: 'short_text',
              required: false,
              visibility: 'private',
              editableByOwner: true,
            },
          ],
          values: { portfolio_note: 'Stored note' },
        },
        objectReferences: {
          definitions: [
            {
              key: 'certifications',
              label: 'Certifications',
              typeId: 'certification',
              multiple: true,
              visibility: 'private',
              editableByOwner: true,
              allowOverrides: false,
            },
          ],
          selections: [
            {
              fieldKey: 'certifications',
              fieldLabel: 'Certifications',
              recordId: 'cert-1',
              title: 'Sample certificate',
              valueDefinitions: [],
              entryDefinitions: [],
              values: {},
              entries: [],
              fields: [],
              attributes: {},
            },
          ],
        },
      },
    );
    mocks.updateProfile.mockResolvedValue({ ok: true });
    fireEvent.change(screen.getByLabelText('Portfolio note'), {
      target: { value: 'Unsaved note' },
    });
    fireEvent.change(field(m.profileForm_handleLabel()), {
      target: { value: 'chosen-handle' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: m.placeTags_removeAriaLabel({ name: 'Sample certificate' }),
      }),
    );
    refresh(imported);
    expect(screen.getByLabelText('Portfolio note')).toHaveValue('Unsaved note');
    expect(screen.queryByText('Sample certificate')).not.toBeInTheDocument();
    mocks.updateObjectReferences.mockResolvedValue({ ok: true });
    submit();
    await waitFor(() =>
      expect(updateCustomFields).toHaveBeenCalledWith({
        data: { values: { portfolio_note: 'Unsaved note' } },
      }),
    );
    await waitFor(() =>
      expect(mocks.updateObjectReferences).toHaveBeenCalledWith({
        data: { selections: [] },
      }),
    );
    expect(mocks.updateProfile).toHaveBeenCalledWith({
      data: expect.objectContaining({
        handle: 'chosen-handle',
        profileVisibility: 'hidden',
      }),
    });
  });

  it('preserves dirty overview and eligibility across polling and a late save', async () => {
    let finish!: (value: { ok: true }) => void;
    mocks.updateProfile.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const refresh = await mount(profile);
    fireEvent.change(field(m.profileForm_displayNameLabel()), {
      target: { value: 'Manual name' },
    });
    fireEvent.change(field(m.profileForm_headlineLabel()), {
      target: { value: 'Submitted headline' },
    });
    fireEvent.change(screen.getByLabelText(m.profileForm_countryLabel()), {
      target: { value: 'AU' },
    });
    submit();
    fireEvent.change(field(m.profileForm_headlineLabel()), {
      target: { value: 'Newer draft' },
    });
    fireEvent.input(field(m.profileForm_locationLabel()), {
      target: { value: 'Unpicked draft' },
      inputType: 'insertText',
    });
    refresh({ ...profile });
    refresh(imported);
    await act(async () => finish({ ok: true }));
    refresh({
      ...imported,
      displayName: 'Manual name',
      headline: 'Submitted headline',
    });
    expect(field(m.profileForm_displayNameLabel())).toHaveValue('Manual name');
    expect(field(m.profileForm_headlineLabel())).toHaveValue('Newer draft');
    expect(field(m.profileForm_locationLabel())).toHaveValue('Unpicked draft');
    expect(field(m.profileForm_handleLabel())).toHaveValue('ada');
    expect(screen.getByLabelText(m.profileForm_countryLabel())).toHaveValue(
      'AU',
    );
    expect(field(m.profileForm_bioLabel())).toHaveValue(
      'Builds reliable platforms.',
    );
    submit();
    expect(
      await screen.findByText(m.locationField_pickRequiredError()),
    ).toBeInTheDocument();
    expect(mocks.updateProfile).toHaveBeenCalledTimes(1);
  });
});

describe('ProfileForm — signed-in session refresh', () => {
  const sessionUser = {
    id: 'user_1',
    object: 'board_user',
    role: 'candidate',
    email: 'bree@example.test',
    displayName: 'bree',
    emailVerified: true,
    hasPassword: true,
  } as const;

  function SessionName() {
    return (
      <output data-testid="session-name">
        {useRootSession().user?.displayName ?? ''}
      </output>
    );
  }

  it('updates the session user, which the header and matches read, after a name save', async () => {
    mocks.updateProfile.mockResolvedValue({ ok: true });
    const dependencies: RootSessionDependencies = {
      getSessionShell: vi
        .fn()
        .mockResolvedValueOnce({ user: sessionUser })
        .mockResolvedValueOnce({
          user: { ...sessionUser, displayName: 'Bree Example' },
        }),
      getEntitlements: vi.fn().mockResolvedValue({
        preview: EMPTY_ROOT_PREVIEW,
        hasGrant: false,
        talentAccess: EMPTY_GRANT,
      }),
      getCompanies: vi.fn().mockResolvedValue({ data: [] }),
      resolveHasAccessGrant: vi.fn().mockReturnValue(false),
    };
    await renderWithRouter(
      <RootSessionProvider candidatePaywall={false} dependencies={dependencies}>
        <SessionName />
        <ProfileForm
          profile={{ ...profile, displayName: 'bree' }}
          language="en"
          dependencies={mocks}
          locationSuggestions={{
            suggestions: [],
            loading: false,
            onQueryChange: vi.fn(),
          }}
        />
      </RootSessionProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('session-name')).toHaveTextContent('bree'),
    );

    fireEvent.change(screen.getByLabelText(m.profileForm_displayNameLabel()), {
      target: { value: 'Bree Example' },
    });
    fireEvent.submit(document.querySelector('[data-test="profile-form"]')!);

    await waitFor(() =>
      expect(screen.getByTestId('session-name')).toHaveTextContent(
        'Bree Example',
      ),
    );
    expect(mocks.toastActionReconciliationError).not.toHaveBeenCalled();
  });
});
