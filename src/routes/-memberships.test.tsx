// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { useEffect, useState } from 'react';

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
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MembershipsPageView,
  type MembershipsViewer,
  type GetMembershipCheckoutState,
  type LoadMoreMembers,
  type StartMembershipCheckout,
} from './-memberships';
import {
  createMembershipsLoader,
  type MembershipsLoaderDependencies,
  type MembershipsPageData,
} from './-memberships-loader';

import type { MembershipRoster } from '@/server/membership-pages';
import type {
  MembershipCheckoutSession,
  Plan,
  PublicCompany,
} from '@cavuno/board';

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

/** The board team assigns a free membership; nothing to buy. */
const freePlan = {
  ...plan,
  id: 'plan-free',
  name: 'Community member',
  kind: 'free',
  price: null,
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
const startCheckoutAction = vi.fn<StartMembershipCheckout>();
const getCheckoutStateAction = vi.fn<GetMembershipCheckoutState>();
const acme = { slug: 'acme', name: 'Acme' };
const kit = {
  object: 'checkout_session',
  sessionId: 'cs_member',
  clientSecret: 'secret',
  stripeAccountId: 'acct_1',
  publishableKey: 'pk_test',
  offerType: 'recurring',
} satisfies MembershipCheckoutSession;

/**
 * The page renders typed `Link`s (Join, and every roster company card), so
 * every case mounts under a real router — the router seam is part of what the
 * page is.
 */
async function renderPage(
  props: React.ComponentProps<typeof MembershipsPageView>,
  { waitForHeading = true }: { waitForHeading?: boolean } = {},
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
  if (waitForHeading) {
    await screen.findByRole('heading', { level: 1, name: 'Memberships' });
  }
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

  it('sends a signed-in viewer with no approved company to the dashboard to connect one', async () => {
    await renderPage({
      plans: [plan],
      rosters: [roster],
      seo: { boardName: 'Example Jobs' },
      viewer: { kind: 'signed-in', companies: [] },
      loadMoreMembers: loadMoreMembers,
    });

    expect(screen.getByRole('link', { name: 'Join' })).toHaveAttribute(
      'href',
      '/employers/dashboard',
    );
    expect(
      screen.getByText(
        'Connect an approved company first. Open your employer dashboard to add one.',
      ),
    ).toBeVisible();
  });

  it('keeps the dashboard link for a free plan, which the board team assigns', async () => {
    await renderPage({
      plans: [freePlan],
      rosters: [roster],
      seo: { boardName: 'Example Jobs' },
      viewer: { kind: 'signed-in', companies: [acme] },
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

  it('starts checkout for the approved company and mounts the embedded form', async () => {
    startCheckoutAction.mockResolvedValue({ ok: true, data: kit });
    await renderPage({
      plans: [plan],
      rosters: [roster],
      seo: { boardName: 'Example Jobs' },
      viewer: { kind: 'signed-in', companies: [acme] },
      loadMoreMembers: loadMoreMembers,
      startCheckoutAction,
    });

    // One company: no picker, the button buys for it directly.
    expect(screen.queryByLabelText('Buy for')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));

    await waitFor(() => {
      expect(startCheckoutAction).toHaveBeenCalledWith({
        data: {
          companySlug: 'acme',
          planId: plan.id,
          returnPath: '/memberships?company=acme',
        },
      });
    });
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Complete your purchase',
      }),
    ).toBeVisible();
    expect(screen.getByTestId('paywall-embedded-checkout')).toBeInTheDocument();
  });

  /**
   * The session hydrates AFTER mount, so the page's first render is anonymous
   * and only later becomes signed-in. Seeding the selected company with
   * `useState` captured that first, empty value and never re-ran, so
   * `disabled={!companySlug}` stuck on — and with exactly one company there is
   * no <select> to set it either. A single-company employer could therefore
   * never buy a membership (found on the live gate, 2026-09-05).
   *
   * Every other case in this file passes a signed-in viewer from mount, which
   * is why none of them caught it — the transition is the bug.
   */
  it('enables Join for one company when the session hydrates after mount', async () => {
    function HydratingPage() {
      const [viewer, setViewer] = useState<MembershipsViewer>({
        kind: 'anonymous',
      });
      useEffect(() => {
        setViewer({ kind: 'signed-in', companies: [acme] });
      }, []);
      return (
        <MembershipsPageView
          plans={[plan]}
          rosters={[roster]}
          seo={{ boardName: 'Example Jobs' }}
          viewer={viewer}
          loadMoreMembers={loadMoreMembers}
        />
      );
    }

    const rootRoute = createRootRoute();
    const router = createRouter({
      routeTree: rootRoute.addChildren([
        createRoute({
          getParentRoute: () => rootRoute,
          path: '/',
          component: () => <HydratingPage />,
        }),
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
      ]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { level: 1, name: 'Memberships' });

    const join = await screen.findByRole('button', { name: 'Join' });
    expect(join).toBeEnabled();
  });

  it('lets a viewer who manages several companies choose which one joins', async () => {
    startCheckoutAction.mockResolvedValue({ ok: true, data: kit });
    await renderPage({
      plans: [plan],
      rosters: [roster],
      seo: { boardName: 'Example Jobs' },
      viewer: {
        kind: 'signed-in',
        companies: [acme, { slug: 'globex', name: 'Globex' }],
      },
      loadMoreMembers: loadMoreMembers,
      startCheckoutAction,
    });

    fireEvent.change(screen.getByLabelText('Buy for'), {
      target: { value: 'globex' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));

    await waitFor(() => {
      expect(startCheckoutAction).toHaveBeenCalledWith({
        data: expect.objectContaining({ companySlug: 'globex' }),
      });
    });
  });

  it('shows the API refusal when the company already holds a membership', async () => {
    startCheckoutAction.mockResolvedValue({
      ok: false,
      code: 'membership_seat_taken',
      message: 'This company already has a membership.',
    });
    await renderPage({
      plans: [plan],
      rosters: [roster],
      seo: { boardName: 'Example Jobs' },
      viewer: { kind: 'signed-in', companies: [acme] },
      loadMoreMembers: loadMoreMembers,
      startCheckoutAction,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Join' }));

    expect(
      await screen.findByText(
        'This company already has a membership, or has one awaiting payment.',
      ),
    ).toHaveAttribute('role', 'alert');
    expect(screen.queryByTestId('paywall-embedded-checkout')).toBeNull();
  });

  it('polls the returned session and confirms the membership once complete', async () => {
    getCheckoutStateAction.mockResolvedValue({
      object: 'checkout_session_state',
      status: 'complete',
      clientSecret: null,
    });
    const invalidate = vi.fn().mockResolvedValue(undefined);
    await renderPage(
      {
        plans: [plan],
        rosters: [roster],
        seo: { boardName: 'Example Jobs' },
        viewer: { kind: 'signed-in', companies: [acme] },
        loadMoreMembers: loadMoreMembers,
        getCheckoutStateAction,
        invalidate,
        returning: { sessionId: 'cs_1', companySlug: 'acme' },
      },
      { waitForHeading: false },
    );

    expect(await screen.findByText('Confirming your purchase…')).toBeVisible();
    await waitFor(() => {
      expect(getCheckoutStateAction).toHaveBeenCalledWith({
        data: { companySlug: 'acme', sessionId: 'cs_1' },
      });
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your membership is active.',
    );
    expect(invalidate).toHaveBeenCalled();
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
