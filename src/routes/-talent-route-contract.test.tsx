// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { BoardApiError } from '@cavuno/board';
import { isNotFound as isRouteNotFound } from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RestrictedTalentDirectory } from './-restricted-talent-directory';
import {
  createTalentDirectoryLoader,
  createTalentProfileLoader,
  type TalentDirectoryRouteDependencies,
  type TalentProfileRouteDependencies,
} from './-talent-loaders';
import { TalentProfilePageView } from './-talent-profile-view';
import { Route as ProfileRoute } from './p.$handle';
import { Route as TalentRoute } from './talent.index';

const getTalentIndexPage =
  vi.fn<TalentDirectoryRouteDependencies['getTalentIndexPage']>();
const getTalentProfilePage =
  vi.fn<TalentProfileRouteDependencies['getTalentProfilePage']>();
const onStartConversation = vi.fn();
const onConversationStarted = vi.fn();

type TalentProfilePageData = Awaited<
  ReturnType<TalentProfileRouteDependencies['getTalentProfilePage']>
>;

const seo = {
  boardName: 'Acme Careers',
  language: 'en',
  labels: undefined,
  origin: 'https://careers.acme.test',
};

const profile: TalentProfilePageData['profile'] = {
  object: 'talent_profile',
  id: 'talent_prof_contract',
  handle: 'ada-lovelace',
  displayName: 'Ada Lovelace',
  headline: 'Robotics engineer',
  location: 'Sydney, Australia',
  avatarUrl: null,
  bio: 'Builds dependable machines.',
  jobSearchStatus: 'open_to_work',
  experiences: [],
  education: [],
  skills: [{ name: 'Robotics', jobSkillId: 'skill-robotics' }],
  languages: [],
};

function apiError(status: number, code: string) {
  return new BoardApiError({
    status,
    code,
    message: code,
    raw: { error: { code } },
  });
}

const talentLoader = createTalentDirectoryLoader({ getTalentIndexPage });
const profileLoader = createTalentProfileLoader({ getTalentProfilePage });

function talentLoaderContext(deps: {
  q?: string;
  skill?: string;
  page?: number;
}) {
  return {
    abortController: new AbortController(),
    preload: false,
    params: {},
    deps,
    context: { origin: 'https://careers.acme.test' },
    location: {
      href: 'https://careers.acme.test/talent',
      pathname: '/talent',
      search: {},
      searchStr: '',
      state: { __TSR_index: 0 },
      hash: '',
      publicHref: 'https://careers.acme.test/talent',
      external: false,
    },
    navigate: vi.fn(),
    parentMatchPromise: new Promise<never>(() => undefined),
    cause: 'enter' as const,
    route: TalentRoute,
  };
}

function profileLoaderContext(handle: string) {
  return {
    abortController: new AbortController(),
    preload: false,
    params: { handle },
    deps: {},
    context: { origin: 'https://careers.acme.test' },
    location: {
      href: `https://careers.acme.test/p/${handle}`,
      pathname: `/p/${handle}`,
      search: {},
      searchStr: '',
      state: { __TSR_index: 0 },
      hash: '',
      publicHref: `https://careers.acme.test/p/${handle}`,
      external: false,
    },
    navigate: vi.fn(),
    parentMatchPromise: new Promise<never>(() => undefined),
    cause: 'enter' as const,
    route: ProfileRoute,
  };
}

beforeEach(() => {
  onStartConversation.mockReset();
  onStartConversation.mockResolvedValue({
    ok: true,
    data: { conversationId: 'conversation-1' },
  });
  onConversationStarted.mockReset();
  getTalentIndexPage.mockReset();
  getTalentIndexPage.mockResolvedValue({
    seo,
    page: {
      object: 'list',
      url: '/v1/talent',
      data: [],
      hasMore: false,
      nextCursor: null,
    },
    restricted: false,
    head: { meta: [], links: [] },
    jsonLd: [],
  });
  getTalentProfilePage.mockReset();
  getTalentProfilePage.mockResolvedValue({
    profile,
    seo,
    head: {
      meta: [
        { title: 'Ada Lovelace | Acme Careers' },
        { name: 'description', content: 'Robotics engineer' },
      ],
      links: [
        {
          rel: 'canonical',
          href: 'https://careers.acme.test/p/ada-lovelace',
        },
      ],
    },
    jsonLd: [
      {
        '@type': 'ProfilePage',
        mainEntity: { '@type': 'Person', name: 'Ada Lovelace' },
      },
    ],
  });
});

