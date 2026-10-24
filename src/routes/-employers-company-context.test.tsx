// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type EmployerSearch = { companyId?: string; sessionId?: string };
type MockRouteOptions = Parameters<
  ReturnType<typeof import('@tanstack/react-router').createFileRoute>
>[0];
const state = vi.hoisted(() => {
  const search: EmployerSearch = {};
  return {
    ...search,
    navigate: vi.fn(),
    invalidate: vi.fn(),
    refresh: vi.fn(),
    grant: vi.fn(),
    checkout: vi.fn(),
    claim: vi.fn(),
    upgrade: vi.fn(),
    portal: vi.fn(),
    noCompanies: false,
    companiesLoading: false,
  };
});
vi.mock('@tanstack/react-router', async (original) => {
  const actual = await original<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    createFileRoute: () => (options: MockRouteOptions) => ({
      options,
      useLoaderData: () => ({
        plans: [talentPlan],
        contactPlans: [],
        seo: { boardName: 'Example' },
      }),
      useSearch: () => ({
        companyId: state.companyId,
        session_id: state.sessionId,
      }),
      useNavigate: () => state.navigate,
    }),
    useRouter: () => ({ invalidate: state.invalidate }),
  };
});
vi.mock('@/components/root-session', () => ({
  useRootSession: () => ({
    user: { role: 'employer', emailVerified: true },
    ready: true,
    refreshSession: state.refresh,
    talentAccess: { ...grant, hasTalentAccess: true, companyId: null },
    employerCompanies: state.companiesLoading
      ? null
      : state.noCompanies
        ? []
        : [
            {
              status: 'approved',
              company: {
                id: 'company-a',
                name: 'Company A',
                slug: 'company-a',
              },
            },
            {
              status: 'approved',
              company: {
                id: 'company-b',
                name: 'Company B',
                slug: 'company-b',
              },
            },
            {
              status: 'pending',
              company: {
                id: 'pending',
                name: 'Pending company',
                slug: 'pending',
              },
            },
          ],
  }),
}));
vi.mock('@/server/talent-access', () => ({
  getTalentAccessGrant: state.grant,
  startTalentAccessCheckout: state.checkout,
  claimFreeTalentAccess: state.claim,
  upgradeTalentAccess: state.upgrade,
  openTalentBillingPortal: state.portal,
}));
vi.mock('@/server/marketing-pages', () => ({ getEmployersPage: vi.fn() }));
vi.mock('@/components/paywall/embedded-checkout', () => ({
  EmbeddedCheckout: () => <div data-testid="checkout" />,
}));
import { Route } from './employers.index';
const EmployersPage = Route.options.component!;

import { m } from '@/paraglide/messages';
import { renderRouted } from '@/test/render-routed';
import type { Plan, TalentAccess } from '@cavuno/board';

const talentPlan = {
  object: 'plan',
  id: 'plan-talent',
  name: 'Talent access — monthly',
  description: 'Reach candidates',
  purpose: 'talent_access',
  kind: 'subscription',
  billingInterval: 'month',
  isRecommended: true,
  displayOrder: 1,
  invoiceOnly: false,
  publishTiming: 'on_payment',
  netTermsDays: null,
  billingIntervalCount: null,
  pricingMode: 'priced',
  priceText: null,
  ctaText: null,
  ctaDestination: null,
  price: {
    currency: 'usd',
    amountCents: 4900,
    stripePriceId: 'price_talent',
  },
  featureSummary: {
    durationDays: 30,
    maxActiveJobs: 0,
    featuredSlots: 0,
    featureSelectionMode: 'manual',
  },
  features: {},
} satisfies Plan;

const grant = {
  object: 'talent_access',
  isEmployer: true,
  paywallActive: true,
  hasTalentAccess: false,
  hasUnlimitedUnlocks: false,
  hasUnlimitedMessages: false,
  accessModel: 'paid_unlocks_and_messaging',
  companyId: null,
  unlockCreditsRemaining: 0,
  messageCreditsRemaining: 0,
} satisfies TalentAccess;
const picker = () =>
  screen.getByRole('combobox', { name: m.talentUnlock_companyLabel() });
