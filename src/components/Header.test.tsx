// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
/**
 * Public-header behavior (CAV-503).
 *
 * These tests exercise the user-visible seam under a real TanStack memory
 * router: optional collections follow board feature flags, account entry
 * points follow the enabled roles, the mobile menu exposes disclosure state,
 * and the search form derives its destination/parameter from the current
 * public collection without navigating for each keystroke.
 */
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Header imports the signed-in Messages link even for this anonymous public
// shell suite. Stub its Board API boundary so jsdom never resolves the
// Cloudflare Workers environment module.
vi.mock('../server/messaging', () => ({ getUnreadCount: vi.fn() }));
// Header calls signOut from the avatar menu; the real module chain reaches
// the Workers-only `cloudflare:workers` import, so it must be mocked in jsdom.
vi.mock('../server/auth', () => ({
  signOut: vi.fn(async () => ({ ok: true })),
}));
vi.mock('../server/queries', () => ({
  searchPlaces: vi.fn().mockResolvedValue({ data: [] }),
}));

import {
  resolveHeaderSearchState,
  type HeaderSearchSubmission,
} from '../lib/header-search';
import { AppRouterProvider } from './app-router-provider';
import Header from './Header';

afterEach(cleanup);

type HeaderFeatures = React.ComponentProps<typeof Header>['features'] & {
  blog: boolean;
  talentDirectory: boolean;
};

const allFeatures: HeaderFeatures = {
  candidates: true,
  employers: true,
  publicJobSubmission: true,
  blog: true,
  talentDirectory: true,
};

type TalentDirectoryVisibility = 'off' | 'public' | 'employers_only' | null;

function renderHeader({
  initialEntry = '/',
  features = allFeatures,
  talentDirectoryVisibility = features.talentDirectory ? 'public' : 'off',
  locationSuggestions = [],
  keywordSuggestions = [],
  companyMarketSuggestions = [],
  resolvedKeywordLabel,
}: {
  initialEntry?: string;
  features?: HeaderFeatures;
  talentDirectoryVisibility?: TalentDirectoryVisibility;
  locationSuggestions?: Array<{
    id: string;
    slug: string;
    name: string;
    contextLabel: string | null;
    countryCode?: string | null;
    regionCode?: string | null;
  }>;
  keywordSuggestions?: Array<{
    id: string;
    type: 'category' | 'skill';
    slug: string;
    name: string;
  }>;
  companyMarketSuggestions?: Array<{ slug: string; name: string }>;
  resolvedKeywordLabel?: string;
} = {}) {
  const initialUrl = new URL(initialEntry, 'https://board.example');
  const initialSearch = resolveHeaderSearchState(
    initialUrl.pathname,
    Object.fromEntries(initialUrl.searchParams),
    initialUrl.pathname.startsWith('/jobs/locations/') ? 'Sydney' : undefined,
    resolvedKeywordLabel,
  );
  const rootRoute = createRootRoute();
  const route = (path: string) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => {
        const navigate = useNavigate();

        function submitSearch({
          scope,
          query,
          location,
          term,
          market,
        }: HeaderSearchSubmission) {
          if (scope === 'companies') {
            if (market) {
              void navigate({
                to: '/companies/markets/$market',
                params: { market: market.slug },
              });
            } else {
              void navigate({ to: '/companies', search: { query } });
            }
          } else if (scope === 'talent') {
            void navigate({ to: '/talent', search: { q: query } });
          } else if (scope === 'blog') {
            void navigate({ to: '/blog', search: { q: query } });
          } else if (location && term?.type === 'skill') {
            void navigate({
              to: '/jobs/locations/$location/skills/$skill',
              params: { location: location.slug, skill: term.slug },
            });
          } else if (location && term?.type === 'category') {
            void navigate({
              to: '/jobs/locations/$location/$keyword',
              params: { location: location.slug, keyword: term.slug },
            });
          } else if (term?.type === 'skill') {
            void navigate({
              to: '/jobs/skills/$skill',
              params: { skill: term.slug },
            });
          } else if (term?.type === 'category') {
            void navigate({
              to: '/jobs/$keyword',
              params: { keyword: term.slug },
            });
          } else if (location) {
            void navigate({
              to: '/jobs/locations/$location',
              params: { location: location.slug },
              search: { q: query },
            });
          } else {
            void navigate({ to: '/jobs', search: { q: query } });
          }
        }

        return (
          <AppRouterProvider>
            <Header
              boardName="Robotics Jobs"
              logoUrl={null}
              user={null}
              language="en"
              features={features}
              talentDirectoryVisibility={talentDirectoryVisibility}
              search={{
                ...initialSearch,
                onSubmit: submitSearch,
                locationSuggestions: {
                  suggestions: locationSuggestions.map((place) => ({
                    countryCode: null,
                    regionCode: null,
                    ...place,
                  })),
                  loading: false,
                  onQueryChange: vi.fn(),
                },
                keywordSuggestions: {
                  suggestions: keywordSuggestions,
                  loading: false,
                  onQueryChange: vi.fn(),
                },
                companyMarketSuggestions: {
                  suggestions: companyMarketSuggestions,
                  loading: false,
                  onQueryChange: vi.fn(),
                },
              }}
            />
          </AppRouterProvider>
        );
      },
    });

  const router = createRouter({
    routeTree: rootRoute.addChildren([
      route('/'),
      route('/jobs'),
      route('/jobs/locations/$location'),
      route('/jobs/$keyword'),
      route('/jobs/skills/$skill'),
      route('/jobs/locations/$location/$keyword'),
      route('/jobs/locations/$location/skills/$skill'),
      route('/companies'),
      route('/companies/markets/$market'),
      route('/talent'),
      route('/p/$handle'),
      route('/blog'),
      route('/post'),
      route('/auth/sign-in'),
      route('/auth/join'),
      route('/auth/sign-up'),
      route('/auth/employer/sign-up'),
    ]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });

  render(<RouterProvider router={router} />);
  return router;
}

