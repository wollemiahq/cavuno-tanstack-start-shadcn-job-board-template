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
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Stripe.js stand-in: mounts nothing and hands the test Stripe's
// `onComplete`, the callback a card payment fires on the page.
type StripeCheckoutStub = { onComplete?: () => void };
const stripeCheckout = vi.hoisted(() => {
  const stub: StripeCheckoutStub = {};
  return stub;
});
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: () =>
    Promise.resolve({
      createEmbeddedCheckoutPage: (options: { onComplete?: () => void }) => {
        stripeCheckout.onComplete = options.onComplete;
        return Promise.resolve({ mount: () => {}, destroy: () => {} });
      },
    }),
}));

import { m } from '../../paraglide/messages';
import { MembershipPostGate } from './membership-post-gate';

import type {
  GetMembershipCheckoutState,
  StartMembershipCheckout,
} from './membership-plans';
import type { MembershipCheckoutSession, Plan } from '@cavuno/board';

afterEach(() => {
  cleanup();
  stripeCheckout.onComplete = undefined;
  vi.clearAllMocks();
});

const becomeMember = { name: m.postGate_becomeMemberLabel() };
const signIn = { name: m.postGate_signInLabel() };
const postAsCompany = { name: m.postGate_postAsCompanyLabel() };
// The email-free wording of the contact invite, for asserting its absence.
const contactInvite = m
  .postGate_contactText({ email: '\u0000' })
  .split('\u0000')
  .reduce((longest, part) => (part.length > longest.length ? part : longest))
  .trim();

type GateProps = React.ComponentProps<typeof MembershipPostGate>;

/** The gate renders typed `Link`s, so it mounts under a real router. */
async function renderGate(props: GateProps) {
  const rootRoute = createRootRoute();
  const children = [
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <MembershipPostGate {...props} />,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/memberships',
      component: () => <h1>Memberships</h1>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/auth/sign-in',
      component: () => <h1>Sign in</h1>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/employers',
      component: () => <h1>Employers</h1>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/employers/dashboard',
      component: () => <h1>Dashboard</h1>,
    }),
  ];
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  const result = render(<RouterProvider router={router} />);
  const firstPlan = props.offer?.plans[0];
  if (firstPlan) await screen.findByText(firstPlan.name);
  else await screen.findByRole('heading', { name: 'Example Jobs' });
  return result;
}

