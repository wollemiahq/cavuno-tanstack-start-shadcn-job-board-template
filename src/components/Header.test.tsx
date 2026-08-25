// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
/**
 * Public-header behavior.
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

import {
  resolveHeaderSearchState,
  type HeaderSearchSubmission,
} from '../lib/header-search';
import { resolveSubscriptionEntryVisible } from '../lib/subscription-entry';
import { m } from '../paraglide/messages';
import Header from './Header';

afterEach(cleanup);

type HeaderFeatures = Omit<
  React.ComponentProps<typeof Header>['features'],
  'talentDirectory'
> & {
  blog: boolean;
  talentDirectory: boolean;
};

const allFeatures: HeaderFeatures = {
  candidates: true,
  employers: true,
  publicJobSubmission: true,
  blog: true,
  talentDirectory: true,
  nativeApplications: true,
};

function findAccountButton() {
  return screen.findByRole(
    'button',
    { name: m.siteHeader_accountLabel() },
    { timeout: 10_000 },
  );
}

type TalentDirectoryVisibility = 'off' | 'public' | 'employers_only' | null;

function renderHeader({
  initialEntry = '/',
  features = allFeatures,
  talentDirectoryVisibility = features.talentDirectory ? 'public' : 'off',
  user = null,
  hasAccessGrant = false,
  logoUrl = null,
  locationSuggestions = [],
  keywordSuggestions = [],
  companyMarketSuggestions = [],
  resolvedKeywordLabel,
  jobRecommendationsEnabled = true,
}: {
  initialEntry?: string;
  features?: HeaderFeatures;
  talentDirectoryVisibility?: TalentDirectoryVisibility;
  user?: React.ComponentProps<typeof Header>['user'];
  hasAccessGrant?: boolean;
  logoUrl?: string | null;
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
  jobRecommendationsEnabled?: boolean;
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
          <Header
            boardName="Robotics Jobs"
            logoUrl={logoUrl}
            user={user}
            language="en"
            features={{ ...features, jobRecommendationsEnabled }}
            hasAccessGrant={hasAccessGrant}
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
              blogSuggestions: {
                suggestions: [],
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

function submitContainingForm(control: HTMLElement) {
  const form = control.closest('form');
  if (!form) throw new Error('Expected the search control to belong to a form');
  fireEvent.submit(form);
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

    expect(
      await screen.findByRole('link', { name: m.nav_home() }),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: m.nav_companies() })).toBeTruthy();
    expect(screen.queryByRole('link', { name: m.nav_blog() })).toBeNull();
    expect(screen.queryByRole('link', { name: m.nav_talent() })).toBeNull();
  });

  it('links Blog and Talent to their collection pages when enabled', async () => {
    renderHeader();

    expect(
      (await screen.findByRole('link', { name: m.nav_blog() })).getAttribute(
        'href',
      ),
    ).toBe('/blog');
    expect(
      screen.getByRole('link', { name: m.nav_talent() }).getAttribute('href'),
    ).toBe('/talent');
  });

  it('keeps Talent navigation and contextual search available for an employer-only directory', async () => {
    renderHeader({
      initialEntry: '/talent',
      features: { ...allFeatures, talentDirectory: false },
      talentDirectoryVisibility: 'employers_only',
    });

    expect(
      (await screen.findByRole('link', { name: m.nav_talent() })).getAttribute(
        'href',
      ),
    ).toBe('/talent');
    expect(screen.getByLabelText(/keyword/i)).toHaveAttribute(
      'placeholder',
      m.talentDirectory_searchPlaceholder(),
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

    await screen.findByRole('link', { name: m.nav_home() });
    expect(
      screen.queryByRole('link', { name: m.siteHeader_signInLabel() }),
    ).toBeNull();
    expect(
      screen.queryByRole('link', { name: m.siteHeader_signUpLabel() }),
    ).toBeNull();
    expect(
      screen.queryByRole('link', { name: m.siteHeader_postJobLabel() }),
    ).toBeNull();
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
        (
          await screen.findByRole('link', { name: m.siteHeader_signUpLabel() })
        ).getAttribute('href'),
      ).toBe(href);
      expect(
        screen
          .getByRole('link', { name: m.siteHeader_signInLabel() })
          .getAttribute('href'),
      ).toBe('/auth/sign-in?returnTo=%2Faccount');
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
      (
        await screen.findByRole('link', { name: m.siteHeader_postJobLabel() })
      ).getAttribute('href'),
    ).toBe('/post');
    expect(
      screen.queryByRole('link', { name: m.siteHeader_signInLabel() }),
    ).toBeNull();
    expect(
      screen.queryByRole('link', { name: m.siteHeader_signUpLabel() }),
    ).toBeNull();
  });
});

describe('Header — native-applications account gating', () => {
  const signedInUser = {
    id: 'user-1',
    object: 'board_user',
    role: 'candidate',
    email: 'ada@example.com',
    displayName: 'Ada Lovelace',
    emailVerified: true,
    hasPassword: true,
  } as const;

  it('shows the Applications account entry when native applications are on', async () => {
    renderHeader({ user: signedInUser });

    fireEvent.click(await findAccountButton());

    expect(
      await screen.findByRole('menuitem', {
        name: m.accountShell_applicationsNav(),
      }),
    ).toBeTruthy();
  });

  it('lists recommended jobs above saved jobs', async () => {
    renderHeader({ user: signedInUser });

    fireEvent.click(await findAccountButton());

    const recommended = await screen.findByRole('menuitem', {
      name: m.accountShell_recommendedJobsNav(),
    });
    expect(recommended).toHaveAttribute('href', '/matches');
    const saved = await screen.findByRole('menuitem', {
      name: m.accountShell_savedJobsNav(),
    });
    expect(saved).toHaveAttribute('href', '/saved-jobs');
  });

  it('hides recommended jobs when the board turns recommendations off', async () => {
    renderHeader({
      user: signedInUser,
      jobRecommendationsEnabled: false,
    });

    fireEvent.click(await findAccountButton());

    expect(
      await screen.findByRole('menuitem', {
        name: m.accountShell_savedJobsNav(),
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('menuitem', {
        name: m.accountShell_recommendedJobsNav(),
      }),
    ).toBeNull();
  });

  it('hides the Applications account entry when native applications are off', async () => {
    renderHeader({
      user: signedInUser,
      features: { ...allFeatures, nativeApplications: false },
    });

    fireEvent.click(await findAccountButton());

    // The menu is open (a sibling item resolves) but Applications is absent.
    expect(
      await screen.findByRole('menuitem', {
        name: m.accountShell_savedJobsNav(),
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('menuitem', {
        name: m.accountShell_applicationsNav(),
      }),
    ).toBeNull();
  });
});

describe('Header — subscription entry gating', () => {
  const signedInUser = {
    id: 'user-1',
    object: 'board_user',
    role: 'candidate',
    email: 'ada@example.com',
    displayName: 'Ada Lovelace',
    emailVerified: true,
    hasPassword: true,
  } as const;

  it('shows the Subscription account entry when the viewer holds an active grant', async () => {
    renderHeader({ user: signedInUser, hasAccessGrant: true });

    fireEvent.click(await findAccountButton());

    const subscription = await screen.findByRole('menuitem', {
      name: m.accountShell_subscriptionNav(),
    });
    expect(subscription).toHaveAttribute('href', '/account/access');
  });

  it('hides the Subscription account entry for a signed-in viewer without a grant', async () => {
    // A non-subscriber reaches the paywall via the gated-listing teaser, not
    // this menu — the account entry would advertise a page of no use to them.
    renderHeader({ user: signedInUser, hasAccessGrant: false });

    fireEvent.click(await findAccountButton());

    // The menu is open (a sibling item resolves) but Subscription is absent.
    expect(
      await screen.findByRole('menuitem', {
        name: m.accountShell_savedJobsNav(),
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('menuitem', {
        name: m.accountShell_subscriptionNav(),
      }),
    ).toBeNull();
  });

  it('gates the loader flag on the candidate-paywall feature so a paywall-off board never shows it', () => {
    // The Header receives a single resolved boolean; the "paywall off ⇒ hidden"
    // half of the contract lives in the root loader's derivation. Pin the
    // behavior of that pure gate (used by __root) rather than its source text:
    // a paywall-off board discards the grant, so even a grant-holder is hidden.
    expect(resolveSubscriptionEntryVisible(false, true)).toBe(false);
    expect(resolveSubscriptionEntryVisible(false, false)).toBe(false);
    expect(resolveSubscriptionEntryVisible(true, false)).toBe(false);
    // Only a paywall board with an actual grant surfaces the entry.
    expect(resolveSubscriptionEntryVisible(true, true)).toBe(true);
  });
});

describe('Header — mobile navigation disclosure', () => {
  it('opens a named non-modal panel and restores focus to the trigger on Escape', async () => {
    renderHeader();

    const toggle = await screen.findByRole('button', {
      name: /navigation menu/i,
    });

    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.focus();
    fireEvent.click(toggle);

    const dialog = await screen.findByRole('dialog', {
      name: m.siteHeader_primaryNavigationAriaLabel(),
    });
    // Non-modal by design: the panel opens BELOW the live header, so the
    // header (toggle included) must stay accessible — never aria-hidden.
    expect(toggle.closest('[aria-hidden="true"]')).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(document.activeElement ?? dialog, { key: 'Escape' });

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', {
          name: m.siteHeader_primaryNavigationAriaLabel(),
        }),
      ).toBeNull(),
    );
    expect(toggle).toHaveFocus();
  });

  it('opens a nav-only panel below the real header — no duplicated chrome', async () => {
    renderHeader();

    const toggle = await screen.findByRole('button', {
      name: /navigation menu/i,
    });
    fireEvent.click(toggle);

    const mobileMenu = await screen.findByRole('dialog', {
      name: m.siteHeader_primaryNavigationAriaLabel(),
    });

    // The panel carries navigation only. The REAL header above it keeps the
    // single search input and the auth actions — the old design re-rendered
    // both inside the overlay, which swapped the user's typed query for an
    // empty twin input.
    expect(
      within(mobileMenu).getByRole('link', {
        name: m.siteHeader_postJobLabel(),
      }),
    ).toHaveAttribute('href', '/post');
    expect(mobileMenu.querySelector('form[role="search"]')).toBeNull();
    expect(mobileMenu.querySelector('[data-test="header-actions"]')).toBeNull();

    // Exactly one search form in the document while the menu is open.
    expect(document.querySelectorAll('form[role="search"]')).toHaveLength(1);
    const header = document.querySelector('header');
    if (!header) throw new Error('Expected header');
    const signIn = within(header).getByRole('link', {
      name: m.siteHeader_signInLabel(),
    });
    expect(signIn).toHaveAttribute('href', '/auth/sign-in?returnTo=%2Faccount');
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
      name: m.siteHeader_primaryNavigationAriaLabel(),
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
      screen.queryByRole('combobox', {
        name: m.siteHeader_searchTypeAriaLabel(),
      }),
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

  it('home link keeps discernible text when the logo compresses the wordmark (logo + search)', async () => {
    // Lighthouse "Links must have discernible text": with a logo and the
    // search bar, the wordmark is clipped for layout — it must stay in the
    // accessibility tree (sr-only), not display:none.
    renderHeader({ logoUrl: 'https://cdn.example/logo.png' });

    await screen.findByRole('search');
    const home = screen.getByRole('link', { name: 'Robotics Jobs' });
    expect(home).toHaveAttribute('href', '/');
    // Logo is decorative; the board name is the accessible name.
    expect(home.querySelector('img')).toHaveAttribute('alt', '');
    expect(home.textContent).toContain('Robotics Jobs');
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
    submitContainingForm(keyword);
    await waitFor(() =>
      expect(router.state.location.href).toBe('/jobs/skills/robotics'),
    );
  });

  it('gives the keyword field the same inline clear affordance as location', async () => {
    renderHeader({ initialEntry: '/jobs?q=robotics' });

    const keyword = await screen.findByLabelText<HTMLInputElement>(/keyword/i);
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));

    expect(keyword.value).toBe('');
    expect(keyword).toHaveFocus();
  });

  it('preserves an active place and submits keyword plus location together', async () => {
    const router = renderHeader({
      initialEntry: '/jobs/locations/sydney?q=engineer',
    });
    const keyword = await screen.findByLabelText<HTMLInputElement>(/keyword/i);
    const location = screen.getByRole<HTMLInputElement>('combobox', {
      name: /location/i,
    });

    expect(location.value).toBe('Sydney');
    fireEvent.change(keyword, { target: { value: 'robotics' } });
    submitContainingForm(keyword);

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
        screen.getByRole<HTMLInputElement>('combobox', {
          name: /location/i,
        }).value,
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
    const keyword = await screen.findByLabelText<HTMLInputElement>(/keyword/i);
    const location = screen.getByRole('combobox', { name: /location/i });

    fireEvent.change(keyword, { target: { value: 'robotics' } });
    fireEvent.input(location, {
      target: { value: 'Syd' },
      inputType: 'insertText',
    });
    fireEvent.click(screen.getByRole('option', { name: /Sydney/ }));
    submitContainingForm(keyword);

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
      const searchbox =
        await screen.findByLabelText<HTMLInputElement>(/keyword/i);

      expect(searchbox.value).toBe(initialValue);

      fireEvent.change(searchbox, { target: { value: nextValue } });
      expect(router.state.location.href).toBe(initialEntry);

      submitContainingForm(searchbox);
      await waitFor(() =>
        expect(router.state.location.href).toBe(expectedHref),
      );
    },
  );

  it('uses Jobs search from the landing page and hands the query to /jobs', async () => {
    const router = renderHeader({ initialEntry: '/' });
    const searchbox =
      await screen.findByLabelText<HTMLInputElement>(/keyword/i);

    fireEvent.change(searchbox, { target: { value: 'systems' } });
    expect(router.state.location.href).toBe('/');

    submitContainingForm(searchbox);
    await waitFor(() =>
      expect(router.state.location.href).toBe('/jobs?q=systems'),
    );
  });
});