function renderProfile({
  user = null,
  messagingEnabled = true,
}: {
  user?: { role: 'employer' | 'candidate' } | null;
  messagingEnabled?: boolean;
} = {}) {
  return render(
    <TalentProfilePageView
      profile={profile}
      user={user}
      messagingEnabled={messagingEnabled}
      locationHref="/p/ada-lovelace"
      onStartConversation={onStartConversation}
      onConversationStarted={onConversationStarted}
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe('talent directory route — query and capability contracts', () => {
  it('passes the complete URL-backed query, paging by offset, to the talent directory', async () => {
    await talentLoader(
      talentLoaderContext({
        q: 'robotics engineer',
        skill: 'TypeScript',
        page: 3,
      }),
    );

    expect(getTalentIndexPage).toHaveBeenCalledWith({
      data: {
        q: 'robotics engineer',
        skill: 'TypeScript',
        offset: 48,
        limit: 24,
      },
    });
  });

  it('renders the restricted state for the employer-only directory code', async () => {
    getTalentIndexPage.mockResolvedValue({
      seo,
      page: null,
      restricted: true,
      head: { meta: [], links: [] },
      jsonLd: [],
    });

    await expect(talentLoader(talentLoaderContext({}))).resolves.toMatchObject({
      page: null,
      restricted: true,
    });
  });

  it('presents employer-only access as the shared empty state with both auth paths', () => {
    const { container } = render(
      <RestrictedTalentDirectory boardName="Acme Careers" />,
    );

    expect(container.querySelector("[data-slot='empty']")).not.toBeNull();
    expect(
      screen.getByRole('heading', {
        name: 'This talent directory is for employers',
      }),
    ).toBeVisible();
    const signUpLink = screen.getByRole('link', { name: 'Sign up' });
    expect(signUpLink).toHaveAttribute('href', '/auth/employer/sign-up');
    expect(signUpLink).not.toHaveAttribute('role', 'button');
    const signInLink = screen.getByRole('link', { name: 'Sign in' });
    expect(signInLink).toHaveAttribute('href', '/auth/sign-in');
    expect(signInLink).not.toHaveAttribute('role', 'button');
    expect(screen.queryByRole('heading', { name: 'Talent' })).toBeNull();
  });

  it('offers a signed-in candidate the add-company path instead of another sign-in', () => {
    render(<RestrictedTalentDirectory boardName="Acme Careers" signedIn />);

    const addCompany = screen.getByRole('link', { name: 'Add company' });
    expect(addCompany).toHaveAttribute('href', '/employers/dashboard?add=true');
    expect(screen.queryByRole('link', { name: 'Sign up' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
  });

  it('does not disguise an unrelated forbidden response as an employer-only directory', async () => {
    const error = apiError(403, 'auth_forbidden');
    getTalentIndexPage.mockRejectedValue(error);

    await expect(talentLoader(talentLoaderContext({}))).rejects.toBe(error);
  });

  it('turns a disabled or missing directory into the route not-found outcome', async () => {
    getTalentIndexPage.mockRejectedValue(
      apiError(404, 'talent_directory_not_found'),
    );

    let outcome: unknown;
    try {
      await talentLoader(talentLoaderContext({}));
    } catch (error) {
      outcome = error;
    }

    expect(isRouteNotFound(outcome)).toBe(true);
  });
});

describe('canonical talent profile route', () => {
  it('retrieves the requested public handle and retains canonical metadata', async () => {
    const loaderData = await profileLoader(
      profileLoaderContext('ada-lovelace'),
    );

    expect(getTalentProfilePage).toHaveBeenCalledWith({
      data: { handle: 'ada-lovelace' },
    });

    const head = ProfileRoute.options.head;
    if (!head) {
      throw new Error('The public profile route does not define metadata');
    }

    const match = {
      id: '/p/$handle',
      routeId: '/p/$handle',
      fullPath: '/p/$handle',
      index: 1,
      pathname: '/p/ada-lovelace',
      params: { handle: 'ada-lovelace' },
      _strictParams: { handle: 'ada-lovelace' },
      status: 'success',
      isFetching: false,
      error: null,
      paramsError: null,
      searchError: null,
      updatedAt: Date.now(),
      _nonReactive: {},
      loaderData,
      context: { origin: 'https://careers.acme.test' },
      search: {},
      _strictSearch: {},
      fetchCount: 1,
      abortController: new AbortController(),
      cause: 'enter',
      loaderDeps: {},
      preload: false,
      invalid: false,
      staticData: { fullBleed: true, ownsMain: true },
    } satisfies Parameters<typeof head>[0]['match'];
    expect(
      await head({
        loaderData,
        match,
        matches: [match],
        params: { handle: 'ada-lovelace' },
      }),
    ).toMatchObject({
      meta: expect.arrayContaining([
        { title: 'Ada Lovelace | Acme Careers' },
        { name: 'description', content: 'Robotics engineer' },
      ]),
      links: [
        {
          rel: 'canonical',
          href: 'https://careers.acme.test/p/ada-lovelace',
        },
      ],
    });
  });

  it('retains ProfilePage and Person structured data for the canonical profile', async () => {
    const { container } = renderProfile();
    // The profile opens on the shared entity hero band (avatar + name H1),
    // then drops into the profile article beneath it.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Ada Lovelace' }),
    ).toBeVisible();
    expect(container.querySelector('article')).toBeVisible();

    // Structured data rides route head() `scripts` (React 19 streaming SSR
    // can drop body-rendered <script> elements), so the contract is the head
    // payload: the loader's jsonLd serialized as application/ld+json entries.
    const loaderData = await profileLoader(
      profileLoaderContext('ada-lovelace'),
    );
    const head = ProfileRoute.options.head;
    if (!head) {
      throw new Error('The public profile route does not define metadata');
    }
    const match = {
      id: '/p/$handle',
      routeId: '/p/$handle',
      fullPath: '/p/$handle',
      index: 1,
      pathname: '/p/ada-lovelace',
      params: { handle: 'ada-lovelace' },
      _strictParams: { handle: 'ada-lovelace' },
      status: 'success',
      isFetching: false,
      error: null,
      paramsError: null,
      searchError: null,
      updatedAt: Date.now(),
      _nonReactive: {},
      loaderData,
      context: { origin: 'https://careers.acme.test' },
      search: {},
      _strictSearch: {},
      fetchCount: 1,
      abortController: new AbortController(),
      cause: 'enter',
      loaderDeps: {},
      preload: false,
      invalid: false,
      staticData: { fullBleed: true, ownsMain: true },
    } satisfies Parameters<typeof head>[0]['match'];
    const { scripts } = await head({
      loaderData,
      match,
      matches: [match],
      params: { handle: 'ada-lovelace' },
    });
    expect(scripts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'application/ld+json',
          children: JSON.stringify({
            '@type': 'ProfilePage',
            mainEntity: {
              '@type': 'Person',
              name: 'Ada Lovelace',
            },
          }),
        }),
      ]),
    );
  });

  it('lets an eligible employer message the candidate by public handle', async () => {
    renderProfile({ user: { role: 'employer' } });

    fireEvent.click(screen.getByRole('button', { name: 'Message' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Send a message' }), {
      target: { value: 'Hello Ada' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() =>
      expect(onStartConversation).toHaveBeenCalledWith({
        candidateHandle: 'ada-lovelace',
        body: 'Hello Ada',
      }),
    );
    expect(onConversationStarted).toHaveBeenCalledWith('conversation-1');
  });

  it('routes an anonymous viewer’s Message action to sign-in', () => {
    renderProfile();

    const message = screen.getByRole('link', { name: 'Message' });
    const href = message.getAttribute('href') ?? '';
    expect(href).toContain('/auth/sign-in');
    expect(href).toContain('returnTo');
  });

  it('hides the Message action from a candidate viewer (no cold-messaging) ', () => {
    const { container } = renderProfile({ user: { role: 'candidate' } });

    expect(
      container.querySelector("[data-slot='talent-profile-actions']"),
    ).toBeNull();
    expect(screen.queryByRole('link', { name: 'Message' })).toBeNull();
  });

  it('hides the Message action when board messaging is disabled', () => {
    renderProfile({
      user: { role: 'employer' },
      messagingEnabled: false,
    });

    expect(screen.queryByRole('link', { name: 'Message' })).toBeNull();
  });
});