describe('Header — feature-gated public collections', () => {
  it('omits Blog and Talent when those board features are disabled', async () => {
    renderHeader({
      features: {
        ...allFeatures,
        blog: false,
        talentDirectory: false,
      },
    });

    expect(await screen.findByRole('link', { name: 'Jobs' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Companies' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Blog' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Talent' })).toBeNull();
  });

  it('links Blog and Talent to their collection pages when enabled', async () => {
    renderHeader();

    expect(
      (await screen.findByRole('link', { name: 'Blog' })).getAttribute('href'),
    ).toBe('/blog');
    expect(
      screen.getByRole('link', { name: 'Talent' }).getAttribute('href'),
    ).toBe('/talent');
  });

  it('keeps Talent navigation and contextual search available for an employer-only directory', async () => {
    renderHeader({
      initialEntry: '/talent',
      features: { ...allFeatures, talentDirectory: false },
      talentDirectoryVisibility: 'employers_only',
    });

    expect(
      (await screen.findByRole('link', { name: 'Talent' })).getAttribute(
        'href',
      ),
    ).toBe('/talent');
    expect(screen.getByLabelText(/keyword/i)).toHaveAttribute(
      'placeholder',
      'Search candidates…',
    );
  });
});

describe('Header — role and public-posting gates', () => {
  it('hides every account entry point when neither account role is enabled', async () => {
    renderHeader({
      features: {
        ...allFeatures,
        candidates: false,
        employers: false,
        publicJobSubmission: false,
      },
    });

    await screen.findByRole('link', { name: 'Jobs' });
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Sign up' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Post a job' })).toBeNull();
  });

  it.each([
    {
      name: 'candidate-only boards',
      candidates: true,
      employers: false,
      href: '/auth/sign-up',
    },
    {
      name: 'employer-only boards',
      candidates: false,
      employers: true,
      href: '/auth/employer/sign-up',
    },
    {
      name: 'boards serving both roles',
      candidates: true,
      employers: true,
      href: '/auth/join',
    },
  ])(
    'routes Sign up correctly for $name',
    async ({ candidates, employers, href }) => {
      renderHeader({
        features: {
          ...allFeatures,
          candidates,
          employers,
          publicJobSubmission: false,
        },
      });

      expect(
        (await screen.findByRole('link', { name: 'Sign up' })).getAttribute(
          'href',
        ),
      ).toBe(href);
      expect(
        screen.getByRole('link', { name: 'Sign in' }).getAttribute('href'),
      ).toBe('/auth/sign-in');
    },
  );

  it('uses the single Companies search for free text and market suggestions', async () => {
    const router = renderHeader({
      initialEntry: '/companies',
      companyMarketSuggestions: [
        { slug: 'industrial-automation', name: 'Industrial Automation' },
      ],
    });
    const searchbox = await screen.findByLabelText(/keyword/i);

    fireEvent.input(searchbox, {
      target: { value: 'industrial' },
      inputType: 'insertText',
    });
    fireEvent.click(
      screen.getByRole('option', { name: /Industrial Automation/ }),
    );

    await waitFor(() =>
      expect(router.state.location.href).toBe(
        '/companies/markets/industrial-automation',
      ),
    );
  });

  it('shows Post a job independently of account registration', async () => {
    renderHeader({
      features: {
        ...allFeatures,
        candidates: false,
        employers: false,
        publicJobSubmission: true,
      },
    });

    expect(
      (await screen.findByRole('link', { name: 'Post a job' })).getAttribute(
        'href',
      ),
    ).toBe('/post');
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Sign up' })).toBeNull();
  });
});

