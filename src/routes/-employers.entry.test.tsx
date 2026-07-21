// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';

import { isRedirect } from '@tanstack/react-router';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CompanyMembership, Plan } from '@cavuno/board';

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    Link: ({
      to,
      params,
      search,
      children,
      ...props
    }: {
      to: string;
      params?: Record<string, string>;
      search?: Record<string, string | undefined>;
      children: ReactNode;
      className?: string;
    }) => (
      <a
        href={`${Object.entries(params ?? {}).reduce(
          (href, [key, value]) => href.replace(`$${key}`, value),
          to,
        )}${
          search
            ? `?${new URLSearchParams(
                Object.entries(search).filter(
                  (entry): entry is [string, string] => entry[1] !== undefined,
                ),
              )}`
            : ''
        }`}
        {...props}
      >
        {children}
      </a>
    ),
    useRouter: () => ({
      invalidate: mocks.invalidate,
      navigate: mocks.navigate,
    }),
  };
});

vi.mock('../server/employers', () => ({
  cancelClaim: vi.fn(),
  claimCompany: vi.fn(),
  createCompany: vi.fn(),
  listCompanies: vi.fn(),
  searchCompanies: vi.fn(),
  sendWorkEmail: vi.fn(),
}));

vi.mock('../server/queries', () => ({
  getSeoBase: vi.fn(),
  listPlans: vi.fn(),
  listSalesLedPlans: vi.fn(),
}));
// The employer loader's refresh-before-redirect path; default to no recovery,
// so an UNAUTHENTICATED loader still redirects to sign-in.
vi.mock('../server/auth', () => ({
  refreshSession: vi.fn().mockResolvedValue({ ok: false }),
}));

import { listCompanies, searchCompanies } from '../server/employers';
import { Route as DashboardRoute } from './employers.dashboard';
import { Route as EmployersRoute } from './employers.index';
import { Route as OnboardingRoute } from './employers.onboarding.$slug';

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

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('employer entry surfaces', () => {
  it('returns signed-out employers to the dashboard they originally requested', async () => {
    vi.mocked(listCompanies).mockRejectedValue(new Error('UNAUTHENTICATED'));
    const loader = DashboardRoute.options.loader;
    if (typeof loader !== 'function')
      throw new Error('The employer dashboard needs a loader');

    let result: unknown;
    try {
      result = await loader({} as never);
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
    vi.mocked(listCompanies).mockRejectedValue(new Error('UPSTREAM_TIMEOUT'));
    const loader = DashboardRoute.options.loader;
    if (typeof loader !== 'function')
      throw new Error('The employer dashboard needs a loader');

    await expect(loader({} as never)).rejects.toThrow('UPSTREAM_TIMEOUT');
  });

  it('preserves the pending company path across employer sign-in', async () => {
    vi.mocked(listCompanies).mockRejectedValue(new Error('UNAUTHENTICATED'));
    const loader = OnboardingRoute.options.loader;
    if (typeof loader !== 'function')
      throw new Error('Employer onboarding needs a loader');

    let result: unknown;
    try {
      result = await loader({ params: { slug: 'acme-ventures' } } as never);
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
    vi.spyOn(EmployersRoute, 'useLoaderData').mockReturnValue({
      plans: [plan],
      salesLed: [],
      seo: {
        origin: 'https://jobs.example.test',
        boardName: 'Example Jobs',
        language: 'en',
        labels: {},
      },
    });
    const EmployersPage = EmployersRoute.options.component;
    if (!EmployersPage)
      throw new Error('The employer landing route needs a component');

    render(<EmployersPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'For employers' }),
    ).toBeVisible();
    const growthCard = screen.getByText('Growth').closest('[data-slot="card"]');
    expect(growthCard).toBeInTheDocument();
    const growthCardElement = growthCard as HTMLElement;
    expect(within(growthCardElement).getByText('Recommended')).toBeVisible();
    // A job-posting plan's action posts a job — it is not a subscription.
    expect(
      within(growthCardElement).getByRole('link', { name: 'Post a job' }),
    ).toHaveAttribute('href', '/post?plan=plan-growth');
  });

  it('does not send a talent-access subscription into the job-posting form', () => {
    vi.spyOn(EmployersRoute, 'useLoaderData').mockReturnValue({
      plans: [
        {
          ...plan,
          id: 'plan-talent',
          name: 'Talent access',
          purpose: 'talent_access',
        },
      ],
      salesLed: [],
      seo: {
        origin: 'https://jobs.example.test',
        boardName: 'Example Jobs',
        language: 'en',
        labels: {},
      },
    });
    const EmployersPage = EmployersRoute.options.component;
    if (!EmployersPage)
      throw new Error('The employer landing route needs a component');

    render(<EmployersPage />);

    const talentCard = screen
      .getAllByText('Talent access')
      .map((element) => element.closest('[data-slot="card"]'))
      .find((element) => element !== null);
    expect(talentCard).toBeInTheDocument();
    expect(
      within(talentCard as HTMLElement).getByRole('link', {
        name: 'Subscribe',
      }),
    ).toHaveAttribute('href', '/auth/join');
  });

  it('presents approved memberships as an authenticated company workspace list', () => {
    vi.spyOn(DashboardRoute, 'useSearch').mockReturnValue({});
    vi.spyOn(DashboardRoute, 'useLoaderData').mockReturnValue({
      data: [membership],
    });
    const DashboardPage = DashboardRoute.options.component;
    if (!DashboardPage)
      throw new Error('The employer dashboard route needs a component');

    render(<DashboardPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Your companies' }),
    ).toBeVisible();
    const companyItem = screen
      .getByText('Acme Ventures')
      .closest('[data-slot="item"]');
    expect(companyItem).toBeInTheDocument();
    expect(within(companyItem as HTMLElement).getByText('owner')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add company' })).toBeEnabled();
  });

  it('uses the owned focus-managed dialog when adding a company', async () => {
    vi.useFakeTimers();
    vi.spyOn(DashboardRoute, 'useSearch').mockReturnValue({});
    vi.spyOn(DashboardRoute, 'useSearch').mockReturnValue({});
    vi.spyOn(DashboardRoute, 'useLoaderData').mockReturnValue({ data: [] });
    vi.mocked(searchCompanies).mockResolvedValue({
      ok: true,
      data: {
        object: 'list',
        url: '/v1/me/companies/search',
        data: [],
        hasMore: false,
        nextCursor: null,
      },
    });
    const DashboardPage = DashboardRoute.options.component;
    if (!DashboardPage)
      throw new Error('The employer dashboard route needs a component');

    render(<DashboardPage />);
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

  it('keeps a pending membership inside the employer workspace while awaiting approval', () => {
    vi.spyOn(OnboardingRoute, 'useLoaderData').mockReturnValue({
      membership: { ...membership, status: 'awaiting_admin' },
    });
    vi.spyOn(OnboardingRoute, 'useParams').mockReturnValue({
      slug: 'acme-ventures',
    });
    const OnboardingPage = OnboardingRoute.options.component;
    if (!OnboardingPage)
      throw new Error('The employer onboarding route needs a component');

    render(<OnboardingPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Awaiting approval' }),
    ).toBeVisible();
    expect(screen.getByText(/request to join Acme Ventures/i)).toBeVisible();
    // The step's single escape hatch withdraws the claim (no Back link).
    expect(screen.getByRole('button', { name: 'Cancel claim' })).toBeEnabled();
  });
});
