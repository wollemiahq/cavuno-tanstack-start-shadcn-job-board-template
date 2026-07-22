// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { BoardApiError } from '@cavuno/board';
import { isNotFound as isRouteNotFound } from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getSeoBase, getTalentProfile, listTalent, rootData } = vi.hoisted(
  () => ({
    getSeoBase: vi.fn(),
    getTalentProfile: vi.fn(),
    listTalent: vi.fn(),
    // The profile hero reads the viewer session from the root loader (via
    // getRouteApi('__root__')) and the current URL (useLocation), exactly like
    // the talent search pane. Mock that seam so the CTA gating can be exercised
    // per viewer without a full RouterProvider.
    rootData: {
      value: {
        user: null as null | { role: 'employer' | 'candidate' },
        board: { features: { messaging: true } },
      },
    },
  }),
);

vi.mock('../server/queries', () => ({
  getSeoBase,
  getTalentProfile,
  listTalent,
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useLocation: () => ({ href: '/p/ada-lovelace' }),
    getRouteApi: (id: string) =>
      id === '__root__'
        ? { useLoaderData: () => rootData.value }
        : (actual.getRouteApi as (routeId: string) => unknown)(id),
  };
});

import { Route as ProfileRoute } from './p.$handle';
import { RestrictedTalentDirectory } from './-restricted-talent-directory';
import { Route as TalentRoute } from './talent.index';

const seo = {
  boardName: 'Acme Careers',
  language: 'en',
  labels: undefined,
  origin: 'https://careers.acme.test',
};

const profile = {
  object: 'talent_profile',
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

function routeLoader(route: typeof TalentRoute | typeof ProfileRoute) {
  const load = route.options.loader;
  if (typeof load !== 'function') {
    throw new Error('The talent route does not define a callable loader');
  }
  return load;
}

beforeEach(() => {
  getSeoBase.mockReset();
  getSeoBase.mockResolvedValue(seo);
  getTalentProfile.mockReset();
  getTalentProfile.mockResolvedValue(profile);
  listTalent.mockReset();
  listTalent.mockResolvedValue({ data: [], hasMore: false, nextCursor: null });
  rootData.value = {
    user: null,
    board: { features: { messaging: true } },
  };
});

/** Render the canonical profile component with the mocked route loader data. */
function renderProfile() {
  vi.spyOn(ProfileRoute, 'useLoaderData').mockReturnValue({
    profile,
    seo,
  } as never);

  const ProfileComponent = ProfileRoute.options.component;
  if (typeof ProfileComponent !== 'function') {
    throw new Error('The public profile route does not define a component');
  }

  return render(<ProfileComponent />);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('talent directory route — query and capability contracts', () => {
  it('passes the complete URL-backed query to the talent directory', async () => {
    await routeLoader(TalentRoute)({
      deps: {
        q: 'robotics engineer',
        skill: 'TypeScript',
        cursor: 'next-talent-page',
      },
    } as never);

    expect(listTalent).toHaveBeenCalledWith({
      data: {
        q: 'robotics engineer',
        skill: 'TypeScript',
        cursor: 'next-talent-page',
        limit: 24,
      },
    });
  });

  it('renders the restricted state for the employer-only directory code', async () => {
    listTalent.mockResolvedValue({ status: 'restricted' });

    await expect(
      routeLoader(TalentRoute)({ deps: {} } as never),
    ).resolves.toMatchObject({
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
    listTalent.mockRejectedValue(error);

    await expect(routeLoader(TalentRoute)({ deps: {} } as never)).rejects.toBe(
      error,
    );
  });

  it('turns a disabled or missing directory into the route not-found outcome', async () => {
    listTalent.mockRejectedValue(apiError(404, 'talent_directory_not_found'));

    let outcome: unknown;
    try {
      await routeLoader(TalentRoute)({ deps: {} } as never);
    } catch (error) {
      outcome = error;
    }

    expect(isRouteNotFound(outcome)).toBe(true);
  });
});

describe('canonical talent profile route', () => {
  it('retrieves the requested public handle and retains canonical metadata', async () => {
    const loaderData = await routeLoader(ProfileRoute)({
      params: { handle: 'ada-lovelace' },
    } as never);

    expect(getTalentProfile).toHaveBeenCalledWith({
      data: { handle: 'ada-lovelace' },
    });

    const head = ProfileRoute.options.head;
    if (typeof head !== 'function') {
      throw new Error('The public profile route does not define metadata');
    }

    expect(head({ loaderData } as never)).toMatchObject({
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

  it('retains ProfilePage and Person structured data for the canonical profile', () => {
    const { container } = renderProfile();
    // The profile opens on the shared entity hero band (avatar + name H1),
    // then drops into the profile article beneath it.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Ada Lovelace' }),
    ).toBeVisible();
    expect(container.querySelector('article')).toBeVisible();
    const payloads = Array.from(
      container.querySelectorAll<HTMLScriptElement>(
        'script[type="application/ld+json"]',
      ),
      (script) =>
        JSON.parse(script.textContent ?? 'null') as Record<string, unknown>,
    );

    expect(payloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          '@type': 'ProfilePage',
          url: 'https://careers.acme.test/p/ada-lovelace',
          mainEntity: expect.objectContaining({
            '@type': 'Person',
            name: 'Ada Lovelace',
            jobTitle: 'Robotics engineer',
            knowsAbout: ['Robotics'],
          }),
        }),
      ]),
    );
  });

  it('offers an allowed employer the gated Message action in the profile hero', () => {
    rootData.value = {
      user: { role: 'employer' },
      board: { features: { messaging: true } },
    };

    const { container } = renderProfile();

    const actions = container.querySelector<HTMLElement>(
      "[data-slot='talent-profile-actions']",
    );
    if (!actions) throw new Error('The profile hero action was not rendered');
    // An employer with talent access is handed off to the canonical profile
    // (where the conversation opens) — the same target as the search pane.
    expect(screen.getByRole('link', { name: 'Message' })).toHaveAttribute(
      'href',
      '/p/ada-lovelace',
    );
  });

  it('routes an anonymous viewer’s Message action to sign-in', () => {
    rootData.value = {
      user: null,
      board: { features: { messaging: true } },
    };

    renderProfile();

    const message = screen.getByRole('link', { name: 'Message' });
    const href = message.getAttribute('href') ?? '';
    expect(href).toContain('/auth/sign-in');
    expect(href).toContain('returnTo');
  });

  it('hides the Message action from a candidate viewer (no cold-messaging) ', () => {
    rootData.value = {
      user: { role: 'candidate' },
      board: { features: { messaging: true } },
    };

    const { container } = renderProfile();

    expect(
      container.querySelector("[data-slot='talent-profile-actions']"),
    ).toBeNull();
    expect(screen.queryByRole('link', { name: 'Message' })).toBeNull();
  });

  it('hides the Message action when board messaging is disabled', () => {
    rootData.value = {
      user: { role: 'employer' },
      board: { features: { messaging: false } },
    };

    renderProfile();

    expect(screen.queryByRole('link', { name: 'Message' })).toBeNull();
  });
});