describe('Header — mobile navigation disclosure', () => {
  it('opens a named modal and restores focus to the trigger on Escape', async () => {
    renderHeader();

    const toggle = await screen.findByRole('button', {
      name: /navigation menu/i,
    });

    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.focus();
    fireEvent.click(toggle);

    const dialog = await screen.findByRole('dialog', {
      name: 'Primary navigation',
    });
    expect(toggle.closest('[aria-hidden="true"]')).not.toBeNull();
    await waitFor(() => expect(document.activeElement).not.toBe(toggle));

    fireEvent.keyDown(document.activeElement ?? dialog, { key: 'Escape' });

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Primary navigation' }),
      ).toBeNull(),
    );
    expect(toggle).toHaveFocus();
  });

  it('keeps mobile authentication beside the trigger while navigation fills the overlay', async () => {
    renderHeader();

    const toggle = await screen.findByRole('button', {
      name: /navigation menu/i,
    });
    fireEvent.click(toggle);

    const mobileMenu = await screen.findByRole('dialog', {
      name: 'Primary navigation',
    });

    const actions = mobileMenu.querySelector<HTMLElement>(
      '[data-test="header-actions"]',
    );
    if (!actions) throw new Error('Expected header actions');
    const signIn = within(actions).getByRole('link', { name: 'Sign in' });
    const signUp = within(actions).getByRole('link', { name: 'Sign up' });
    expect(signIn).toHaveAttribute('href', '/auth/sign-in');
    expect(signUp).toHaveAttribute('href', '/auth/join');
    expect(
      within(mobileMenu).getByRole('link', { name: 'Post a job' }),
    ).toHaveAttribute('href', '/post');
  });
});

