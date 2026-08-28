// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { isRedirect } from '@tanstack/react-router';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createEmployerDashboardLoader,
  EmployerDashboardView,
  type EmployerDashboardLoaderDependencies,
  type EmployerDashboardViewDependencies,
} from './-employers.dashboard';
import {
  EmployersPageView,
  type EmployersPageViewDependencies,
} from './-employers.index';
import {
  createEmployerOnboardingLoader,
  EmployerOnboardingPageView,
  type EmployerOnboardingLoaderDependencies,
  type EmployerOnboardingViewDependencies,
} from './-employers.onboarding';
import {
  Route as DashboardRoute,
  validateEmployerDashboardSearch,
} from './employers.dashboard';
import { Route as OnboardingRoute } from './employers.onboarding.$slug';

import type { CompanyMembership, Plan } from '@cavuno/board';

const listCompanies =
  vi.fn<EmployerDashboardLoaderDependencies['listCompanies']>();
const getSeoBase = vi.fn<EmployerDashboardLoaderDependencies['getSeoBase']>();
const refreshSession =
  vi.fn<EmployerDashboardLoaderDependencies['refreshSession']>();
const searchCompanies =
  vi.fn<EmployerDashboardViewDependencies['searchCompanies']>();
const claimCompany = vi.fn<EmployerDashboardViewDependencies['claimCompany']>();
const createCompany =
  vi.fn<EmployerDashboardViewDependencies['createCompany']>();
const sendWorkEmail =
  vi.fn<EmployerOnboardingViewDependencies['sendWorkEmail']>();
const cancelClaim = vi.fn<EmployerOnboardingViewDependencies['cancelClaim']>();
const invalidate = vi.fn<() => Promise<void>>();
const navigateToOnboarding = vi.fn<(slug: string) => Promise<void>>();
const navigateToDashboard = vi.fn<() => Promise<void>>();
const showActionError = vi.fn<(message: string) => Promise<void>>();

const dashboardLoader = createEmployerDashboardLoader({
  listCompanies,
  getSeoBase,
  refreshSession,
});
const onboardingLoader = createEmployerOnboardingLoader({
  listCompanies,
  getSeoBase,
  refreshSession,
} satisfies EmployerOnboardingLoaderDependencies);

const dashboardViewDependencies = {
  searchCompanies,
  claimCompany,
  createCompany,
  invalidate,
  navigateToOnboarding,
  companyRouteElement: ({ approved, slug }) => (
    <a
      href={
        approved
          ? `/employers/companies/${slug}`
          : `/employers/onboarding/${slug}`
      }
    />
  ),
} satisfies EmployerDashboardViewDependencies;

const onboardingViewDependencies = {
  sendWorkEmail,
  cancelClaim,
  invalidate,
  navigateToDashboard,
  showActionError,
} satisfies EmployerOnboardingViewDependencies;

const employersPageViewDependencies = {
  postingPlanLink: ({ planId, className, children }) => (
    <a href={`/post?plan=${planId}`} className={className}>
      {children}
    </a>
  ),
  joinLink: ({ className, children }) => (
    <a href="/auth/join?returnTo=/employers" className={className}>
      {children}
    </a>
  ),
} satisfies EmployersPageViewDependencies;

const plan = {
  object: 'plan',
  id: 'plan-growth',
  name: 'Growth',
  description: 'For growing hiring teams',
  purpose: 'job_posting',
  kind: 'subscription',
  billingInterval: 'month',
  isRecommended: true,
  displayOrder: 1,
  invoiceOnly: false,
  publishTiming: 'on_payment',
  netTermsDays: null,
  price: { currency: 'usd', amountCents: 9900, stripePriceId: 'price_growth' },
  featureSummary: {
    durationDays: 30,
    maxActiveJobs: 5,
    featuredSlots: 1,
    featureSelectionMode: 'manual',
  },
} satisfies Plan;

const membership = {
  id: 'membership-acme',
  object: 'company_membership',
  status: 'approved',
  role: 'owner',
  workEmail: 'owner@acme.test',
  workEmailVerifiedAt: '2026-07-14T00:00:00.000Z',
  company: {
    id: 'company-acme',
    name: 'Acme Ventures',
    slug: 'acme-ventures',
    website: 'acme.test',
    logoUrl: null,
  },
} satisfies CompanyMembership;