describe('MembershipPostGate', () => {
  it('offers a signed-out visitor both roads, returning to the gated surface', async () => {
    await renderGate({ boardName: 'Example Jobs', hasMembershipPage: true });

    expect(screen.getByRole('link', becomeMember)).toHaveAttribute(
      'href',
      '/memberships?returnTo=%2Fpost',
    );
    expect(screen.getByRole('link', signIn)).toHaveAttribute(
      'href',
      '/auth/sign-in?returnTo=%2Fpost',
    );
  });

  it('makes sign in the only road when the board publishes no membership plan', async () => {
    await renderGate({ boardName: 'Example Jobs' });

    expect(screen.queryByRole('link', becomeMember)).toBeNull();
    expect(screen.getByRole('link', signIn)).toHaveAttribute(
      'href',
      '/auth/sign-in?returnTo=%2Fpost',
    );
  });

  it('sends a signed-in viewer to their company dashboard, keeping the membership road', async () => {
    await renderGate({
      boardName: 'Example Jobs',
      signedIn: true,
      hasMembershipPage: true,
    });

    expect(screen.getByRole('link', postAsCompany)).toHaveAttribute(
      'href',
      '/employers/dashboard',
    );
    expect(screen.getByRole('link', becomeMember)).toBeVisible();
    expect(screen.queryByRole('link', signIn)).toBeNull();
  });

  it('hides the company-workspace road when the visitor is already there', async () => {
    await renderGate({
      boardName: 'Example Jobs',
      signedIn: true,
      hasMembershipPage: true,
      showCompanyWorkspaceLink: false,
    });

    expect(screen.queryByRole('link', postAsCompany)).toBeNull();
    expect(screen.getByRole('link', becomeMember)).toBeVisible();
  });

  it('joins for the company on its job form and comes back to that form', async () => {
    await renderGate({
      boardName: 'Example Jobs',
      signedIn: true,
      hasMembershipPage: true,
      showCompanyWorkspaceLink: false,
      companySlug: 'acme',
      returnTo: '/employers/companies/acme/jobs/new',
    });

    expect(screen.getByRole('link', becomeMember)).toHaveAttribute(
      'href',
      '/memberships?company=acme&returnTo=%2Femployers%2Fcompanies%2Facme%2Fjobs%2Fnew',
    );
  });

  it('hides become-a-member for a signed-in viewer when /memberships would 404', async () => {
    await renderGate({ boardName: 'Example Jobs', signedIn: true });

    expect(screen.getByRole('link', postAsCompany)).toHaveAttribute(
      'href',
      '/employers/dashboard',
    );
    expect(screen.queryByRole('link', becomeMember)).toBeNull();
    expect(screen.queryByRole('link', signIn)).toBeNull();
  });

  it('invites the visitor to email for access when the board publishes an address', async () => {
    await renderGate({
      boardName: 'Example Jobs',
      contactEmail: 'members@example.com',
    });

    expect(
      screen.getByText(
        m.postGate_contactText({ email: 'members@example.com' }),
      ),
    ).toBeVisible();
  });

  it('says nothing about email when the board publishes no address', async () => {
    await renderGate({ boardName: 'Example Jobs' });

    expect(
      screen.queryByText((content) => content.includes(contactInvite)),
    ).toBeNull();
  });

  describe('selling memberships in place of the form', () => {
    const partner = {
      object: 'plan',
      id: 'plan-partner',
      name: 'Partner',
      description: null,
      purpose: 'membership',
      kind: 'subscription',
      billingInterval: 'month',
      billingIntervalCount: null,
      isRecommended: true,
      displayOrder: 1,
      pricingMode: 'priced',
      priceText: null,
      ctaText: null,
      ctaDestination: null,
      invoiceOnly: false,
      publishTiming: 'on_payment',
      netTermsDays: null,
      price: { currency: 'usd', amountCents: 79500, stripePriceId: 'price_p' },
      featureSummary: {
        durationDays: 30,
        maxActiveJobs: 0,
        featuredSlots: 0,
        featureSelectionMode: 'manual',
      },
      features: {},
    } satisfies Plan;
    const supporter = {
      ...partner,
      id: 'plan-supporter',
      name: 'Supporter',
      isRecommended: false,
      displayOrder: 2,
    } satisfies Plan;
    const kit = {
      object: 'checkout_session',
      sessionId: 'cs_member',
      clientSecret: 'secret',
      stripeAccountId: 'acct_1',
      publishableKey: 'pk_test',
      offerType: 'recurring',
    } satisfies MembershipCheckoutSession;
    const join = { name: m.memberships_joinLabel() };

    it('shows every membership a signed-out visitor can join, each through sign-in back to /post', async () => {
      await renderGate({
        boardName: 'Example Jobs',
        hasMembershipPage: true,
        offer: {
          plans: [partner, supporter],
          viewer: { kind: 'anonymous' },
        },
      });

      expect(screen.getByText('Partner')).toBeVisible();
      expect(screen.getByText('Supporter')).toBeVisible();
      const joins = screen.getAllByRole('link', join);
      expect(joins).toHaveLength(2);
      for (const link of joins) {
        expect(link).toHaveAttribute('href', '/auth/sign-in?returnTo=%2Fpost');
      }
      // The plans are the offer: no detour to /memberships.
      expect(screen.queryByRole('link', becomeMember)).toBeNull();
      expect(screen.getByRole('link', signIn)).toHaveAttribute(
        'href',
        '/auth/sign-in?returnTo=%2Fpost',
      );
    });

    it('buys a membership for the company on its job form and re-reads the page once it is active', async () => {
      const startCheckoutAction = vi.fn<StartMembershipCheckout>();
      const getCheckoutStateAction = vi.fn<GetMembershipCheckoutState>();
      const invalidate = vi.fn().mockResolvedValue(undefined);
      startCheckoutAction.mockResolvedValue({ ok: true, data: kit });
      getCheckoutStateAction.mockResolvedValue({
        object: 'checkout_session_state',
        status: 'complete',
        paymentStatus: 'paid',
        membershipActive: true,
        clientSecret: null,
      });
      await renderGate({
        boardName: 'Example Jobs',
        signedIn: true,
        showCompanyWorkspaceLink: false,
        companySlug: 'acme',
        returnTo: '/employers/companies/acme/jobs/new',
        offer: {
          plans: [partner],
          viewer: {
            kind: 'signed-in',
            companies: [
              { slug: 'globex', name: 'Globex' },
              { slug: 'acme', name: 'Acme' },
            ],
          },
          startCheckoutAction,
          getCheckoutStateAction,
          invalidate,
        },
      });

      fireEvent.click(screen.getByRole('button', join));

      // For the company whose form this is, not the viewer's first company;
      // a payment that has to redirect comes back through /memberships to
      // this form.
      expect(startCheckoutAction).toHaveBeenCalledWith({
        data: {
          companySlug: 'acme',
          planId: 'plan-partner',
          returnPath:
            '/memberships?company=acme&returnTo=%2Femployers%2Fcompanies%2Facme%2Fjobs%2Fnew',
        },
      });
      await waitFor(() => expect(stripeCheckout.onComplete).toBeDefined());
      act(() => stripeCheckout.onComplete?.());

      await waitFor(
        () =>
          expect(getCheckoutStateAction).toHaveBeenCalledWith({
            data: { companySlug: 'acme', sessionId: kit.sessionId },
          }),
        { timeout: 3000 },
      );
      // Re-reading the page is what swaps the gate for the job form.
      await waitFor(() => expect(invalidate).toHaveBeenCalled());
    });
  });
});