describe('Header — pathname-scoped submit-only search', () => {
  it('uses the route-resolved place name without reconstructing it from the slug', () => {
    expect(
      resolveHeaderSearchState(
        '/jobs/locations/sao-paulo-sp',
        {},
        'São Paulo, SP',
      ).location,
    ).toEqual({ slug: 'sao-paulo-sp', name: 'São Paulo, SP' });
  });

  it('keeps search, primary navigation, and actions in accessible DOM order', async () => {
    renderHeader();

    await screen.findByRole('search');
    const left = document.querySelector<HTMLElement>(
      "[data-test='header-left']",
    );
    const primaryNavigation = screen.getByRole('navigation', {
      name: 'Primary navigation',
    });
    const actions = document.querySelector<HTMLElement>(
      "[data-test='header-actions']",
    );

    expect(left).not.toBeNull();
    expect(actions).not.toBeNull();
    if (!left || !actions)
      throw new Error('Expected all three desktop header zones');
    const search = screen.getByRole('search');
    expect(left).toContainElement(search);
    expect(
      screen.queryByRole('combobox', { name: 'Search category' }),
    ).toBeNull();
    expect(
      left.compareDocumentPosition(primaryNavigation) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      primaryNavigation.compareDocumentPosition(actions) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('pairs keyword and location in one Jobs bar without leaking location into other scopes', async () => {
    renderHeader({ initialEntry: '/jobs' });

    const jobsSearch = await screen.findByRole('search');
    expect(
      within(jobsSearch).getByRole('combobox', { name: /keyword/i }),
    ).toBeTruthy();
    expect(
      within(jobsSearch).getByRole('combobox', { name: /location/i }),
    ).toBeTruthy();
    expect(jobsSearch).toHaveAttribute('data-search-scope', 'jobs');

    cleanup();
    renderHeader({ initialEntry: '/companies' });
    expect(await screen.findByRole('search')).toHaveAttribute(
      'data-search-scope',
      'companies',
    );
    expect(screen.queryByRole('combobox', { name: /location/i })).toBeNull();

    cleanup();
    renderHeader({ initialEntry: '/blog?q=systems' });
    expect(await screen.findByRole('search')).toHaveAttribute(
      'data-search-scope',
      'blog',
    );
    expect(screen.queryByRole('combobox', { name: /location/i })).toBeNull();
  });

  it('stages a canonical Jobs suggestion and navigates only when Search is submitted', async () => {
    const router = renderHeader({
      initialEntry: '/jobs',
      keywordSuggestions: [
        {
          id: 'skill:robotics',
          type: 'skill',
          slug: 'robotics',
          name: 'Robotics',
        },
      ],
    });

    const keyword = await screen.findByRole('combobox', { name: /keyword/i });
    fireEvent.input(keyword, {
      target: { value: 'rob' },
      inputType: 'insertText',
    });
    fireEvent.click(screen.getByRole('option', { name: /Robotics/ }));

    expect(router.state.location.href).toBe('/jobs');
    fireEvent.submit(keyword.closest('form') as HTMLFormElement);
    await waitFor(() =>
      expect(router.state.location.href).toBe('/jobs/skills/robotics'),
    );
  });

  it('gives the keyword field the same inline clear affordance as location', async () => {
    renderHeader({ initialEntry: '/jobs?q=robotics' });

    const keyword = (await screen.findByLabelText(
      /keyword/i,
    )) as HTMLInputElement;
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));

    expect(keyword.value).toBe('');
    expect(keyword).toHaveFocus();
  });

  it('preserves an active place and submits keyword plus location together', async () => {
    const router = renderHeader({
      initialEntry: '/jobs/locations/sydney?q=engineer',
    });
    const keyword = (await screen.findByLabelText(
      /keyword/i,
    )) as HTMLInputElement;
    const location = screen.getByRole('combobox', {
      name: /location/i,
    }) as HTMLInputElement;

    expect(location.value).toBe('Sydney');
    fireEvent.change(keyword, { target: { value: 'robotics' } });
    fireEvent.submit(keyword.closest('form') as HTMLFormElement);

    await waitFor(() =>
      expect(router.state.location.href).toBe(
        '/jobs/locations/sydney?q=robotics',
      ),
    );
  });

  it.each([
    {
      name: 'category route',
      initialEntry: '/jobs/mechanical-engineering',
      resolvedKeywordLabel: 'Mechanical Engineering',
      expectedKeyword: 'Mechanical Engineering',
      expectedLocation: '',
    },
    {
      name: 'skill route',
      initialEntry: '/jobs/skills/robotics',
      resolvedKeywordLabel: 'Robotics',
      expectedKeyword: 'Robotics',
      expectedLocation: '',
    },
    {
      name: 'combined category and location route',
      initialEntry: '/jobs/locations/sydney/mechanical-engineering',
      resolvedKeywordLabel: 'Mechanical Engineering',
      expectedKeyword: 'Mechanical Engineering',
      expectedLocation: 'Sydney',
    },
    {
      name: 'hosted free-text query URL',
      initialEntry: '/jobs?query=robotics',
      resolvedKeywordLabel: undefined,
      expectedKeyword: 'robotics',
      expectedLocation: '',
    },
  ])(
    'prefills the search controls on a $name',
    async ({
      initialEntry,
      resolvedKeywordLabel,
      expectedKeyword,
      expectedLocation,
    }) => {
      renderHeader({ initialEntry, resolvedKeywordLabel });

      expect(
        (await screen.findByLabelText(/keyword/i)).getAttribute('value'),
      ).toBe(expectedKeyword);
      expect(
        (
          screen.getByRole('combobox', {
            name: /location/i,
          }) as HTMLInputElement
        ).value,
      ).toBe(expectedLocation);
    },
  );

  it('submits a newly selected Jobs location with the keyword', async () => {
    const router = renderHeader({
      initialEntry: '/jobs?q=engineer',
      locationSuggestions: [
        {
          id: 'place-sydney',
          slug: 'sydney',
          name: 'Sydney',
          contextLabel: 'Australia',
        },
      ],
    });
    const keyword = (await screen.findByLabelText(
      /keyword/i,
    )) as HTMLInputElement;
    const location = screen.getByRole('combobox', { name: /location/i });

    fireEvent.change(keyword, { target: { value: 'robotics' } });
    fireEvent.input(location, {
      target: { value: 'Syd' },
      inputType: 'insertText',
    });
    fireEvent.click(screen.getByRole('option', { name: /Sydney/ }));
    fireEvent.submit(keyword.closest('form') as HTMLFormElement);

    await waitFor(() =>
      expect(router.state.location.href).toBe(
        '/jobs/locations/sydney?q=robotics',
      ),
    );
  });

  it.each([
    {
      name: 'Jobs',
      initialEntry: '/jobs?q=platform',
      initialValue: 'platform',
      nextValue: 'robotics',
      expectedHref: '/jobs?q=robotics',
    },
    {
      name: 'Companies',
      initialEntry: '/companies?query=acme',
      initialValue: 'acme',
      nextValue: 'orbital',
      expectedHref: '/companies?query=orbital',
    },
    {
      name: 'Talent',
      initialEntry: '/talent?q=designer',
      initialValue: 'designer',
      nextValue: 'researcher',
      expectedHref: '/talent?q=researcher',
    },
    {
      name: 'Talent profile',
      initialEntry: '/p/ada-lovelace?q=designer',
      initialValue: 'designer',
      nextValue: 'researcher',
      expectedHref: '/talent?q=researcher',
    },
    {
      name: 'Blog',
      initialEntry: '/blog?q=design+systems',
      initialValue: 'design systems',
      nextValue: 'hiring',
      expectedHref: '/blog?q=hiring',
    },
  ])(
    'derives the $name search destination from the pathname and navigates only on submit',
    async ({ initialEntry, initialValue, nextValue, expectedHref }) => {
      const router = renderHeader({ initialEntry });
      const searchbox = (await screen.findByLabelText(
        /keyword/i,
      )) as HTMLInputElement;

      expect(searchbox.value).toBe(initialValue);

      fireEvent.change(searchbox, { target: { value: nextValue } });
      expect(router.state.location.href).toBe(initialEntry);

      fireEvent.submit(searchbox.closest('form') as HTMLFormElement);
      await waitFor(() =>
        expect(router.state.location.href).toBe(expectedHref),
      );
    },
  );

  it('uses Jobs search from the landing page and hands the query to /jobs', async () => {
    const router = renderHeader({ initialEntry: '/' });
    const searchbox = (await screen.findByLabelText(
      /keyword/i,
    )) as HTMLInputElement;

    fireEvent.change(searchbox, { target: { value: 'systems' } });
    expect(router.state.location.href).toBe('/');

    fireEvent.submit(searchbox.closest('form') as HTMLFormElement);
    await waitFor(() =>
      expect(router.state.location.href).toBe('/jobs?q=systems'),
    );
  });
});