function dashboardLoaderContext() {
  const pathname = '/employers/dashboard';
  return {
    abortController: new AbortController(),
    preload: false,
    params: {},
    deps: {},
    context: { origin: 'https://jobs.example.test' },
    location: {
      href: pathname,
      pathname,
      search: {},
      searchStr: '',
      state: { __TSR_index: 0 },
      hash: '',
      publicHref: pathname,
      external: false,
    },
    navigate: vi.fn(),
    parentMatchPromise: new Promise<never>(() => undefined),
    cause: 'enter' as const,
    route: DashboardRoute,
  };
}

function onboardingLoaderContext() {
  const pathname = '/employers/onboarding/acme-ventures';
  return {
    ...dashboardLoaderContext(),
    params: { slug: 'acme-ventures' },
    location: {
      ...dashboardLoaderContext().location,
      href: pathname,
      pathname,
      publicHref: pathname,
    },
    route: OnboardingRoute,
  };
}

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  getSeoBase.mockResolvedValue({
    boardName: 'Acme',
    language: 'en',
    origin: 'https://jobs.example.test',
  });
  refreshSession.mockResolvedValue({ ok: false });
  invalidate.mockResolvedValue(undefined);
  navigateToOnboarding.mockResolvedValue(undefined);
  navigateToDashboard.mockResolvedValue(undefined);
  showActionError.mockResolvedValue(undefined);
});

