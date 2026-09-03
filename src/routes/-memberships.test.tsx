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
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createMembershipsLoader,
  MembershipsPageView,
  type MembershipsLoaderDependencies,
  type MembershipsPageData,
  type LoadMoreMembers,
} from './-memberships';

import type { MembershipRoster } from '@/server/membership-pages';
import type { Plan, PublicCompany } from '@cavuno/board';

const plan = {
  object: 'plan',
  id: 'plan-founding',
  name: 'Founding member',
  description: 'The founding tier.',
  purpose: 'membership',
  kind: 'subscription',
  billingInterval: 'year',
  billingIntervalCount: null,
  isRecommended: false,
  displayOrder: 1,
  pricingMode: 'priced',
  priceText: null,
  ctaText: null,
  ctaDestination: null,
  invoiceOnly: false,
  publishTiming: 'on_payment',
  netTermsDays: null,
  price: { currency: 'usd', amountCents: 120000, stripePriceId: 'price_found' },
  featureSummary: {
    durationDays: 30,
    maxActiveJobs: 0,
    featuredSlots: 0,
    featureSelectionMode: 'manual',
  },
  features: {
    'jobs.included_posts': {
      value: '3',
      name: 'Included posts',
      dataType: 'number',
    },
    'jobs.included_featured': {
      value: '1',
      name: 'Included featured',
      dataType: 'number',
    },
  },
} satisfies Plan;

function company(slug: string): PublicCompany {
  return {
    id: `company-${slug}`,
    object: 'public_company',
    name: slug,
    slug,
    website: null,
    logoUrl: null,
    summary: null,
    description: null,
    jobCount: 0,
    publishedJobCount: 0,
    salarySampleCount: 0,
    membership: { planId: plan.id, planName: 'Founding member' },
    links: { public: `https://jobs.example/companies/${slug}` },
  };
}

const roster: MembershipRoster = {
  planId: plan.id,
  count: 26,
  companies: [company('acme'), company('globex')],
};

const page: MembershipsPageData = {
  plans: [plan],
  rosters: [roster],
  seo: { boardName: 'Example Jobs', contactEmail: null },
  head: { meta: [{ title: 'Memberships' }], links: [] },
};

const loadMoreMembers = vi.fn<LoadMoreMembers>();

/**
 * The page renders typed `Link`s (Join, and every roster company card), so
 * every case mounts under a real router — the router seam is part of what the
 * page is.
 */
async function renderPage(
  props: React.ComponentProps<typeof MembershipsPageView>,
) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <MembershipsPageView {...props} />,
  });
  const children = [
    indexRoute,
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/auth/sign-in',
      component: () => <h1>Sign in</h1>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/employers/dashboard',
      component: () => <h1>Dashboard</h1>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/companies/$companySlug',
      component: () => <h1>Company</h1>,
    }),
  ];
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  const result = render(<RouterProvider router={router} />);
  // The router mounts asynchronously; wait for the page heading before
  // asserting anything about the page.
  await screen.findByRole('heading', { level: 1, name: 'Memberships' });
  return result;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('memberships loader', () => {
  it('returns the published plans and their rosters', async () => {
    const getMembershipsPage =
      vi.fn<MembershipsLoaderDependencies['getMembershipsPage']>();
    getMembershipsPage.mockResolvedValue(page);
    const onEmpty = vi.fn(() => {
      throw new Error('should not be called');
    });

    const data = await createMembershipsLoader(
      { getMembershipsPage },
      onEmpty,
    )();

    expect(data.plans).toHaveLength(1);
    expect(onEmpty).not.toHaveBeenCalled();
  });

  it('is not found on a board that publishes no membership plan', async () => {
    const getMembershipsPage =
      vi.fn<MembershipsLoaderDependencies['getMembershipsPage']>();
    getMembershipsPage.mockResolvedValue({
      ...page,
      plans: [],
      rosters: [],
      head: null,
    });
    const notFound = new Error('not found');
    const onEmpty = vi.fn(() => {
      throw notFound;
    });

    await expect(
      createMembershipsLoader({ getMembershipsPage }, onEmpty)(),
    ).rejects.toBe(notFound);
  });
});

describe('memberships page', () => {
  it('reads the plan capacity as one sentence beside its price', async () => {
    await renderPage({
      plans: [plan],
      rosters: [roster],
      seo: { boardName: 'Example Jobs' },
      viewer: { kind: 'anonymous' },
      loadMoreMembers: loadMoreMembers,
    });

    const card = screen.getByRole('region', { name: 'Founding member' });

    expect(
      within(card).getByText('3 one-time posts. 1 of them can be featured.'),
    ).toBeVisible();
  });

  it('sends a signed-out visitor to sign-in and back to memberships', async () => {
    await renderPage({
      plans: [plan],
      rosters: [roster],
      seo: { boardName: 'Example Jobs' },
      viewer: { kind: 'anonymous' },
      loadMoreMembers: loadMoreMembers,
    });

    expect(screen.getByRole('link', { name: 'Join' })).toHaveAttribute(
      'href',
      '/auth/sign-in?returnTo=%2Fmemberships',
    );
  });

  it('sends a signed-in viewer to the employer dashboard and says who grants a membership', async () => {
    await renderPage({
      plans: [plan],
      rosters: [roster],
      seo: { boardName: 'Example Jobs' },
      viewer: { kind: 'signed-in' },
      loadMoreMembers: loadMoreMembers,
    });

    expect(screen.getByRole('link', { name: 'Join' })).toHaveAttribute(
      'href',
      '/employers/dashboard',
    );
    expect(
      screen.getByText(
        'Memberships are granted by the board team. Open your employer dashboard to continue.',
      ),
    ).toBeVisible();
  });

  it('renders a quote-only membership as its CTA, never as a price', async () => {
    await renderPage({
      plans: [
        {
          ...plan,
          id: 'plan-partner',
          name: 'Partner',
          pricingMode: 'contact',
          priceText: 'Invitation only',
          ctaText: 'Request an invitation',
          ctaDestination: 'mailto:members@example.com',
        },
      ],
      rosters: [],
      seo: { boardName: 'Example Jobs' },
      viewer: { kind: 'anonymous' },
      loadMoreMembers: loadMoreMembers,
    });

    expect(screen.getByText('Invitation only')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Request an invitation' }),
    ).toHaveAttribute('href', 'mailto:members@example.com');
    expect(screen.queryByRole('link', { name: 'Join' })).toBeNull();
  });

  it('counts the members of the plan, not the board, and pages the roster', async () => {
    loadMoreMembers.mockResolvedValue({
      planId: plan.id,
      count: 26,
      companies: [company('initech')],
    });
    await renderPage({
      plans: [plan],
      rosters: [roster],
      seo: { boardName: 'Example Jobs' },
      viewer: { kind: 'anonymous' },
      loadMoreMembers: loadMoreMembers,
    });

    expect(screen.getByText('26 members')).toBeVisible();
    screen.getByRole('button', { name: 'Show more members' }).click();

    await waitFor(() =>
      expect(loadMoreMembers).toHaveBeenCalledWith({
        data: { planId: plan.id, offset: 2 },
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'initech' })).toBeVisible(),
    );
  });

  it('hides the roster block for a plan with no members', async () => {
    await renderPage({
      plans: [plan],
      rosters: [{ planId: plan.id, count: 0, companies: [] }],
      seo: { boardName: 'Example Jobs' },
      viewer: { kind: 'anonymous' },
      loadMoreMembers: loadMoreMembers,
    });

    expect(screen.queryByRole('heading', { name: 'Members' })).toBeNull();
  });
});