beforeEach(() => {
  vi.clearAllMocks();
  state.companyId = undefined;
  state.sessionId = undefined;
  state.noCompanies = false;
  state.companiesLoading = false;
  state.grant.mockImplementation(async ({ data }) => ({
    ...grant,
    companyId: data.companyId,
    hasTalentAccess: data.companyId === 'company-b',
  }));
  state.checkout.mockResolvedValue({
    ok: true,
    data: {
      sessionId: 'cs_test',
      clientSecret: 'test',
      publishableKey: 'pk_test',
      stripeAccountId: 'acct_test',
      offerType: 'recurring',
    },
  });
  state.upgrade.mockResolvedValue({
    ok: true,
    data: { object: 'talent_upgrade', ok: true },
  });
});
afterEach(cleanup);
describe('employer billing company context', () => {
  it('requires an approved selection instead of using another company’s aggregate access', async () => {
    await renderRouted(<EmployersPage />);
    expect(picker()).toHaveValue('');
    expect(
      screen.queryByRole('option', { name: 'Pending company' }),
    ).not.toBeInTheDocument();
    expect(state.grant).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: m.employerLanding_subscribeLabel() }),
    ).toBeDisabled();
    expect(
      screen.queryByRole('button', {
        name: m.employerLanding_manageBillingLabel(),
      }),
    ).not.toBeInTheDocument();
    fireEvent.change(picker(), { target: { value: 'company-b' } });
    expect(state.navigate).toHaveBeenCalledWith({
      search: { companyId: 'company-b' },
      resetScroll: false,
    });
  });
  it('checks out unpaid A and preserves A on the payment return', async () => {
    state.companyId = 'company-a';
    await renderRouted(<EmployersPage />);
    const subscribe = screen.getByRole('button', {
      name: m.employerLanding_subscribeLabel(),
    });
    await waitFor(() => expect(subscribe).toBeEnabled());
    fireEvent.click(subscribe);
    await waitFor(() =>
      expect(state.checkout).toHaveBeenCalledWith({
        data: {
          planId: talentPlan.id,
          companyId: 'company-a',
          returnPath: '/employers?companyId=company-a',
        },
      }),
    );
    expect(state.upgrade).not.toHaveBeenCalled();
    expect(state.grant).toHaveBeenCalledWith({
      data: { companyId: 'company-a' },
    });
  });
  it('upgrades paid B and opens B’s portal with B retained on return', async () => {
    state.companyId = 'company-b';
    state.portal.mockResolvedValue({
      ok: false,
      code: 'stripe_not_connected',
      message: '',
    });
    await renderRouted(<EmployersPage />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: m.employerLanding_upgradeLabel(),
      }),
    );
    await waitFor(() =>
      expect(state.upgrade).toHaveBeenCalledWith({
        data: { planId: talentPlan.id, companyId: 'company-b' },
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: m.employerLanding_manageBillingLabel(),
        }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: m.employerLanding_manageBillingLabel(),
      }),
    );
    await waitFor(() =>
      expect(state.portal).toHaveBeenCalledWith({
        data: {
          companySlug: 'company-b',
          returnPath: '/employers?companyId=company-b',
        },
      }),
    );
    expect(state.checkout).not.toHaveBeenCalled();
  });
  it('ignores a delayed A read after switching to B', async () => {
    let release!: (value: TalentAccess) => void;
    state.companyId = 'company-a';
    state.grant.mockImplementationOnce(
      () =>
        new Promise<TalentAccess>((resolve) => {
          release = resolve;
        }),
    );
    const view = await renderRouted(<EmployersPage />);
    await waitFor(() => expect(state.grant).toHaveBeenCalledOnce());
    state.companyId = 'company-b';
    view.rerender(<EmployersPage />);
    await screen.findByRole('button', {
      name: m.employerLanding_upgradeLabel(),
    });
    await act(async () => release({ ...grant, companyId: 'company-a' }));
    expect(picker()).toHaveValue('company-b');
    expect(
      screen.getByRole('button', { name: m.employerLanding_upgradeLabel() }),
    ).toBeEnabled();
    expect(
      screen.queryByRole('button', {
        name: m.employerLanding_subscribeLabel(),
      }),
    ).not.toBeInTheDocument();
  });
  it('offers a retry when the selected company’s grant fails to load', async () => {
    state.companyId = 'company-a';
    state.grant.mockRejectedValueOnce(new Error('network'));
    await renderRouted(<EmployersPage />);
    fireEvent.click(
      await screen.findByRole('button', { name: m.appError_retryAction() }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: m.employerLanding_subscribeLabel(),
        }),
      ).toBeEnabled(),
    );
    expect(state.grant).toHaveBeenCalledTimes(2);
  });
  it('keeps plan actions enabled for an employer with no approved company', async () => {
    state.noCompanies = true;
    await renderRouted(<EmployersPage />);
    expect(
      screen.getByRole('button', { name: m.employerLanding_subscribeLabel() }),
    ).toBeEnabled();
    expect(state.grant).not.toHaveBeenCalled();
  });
  it('waits for companies to load before enabling plan actions', async () => {
    state.companiesLoading = true;
    await renderRouted(<EmployersPage />);
    expect(
      screen.getByRole('button', { name: m.employerLanding_subscribeLabel() }),
    ).toBeDisabled();
  });
  it('does not silently replace a foreign or pending URL company', async () => {
    state.companyId = 'pending';
    await renderRouted(<EmployersPage />);
    expect(picker()).toHaveValue('');
    expect(state.grant).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: m.employerLanding_subscribeLabel() }),
    ).toBeDisabled();
  });
});