describe('employer entry surfaces', () => {
  it('returns signed-out employers to the dashboard they originally requested', async () => {
    listCompanies.mockRejectedValue(new Error('UNAUTHENTICATED'));

    let result: unknown;
    try {
      result = await dashboardLoader(dashboardLoaderContext());
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options).toMatchObject({
      to: '/auth/sign-in',
      search: { returnTo: '/employers/dashboard' },
    });
  });

  it('does not disguise a non-authentication employer failure as signed out', async () => {
    listCompanies.mockRejectedValue(new Error('UPSTREAM_TIMEOUT'));

    await expect(dashboardLoader(dashboardLoaderContext())).rejects.toThrow(
      'UPSTREAM_TIMEOUT',
    );
  });

  it('sends an unverified employer back through verification for the dashboard', async () => {
    listCompanies.mockRejectedValue(new Error('EMAIL_UNVERIFIED'));

    let result: unknown;
    try {
      await dashboardLoader(dashboardLoaderContext());
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options).toMatchObject({
      to: '/auth/verify-email-required',
      search: { returnTo: '/employers/dashboard' },
    });
  });

  it('preserves the pending company path across employer sign-in', async () => {
    listCompanies.mockRejectedValue(new Error('UNAUTHENTICATED'));

    let result: unknown;
    try {
      result = await onboardingLoader(onboardingLoaderContext());
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options).toMatchObject({
      to: '/auth/sign-in',
      search: { returnTo: '/employers/onboarding/acme-ventures' },
    });
  });

  it('sends a self-service employer offer into the matching public posting plan', () => {
    render(
      <EmployersPageView
        plans={[plan]}
        salesLed={[]}
        seo={{ boardName: 'Example Jobs' }}
        dependencies={employersPageViewDependencies}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'For employers' }),
    ).toBeVisible();
    const growthCard = screen.getByText('Growth').closest('[data-slot="card"]');
    if (!(growthCard instanceof HTMLElement)) {
      throw new Error('The Growth plan must render in a card');
    }
    expect(within(growthCard).getByText('Recommended')).toBeVisible();
    // A job-posting plan's action posts a job — it is not a subscription.
    expect(
      within(growthCard).getByRole('link', { name: 'Post a job' }),
    ).toHaveAttribute('href', '/post?plan=plan-growth');
  });

  it('does not send a talent-access subscription into the job-posting form', () => {
    render(
      <EmployersPageView
        plans={[
          {
            ...plan,
            id: 'plan-talent',
            name: 'Talent access',
            purpose: 'talent_access',
          },
        ]}
        salesLed={[]}
        seo={{ boardName: 'Example Jobs' }}
        dependencies={employersPageViewDependencies}
      />,
    );

    const talentCard = screen
      .getAllByText('Talent access')
      .map((element) => element.closest('[data-slot="card"]'))
      .find((element) => element !== null);
    if (!(talentCard instanceof HTMLElement)) {
      throw new Error('The Talent access plan must render in a card');
    }
    expect(
      within(talentCard).getByRole('link', {
        name: 'Subscribe',
      }),
    ).toHaveAttribute('href', '/auth/join?returnTo=/employers');
  });

  it('presents approved memberships as an authenticated company workspace list', () => {
    render(
      <EmployerDashboardView
        companies={[membership]}
        dependencies={dashboardViewDependencies}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Your companies' }),
    ).toBeVisible();
    const companyItem = screen
      .getByText('Acme Ventures')
      .closest('[data-slot="item"]');
    if (!(companyItem instanceof HTMLElement)) {
      throw new Error('The approved company must render in a workspace item');
    }
    expect(within(companyItem).getByText('owner')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add company' })).toBeEnabled();
  });

  it('preserves only bounded work-email outcomes and announces them once', async () => {
    const consume = vi.fn();
    render(
      <EmployerDashboardView
        companies={[membership]}
        verified="approved"
        consumeVerificationOutcome={consume}
        dependencies={dashboardViewDependencies}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Your work email was verified. You can now manage this company.',
    );
    await waitFor(() => expect(consume).toHaveBeenCalledOnce());

    expect(
      validateEmployerDashboardSearch({
        verified: 'pending',
        unsafe: 'value',
      }),
    ).toEqual({ verified: 'pending' });
    expect(
      validateEmployerDashboardSearch({
        verified: 'javascript:alert(1)',
      }),
    ).toEqual({});
  });

  it('uses the owned focus-managed dialog when adding a company', async () => {
    vi.useFakeTimers();
    searchCompanies.mockResolvedValue({
      ok: true,
      data: {
        object: 'list',
        url: '/v1/me/companies/search',
        data: [],
        hasMore: false,
        nextCursor: null,
      },
    });
    render(
      <EmployerDashboardView
        companies={[]}
        dependencies={dashboardViewDependencies}
      />,
    );
    const companySearch = screen.getByLabelText('Search companies by name...');
    fireEvent.change(companySearch, {
      target: { value: 'Acme' },
    });
    await act(() => vi.advanceTimersByTimeAsync(250));

    expect(companySearch).toHaveAttribute('role', 'combobox');
    expect(
      document.querySelector('[data-slot="combobox-content"]'),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole('button', { name: 'Add “Acme” as a new company' }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Add a new company' });
    expect(dialog).toHaveAttribute('data-slot', 'dialog-content');
  });

  it('keeps the connect-company panel open across keystrokes while results update in place', async () => {
    vi.useFakeTimers();
    // Echo the query back through the result so we can watch the list swap.
    searchCompanies.mockImplementation(({ data }) =>
      Promise.resolve({
        ok: true,
        data: {
          object: 'list',
          url: '/v1/me/companies/search',
          data: [
            {
              id: `co-${data.q}`,
              object: 'claimable_company',
              name: `Match ${data.q}`,
              slug: `match-${data.q}`,
              website: null,
            },
          ],
          hasMore: false,
          nextCursor: null,
        },
      }),
    );
    render(
      <EmployerDashboardView
        companies={[]}
        dependencies={dashboardViewDependencies}
      />,
    );
    const companySearch = screen.getByLabelText('Search companies by name...');

    fireEvent.change(companySearch, { target: { value: 'Ac' } });
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(
      document.querySelector('[data-slot="combobox-content"]'),
    ).toBeVisible();
    expect(screen.getByText('Match Ac')).toBeVisible();

    // A second keystroke must NOT close the panel while the next search
    // debounces — the previous results stay visible in place.
    fireEvent.change(companySearch, { target: { value: 'Acm' } });
    expect(
      document.querySelector('[data-slot="combobox-content"]'),
    ).toBeVisible();
    expect(screen.getByText('Match Ac')).toBeVisible();

    // Once the debounce resolves, the list updates in place and stays open.
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(
      document.querySelector('[data-slot="combobox-content"]'),
    ).toBeVisible();
    expect(screen.getByText('Match Acm')).toBeVisible();
  });

  it('clears stale company results and reports a rejected debounced search', async () => {
    vi.useFakeTimers();
    searchCompanies
      .mockResolvedValueOnce({
        ok: true,
        data: {
          object: 'list',
          url: '/v1/me/companies/search',
          data: [
            {
              id: 'co-acme',
              object: 'claimable_company',
              name: 'Acme Ventures',
              slug: 'acme',
              website: null,
            },
          ],
          hasMore: false,
          nextCursor: null,
        },
      })
      .mockRejectedValueOnce(new Error('network'));
    render(
      <EmployerDashboardView
        companies={[]}
        dependencies={dashboardViewDependencies}
      />,
    );
    const input = screen.getByLabelText('Search companies by name...');
    fireEvent.change(input, { target: { value: 'Acme' } });
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(screen.getByText('Acme Ventures')).toBeVisible();

    fireEvent.change(input, { target: { value: 'Acme Labs' } });
    await act(() => vi.advanceTimersByTimeAsync(250));

    expect(screen.queryByText('Acme Ventures')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something went wrong.',
    );
    expect(
      screen.getByRole('button', {
        name: 'Add “Acme Labs” as a new company',
      }),
    ).toBeEnabled();
  });

  it('keeps a pending membership inside the employer workspace while awaiting approval', () => {
    render(
      <EmployerOnboardingPageView
        membership={{ ...membership, status: 'awaiting_admin' }}
        slug="acme-ventures"
        dependencies={onboardingViewDependencies}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Awaiting approval' }),
    ).toBeVisible();
    expect(screen.getByText(/request to join Acme Ventures/i)).toBeVisible();
    // The step's single escape hatch withdraws the claim (no Back link).
    expect(screen.getByRole('button', { name: 'Cancel claim' })).toBeEnabled();
  });

  it('resets work-email state when navigating between onboarding companies', () => {
    const firstMembership = {
      ...membership,
      status: 'pending_work_email' as const,
      workEmail: 'owner@acme.test',
      workEmailVerifiedAt: null,
    };
    const { rerender } = render(
      <EmployerOnboardingPageView
        membership={firstMembership}
        slug="acme-ventures"
        dependencies={onboardingViewDependencies}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Use a different email' }),
    );
    expect(screen.getByLabelText('Work email')).toHaveValue('owner@acme.test');

    const secondMembership = {
      ...membership,
      id: 'membership-beta',
      status: 'pending_work_email' as const,
      workEmail: 'hiring@beta.test',
      workEmailVerifiedAt: null,
      company: {
        ...membership.company,
        id: 'company-beta',
        name: 'Beta Labs',
        slug: 'beta-labs',
      },
    };
    rerender(
      <EmployerOnboardingPageView
        membership={secondMembership}
        slug="beta-labs"
        dependencies={onboardingViewDependencies}
      />,
    );

    expect(screen.getByText(/hiring@beta\.test/)).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: 'Use a different email' }),
    );
    expect(screen.getByLabelText('Work email')).toHaveValue('hiring@beta.test');
    expect(sendWorkEmail).not.toHaveBeenCalled();
  });

  it('keeps a failed cancellation visible without leaving onboarding', async () => {
    cancelClaim.mockResolvedValue({
      ok: false,
      code: 'employer_not_member',
      message: 'wire text',
    });
    render(
      <EmployerOnboardingPageView
        membership={{ ...membership, status: 'awaiting_admin' }}
        slug="acme-ventures"
        dependencies={onboardingViewDependencies}
      />,
    );
    const cancel = screen.getByRole('button', { name: 'Cancel claim' });
    fireEvent.click(cancel);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You’re not a member of this company’s team.',
    );
    expect(cancel).toBeEnabled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(navigateToDashboard).not.toHaveBeenCalled();
  });
});
