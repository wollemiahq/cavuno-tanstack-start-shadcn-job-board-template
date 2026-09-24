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
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  EmployerBillingOption,
  EmployerCheckoutBody,
  EmployerJob,
  JobPostingPlan,
} from '@cavuno/board';

const mocks = {
  createJob: vi.fn(),
  updateJob: vi.fn(),
  checkoutJob: vi.fn(),
  invalidate: vi.fn(),
  navigate: vi.fn(),
};

import {
  EmployerJobForm,
  type EmployerJobFormDependencies,
} from './employer-job-form';

import type { JobFormLayoutSource } from '@/board/form-layout';
import type { JobFormSource } from '@/board/job-form';
import { m } from '@/paraglide/messages';

const dependencies = mocks satisfies EmployerJobFormDependencies;

async function renderWithRouter(node: React.ReactNode) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <>{node}</>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}

const suggestions = {
  suggestions: [],
  loading: false,
  onQueryChange: () => {},
};

function leftoverCredit(
  overrides: Partial<EmployerBillingOption> = {},
): EmployerBillingOption {
  return {
    id: 'credit-1',
    object: 'employer_billing_option',
    type: 'order',
    planId: 'plan-growth',
    planName: 'Single post',
    planKind: 'one_time',
    jobsRemaining: 1,
    jobsTotal: 1,
    featuredRemaining: 0,
    featuredTotal: 0,
    renewsAt: null,
    ...overrides,
  };
}

const plan: JobPostingPlan = {
  object: 'job_posting_plan',
  id: 'plan-growth',
  name: 'Growth',
  description: null,
  kind: 'subscription',
  billingInterval: 'month',
  purpose: 'job_posting',
  isRecommended: false,
  displayOrder: 1,
  invoiceOnly: false,
  publishTiming: 'on_payment',
  netTermsDays: null,
  prices: [{ isActive: true, currency: 'usd', amountCents: 9900 }],
  features: [],
};

const draftJob: EmployerJob = {
  id: 'job-1',
  object: 'employer_job',
  title: 'Senior Product Designer',
  slug: 'senior-product-designer',
  status: 'draft',
  companyId: 'c1',
  employmentType: 'full_time',
  remoteOption: 'hybrid',
  seniority: 'senior',
  salaryMin: 100000,
  salaryMax: 140000,
  salaryCurrency: 'USD',
  salaryTimeframe: 'per_year',
  isFeatured: false,
  publishedAt: null,
  expiresAt: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  links: { public: null },
  description: '<p>Design things.</p>',
  applicationUrl: 'https://acme.example/apply',
  remotePermits: [],
  remoteWorldwide: null,
  remoteTimezones: [],
  remoteAllowedTzOffsets: [],
  remoteWorkPermitCountryCodes: [],
  remoteWorkPermitSubdivisionCodes: [],
  remoteSponsorship: 'unknown',
  educationRequirements: [],
  experienceMonths: null,
  experienceInPlaceOfEducation: null,
  inOfficePeriod: null,
  inOfficeFrequency: null,
  company: null,
  officeLocations: [
    {
      displayName: 'Berlin, Germany',
      city: 'Berlin',
      locality: null,
      region: 'Berlin',
      regionCode: 'BE',
      country: 'Germany',
      countryCode: 'DE',
      postalCode: null,
    },
  ],
  customFieldValues: {},
  collectionValues: {},
  resolvedCollectionFields: [],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mocks.invalidate.mockResolvedValue(undefined);
  mocks.navigate.mockResolvedValue(undefined);
});

describe('EmployerJobForm', () => {
  it('prefills the role fields from an existing job in edit mode', async () => {
    await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'draft' }}
        job={draftJob}
      />,
    );

    expect(
      screen.getByDisplayValue('Senior Product Designer'),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('100000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('140000')).toBeInTheDocument();
    // An existing external apply URL prefills the target, mailto stripped.
    expect(
      screen.getByDisplayValue('https://acme.example/apply'),
    ).toBeInTheDocument();
    // A draft edit owns the plan picker.
    expect(screen.getByRole('radio', { name: /Growth/ })).toBeInTheDocument();
  });

  it('saves then checks out when a draft edit selects a plan', async () => {
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    mocks.checkoutJob.mockResolvedValue({
      ok: true,
      data: { status: 'published', checkoutUrl: null },
    });

    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'draft' }}
        job={draftJob}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Growth/ }));
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(mocks.updateJob).toHaveBeenCalledTimes(1));
    expect(mocks.updateJob).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'acme', id: 'job-1' }),
      }),
    );
    await waitFor(() => expect(mocks.checkoutJob).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/employers/companies/$slug',
          reloadDocument: true,
        }),
      ),
    );
  });

  it('sends the employer to an awaiting-review list when the board holds the post', async () => {
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    mocks.checkoutJob.mockResolvedValue({
      ok: true,
      data: { status: 'pending_approval', checkoutUrl: null },
    });

    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'draft' }}
        job={draftJob}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Growth/ }));
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/employers/companies/$slug',
          reloadDocument: true,
          search: { posted: '1', review: '1', job_id: 'job-1' },
        }),
      ),
    );
  });

  it('retries checkout for the committed job without saving it again', async () => {
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    mocks.checkoutJob
      .mockRejectedValueOnce(new Error('checkout unavailable'))
      .mockResolvedValueOnce({
        ok: true,
        data: { status: 'published', checkoutUrl: null },
      });

    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'draft' }}
        job={draftJob}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Growth/ }));
    fireEvent.submit(container.querySelector('form')!);

    const retry = await screen.findByRole('button', {
      name: 'Proceed to secure checkout',
    });
    expect(mocks.updateJob).toHaveBeenCalledOnce();
    fireEvent.click(retry);

    await waitFor(() => expect(mocks.checkoutJob).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledOnce());
    expect(mocks.updateJob).toHaveBeenCalledOnce();
  });

  it('sends salary nulls when an edit clears both bounds (withdraw the salary)', async () => {
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });

    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'published' }}
        job={draftJob}
      />,
    );

    fireEvent.change(container.querySelector('#job-salary-min')!, {
      target: { value: '' },
    });
    fireEvent.change(container.querySelector('#job-salary-max')!, {
      target: { value: '' },
    });
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(mocks.updateJob).toHaveBeenCalledTimes(1));
    const body = mocks.updateJob.mock.calls[0]![0].data.body;
    expect(body.salaryMin).toBeNull();
    expect(body.salaryMax).toBeNull();
    expect(body.salaryCurrency).toBeNull();
    expect(body.salaryTimeframe).toBeNull();
  });

  it('omits salary when an edit leaves one bound filled (ambiguous, unchanged)', async () => {
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });

    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'published' }}
        job={draftJob}
      />,
    );

    fireEvent.change(container.querySelector('#job-salary-max')!, {
      target: { value: '' },
    });
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(mocks.updateJob).toHaveBeenCalledTimes(1));
    const body = mocks.updateJob.mock.calls[0]![0].data.body;
    expect('salaryMin' in body).toBe(false);
    expect('salaryMax' in body).toBe(false);
  });

  it('renews an expired job: shows the plan picker and checks out on save', async () => {
    // "Republish" on the jobs list lands an expired job here after the board
    // answers 402. If the picker stayed hidden there was no way to pay for a
    // renewal at all — recurring revenue was unreachable.
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    mocks.checkoutJob.mockResolvedValue({
      ok: true,
      data: { status: 'published', checkoutUrl: null },
    });

    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'expired' }}
        job={{ ...draftJob, status: 'expired' }}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Growth/ }));
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(mocks.updateJob).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.checkoutJob).toHaveBeenCalledTimes(1));
    expect(mocks.checkoutJob).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'acme',
          id: 'job-1',
          body: expect.objectContaining({
            billing: { type: 'new', planId: plan.id },
          }),
        }),
      }),
    );
  });

  it('saves an expired job without a billing choice as a plain edit', async () => {
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });

    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'expired' }}
        job={{ ...draftJob, status: 'expired' }}
      />,
    );

    expect(screen.getByRole('radio', { name: /Growth/ })).toBeInTheDocument();
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(mocks.updateJob).toHaveBeenCalledTimes(1));
    expect(mocks.checkoutJob).not.toHaveBeenCalled();
  });

  it('shows the plan picker when editing an archived job', async () => {
    // The jobs list offers "Republish" for an archived job too, and routes
    // here after a 402 — so it needs the picker as well.
    await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'archived' }}
        job={{ ...draftJob, status: 'archived' }}
      />,
    );
    expect(screen.getByRole('radio', { name: /Growth/ })).toBeInTheDocument();
  });

  describe('featured listings', () => {
    // Featured slots are sold by the plan, but the platform only features a
    // post when the checkout body says `isFeatured` (unless the board
    // auto-features). Without the choice, a buyer on a manual-selection board
    // paid the featured price and got a standard listing.
    const featuredPlan: JobPostingPlan = {
      ...plan,
      features: [
        { key: 'jobs.featured_slots', value: '2' },
        { key: 'jobs.feature_selection_mode', value: 'manual' },
      ],
    };

    async function renderDraftEdit(
      plans: JobPostingPlan[],
      billingOptions: EmployerBillingOption[] = [],
    ) {
      mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
      mocks.checkoutJob.mockResolvedValue({
        ok: true,
        data: { status: 'published', checkoutUrl: null },
      });
      return renderWithRouter(
        <EmployerJobForm
          dependencies={dependencies}
          slug="acme"
          locale="en-AU"
          remotePermits={null}
          plans={plans}
          billingOptions={billingOptions}
          officeLocationSuggestions={suggestions}
          mode={{ kind: 'edit', jobId: 'job-1', status: 'draft' }}
          job={draftJob}
        />,
      );
    }

    function checkoutBody(): EmployerCheckoutBody {
      return mocks.checkoutJob.mock.calls[0]![0].data.body;
    }

    it('sends isFeatured when the buyer ticks the featured slot on a plan', async () => {
      const { container } = await renderDraftEdit([featuredPlan]);

      fireEvent.click(screen.getByRole('radio', { name: /Growth/ }));
      const box = screen.getByRole('checkbox', {
        name: /Feature this listing/,
      });
      expect(box).not.toBeChecked();
      // The plan card already says what the purchase includes; no "left"
      // hint on a plan not yet bought.
      expect(screen.queryByText(/featured slot/i)).not.toBeInTheDocument();
      fireEvent.click(box);
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => expect(mocks.checkoutJob).toHaveBeenCalledTimes(1));
      expect(checkoutBody()).toEqual({
        billing: { type: 'new', planId: plan.id },
        isFeatured: true,
      });
    });

    it('omits isFeatured when the box stays unticked', async () => {
      const { container } = await renderDraftEdit([featuredPlan]);

      fireEvent.click(screen.getByRole('radio', { name: /Growth/ }));
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => expect(mocks.checkoutJob).toHaveBeenCalledTimes(1));
      expect('isFeatured' in checkoutBody()).toBe(false);
    });

    it('pre-ticks a single-post purchase that includes a featured slot', async () => {
      // A one-time plan with a featured slot is buying that slot for THIS
      // job — leaving it unticked would forfeit what was paid for.
      const oneTime: JobPostingPlan = {
        ...featuredPlan,
        kind: 'one_time',
        features: [
          { key: 'jobs.featured_slots', value: '1' },
          { key: 'jobs.feature_selection_mode', value: 'manual' },
        ],
      };
      const { container } = await renderDraftEdit([oneTime]);

      fireEvent.click(screen.getByRole('radio', { name: /Growth/ }));
      expect(
        screen.getByRole('checkbox', { name: /Feature this listing/ }),
      ).toBeChecked();
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => expect(mocks.checkoutJob).toHaveBeenCalledTimes(1));
      expect(checkoutBody()).toMatchObject({ isFeatured: true });
    });

    it('offers no choice on a plan without featured slots or one that auto-features', async () => {
      // A plan with slots but no explicit selection mode auto-features too —
      // the platform treats a missing mode as `auto`, so a checkbox there
      // would be a control that lies.
      const auto: JobPostingPlan = {
        ...featuredPlan,
        id: 'plan-auto',
        name: 'Auto',
        features: [
          { key: 'jobs.featured_slots', value: '3' },
          { key: 'jobs.feature_selection_mode', value: 'auto' },
        ],
      };
      const unset: JobPostingPlan = {
        ...featuredPlan,
        id: 'plan-unset',
        name: 'Unset',
        features: [{ key: 'jobs.featured_slots', value: '3' }],
      };
      await renderDraftEdit([plan, auto, unset]);

      for (const name of [/Growth/, /Auto/, /Unset/]) {
        fireEvent.click(screen.getByRole('radio', { name }));
        expect(
          screen.queryByRole('checkbox', { name: /Feature this listing/ }),
        ).not.toBeInTheDocument();
      }
    });

    it('drops the tick when the buyer switches to another plan', async () => {
      const other: JobPostingPlan = {
        ...featuredPlan,
        id: 'plan-other',
        name: 'Other',
      };
      const { container } = await renderDraftEdit([featuredPlan, other]);

      fireEvent.click(screen.getByRole('radio', { name: /Growth/ }));
      fireEvent.click(
        screen.getByRole('checkbox', { name: /Feature this listing/ }),
      );
      fireEvent.click(screen.getByRole('radio', { name: /Other/ }));
      expect(
        screen.getByRole('checkbox', { name: /Feature this listing/ }),
      ).not.toBeChecked();
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => expect(mocks.checkoutJob).toHaveBeenCalledTimes(1));
      expect('isFeatured' in checkoutBody()).toBe(false);
    });

    it('pre-ticks a one-time credit whose remaining posts can all be featured', async () => {
      const credit: EmployerBillingOption = {
        id: 'order-1',
        object: 'employer_billing_option',
        type: 'order',
        planId: plan.id,
        planName: 'Single post',
        planKind: 'one_time',
        jobsRemaining: 1,
        jobsTotal: 1,
        featuredRemaining: 1,
        featuredTotal: 1,
        renewsAt: null,
      };
      const { container } = await renderDraftEdit([], [credit]);

      fireEvent.click(screen.getByRole('radio', { name: /Single post/ }));
      expect(
        screen.getByRole('checkbox', { name: /Feature this listing/ }),
      ).toBeChecked();
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => expect(mocks.checkoutJob).toHaveBeenCalledTimes(1));
      expect(checkoutBody()).toMatchObject({ isFeatured: true });
    });

    it('offers the choice on an unlimited-featured credit', async () => {
      const credit: EmployerBillingOption = {
        id: 'sub-2',
        object: 'employer_billing_option',
        type: 'subscription',
        planId: plan.id,
        planName: 'Unlimited credits',
        planKind: 'subscription',
        jobsRemaining: 4,
        jobsTotal: 5,
        featuredRemaining: 0,
        featuredTotal: 0,
        featuredUnlimited: true,
        renewsAt: null,
      };
      await renderDraftEdit([], [credit]);

      fireEvent.click(screen.getByRole('radio', { name: /Unlimited credits/ }));
      expect(
        screen.getByRole('checkbox', { name: /Feature this listing/ }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Unlimited featured/)).toBeInTheDocument();
    });

    it('offers the choice on a reusable credit that still holds featured slots', async () => {
      const option: EmployerBillingOption = {
        id: 'sub-1',
        object: 'employer_billing_option',
        type: 'subscription',
        planId: plan.id,
        planName: 'Growth credits',
        planKind: 'subscription',
        jobsRemaining: 4,
        jobsTotal: 5,
        featuredRemaining: 1,
        featuredTotal: 2,
        renewsAt: '2026-08-01T00:00:00.000Z',
      };
      const { container } = await renderDraftEdit([], [option]);

      fireEvent.click(screen.getByRole('radio', { name: /Growth credits/ }));
      expect(screen.getByText(/1 featured slot left/)).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole('checkbox', { name: /Feature this listing/ }),
      );
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => expect(mocks.checkoutJob).toHaveBeenCalledTimes(1));
      expect(checkoutBody()).toEqual({
        billing: { type: 'subscription', planId: plan.id, id: 'sub-1' },
        isFeatured: true,
      });
    });
  });

  it('hides the plan picker when editing a published job', async () => {
    await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'published' }}
        job={{ ...draftJob, status: 'published' }}
      />,
    );

    expect(
      screen.queryByRole('radio', { name: /Growth/ }),
    ).not.toBeInTheDocument();
  });

  it('hard-reloads the company list even if route invalidation would fail', async () => {
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    mocks.invalidate.mockRejectedValue(new Error('refresh failed'));
    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'published' }}
        job={{ ...draftJob, status: 'published' }}
      />,
    );

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/employers/companies/$slug',
          reloadDocument: true,
          search: { posted: '1', job_id: 'job-1' },
        }),
      ),
    );
    expect(mocks.updateJob).toHaveBeenCalledOnce();
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });

  it('keeps a saved edit committed when the list reload fails', async () => {
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    mocks.navigate.mockRejectedValue(new Error('navigation failed'));
    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'published' }}
        job={{ ...draftJob, status: 'published' }}
      />,
    );

    fireEvent.submit(container.querySelector('form')!);

    expect(await screen.findByRole('status')).toHaveTextContent(
      /change was saved/i,
    );
    expect(mocks.updateJob).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('requires a billing choice before a create can publish', async () => {
    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'create' }}
      />,
    );

    // Submitting without picking a credit/plan surfaces the billing error and
    // never creates the job.
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() =>
      expect(screen.getByText(/Choose a credit or plan/)).toBeInTheDocument(),
    );
    expect(mocks.createJob).not.toHaveBeenCalled();
  });

  it('creates a draft without checkout when the employer saves a draft', async () => {
    mocks.createJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'create' }}
        job={{ ...draftJob, remoteOption: 'remote' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));

    await waitFor(() => expect(mocks.createJob).toHaveBeenCalledTimes(1));
    expect(mocks.checkoutJob).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/employers/companies/$slug',
          reloadDocument: true,
        }),
      ),
    );
  });

  it('does not offer posting when the board has nothing to publish with', async () => {
    await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'create' }}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Post job' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Create draft' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(m.postJob_noPlansTitle())).toBeInTheDocument();
  });

  it('still offers Post job when leftover credits remain and no plan is for sale', async () => {
    await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[]}
        billingOptions={[leftoverCredit()]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'create' }}
        job={{ ...draftJob, remoteOption: 'remote' }}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Post job' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create draft' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Single post/ })).toBeChecked();
  });

  it('publishes with the auto-selected leftover credit without an extra click', async () => {
    mocks.createJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    mocks.checkoutJob.mockResolvedValue({
      ok: true,
      data: { status: 'published', checkoutUrl: null },
    });
    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[leftoverCredit()]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'create' }}
        job={{ ...draftJob, remoteOption: 'remote' }}
      />,
    );

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(mocks.checkoutJob).toHaveBeenCalledTimes(1));
    expect(mocks.checkoutJob.mock.calls[0]![0].data.body).toEqual({
      billing: {
        type: 'order',
        planId: 'plan-growth',
        id: 'credit-1',
      },
    });
  });

  it('lets the employer drop the auto-selected credit and pick a plan instead', async () => {
    mocks.createJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    mocks.checkoutJob.mockResolvedValue({
      ok: true,
      data: { status: 'published', checkoutUrl: null },
    });
    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[leftoverCredit()]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'create' }}
        job={{ ...draftJob, remoteOption: 'remote' }}
      />,
    );

    expect(screen.getByRole('radio', { name: /Single post/ })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: /Growth/ }));
    expect(
      screen.getByRole('radio', { name: /Single post/ }),
    ).not.toBeChecked();
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(mocks.checkoutJob).toHaveBeenCalledTimes(1));
    expect(mocks.checkoutJob.mock.calls[0]![0].data.body).toEqual({
      billing: { type: 'new', planId: plan.id },
    });
  });

  it('surfaces a hybrid office miss instead of a silent no-op submit', async () => {
    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'draft' }}
        job={{ ...draftJob, officeLocations: [] }}
      />,
    );

    fireEvent.submit(container.querySelector('form')!);

    // Field error (below the fold) plus the submit-row banner — field
    // flags alone used to leave status idle so Post job looked dead.
    expect(
      await screen.findAllByText(m.postJob_officeLocationsRequiredError()),
    ).toHaveLength(2);
    expect(mocks.updateJob).not.toHaveBeenCalled();
  });

  it('does not paint a generic failure over a missing description', async () => {
    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'published' }}
        job={{
          ...draftJob,
          status: 'published',
          remoteOption: 'remote',
          description: '',
        }}
      />,
    );

    fireEvent.submit(container.querySelector('form')!);

    expect(
      await screen.findAllByText(m.postJob_descriptionRequiredError()),
    ).toHaveLength(2);
    expect(
      screen.queryByText(m.employerCompany_genericError()),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(m.postJob_officeLocationsRequiredError()),
    ).not.toBeInTheDocument();
    expect(mocks.updateJob).not.toHaveBeenCalled();
  });

  it('does not paint a generic failure over a missing apply URL', async () => {
    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'published' }}
        job={{
          ...draftJob,
          status: 'published',
          remoteOption: 'remote',
        }}
      />,
    );

    fireEvent.change(container.querySelector('#job-application-target')!, {
      target: { value: '' },
    });
    fireEvent.submit(container.querySelector('form')!);

    expect(
      await screen.findAllByText(m.employerPostJob_applyTargetRequiredError()),
    ).toHaveLength(2);
    expect(
      screen.queryByText(m.employerCompany_genericError()),
    ).not.toBeInTheDocument();
    expect(mocks.updateJob).not.toHaveBeenCalled();
  });

  it('does not paint a generic failure over a missing billing choice', async () => {
    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'create' }}
        job={{ ...draftJob, remoteOption: 'remote' }}
      />,
    );

    fireEvent.submit(container.querySelector('form')!);

    expect(
      await screen.findAllByText(m.employerPostJob_billingRequiredError()),
    ).toHaveLength(2);
    expect(
      screen.queryByText(m.employerCompany_genericError()),
    ).not.toBeInTheDocument();
    expect(mocks.createJob).not.toHaveBeenCalled();
  });
});

describe('EmployerJobForm — board job-form constraints', () => {
  it('surfaces a blocked save visibly, not just in state', async () => {
    // `message` renders only under `status === 'error'`; setting the text
    // alone left the submit button silently dead.
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'draft' }}
        job={draftJob}
        // The fixture job pays 100000–140000; the board floor is higher.
        jobForm={{
          object: 'public_board',
          jobForm: { salary: { required: true, minBound: 200000 } },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Growth/ }));
    fireEvent.submit(container.querySelector('form')!);

    expect(
      await screen.findByText(m.jobForm_salaryBelowMinError({ min: 200000 })),
    ).toBeInTheDocument();
    expect(mocks.updateJob).not.toHaveBeenCalled();
  });
});

/**
 * Board country lock on the employer form. The picker resolves a country
 * code for every suggestion, but the form used to discard it — so a board
 * with `allowedCountries` got no enforcement at all here. The platform's
 * server-side constraint check does not run on the employer job route
 * either — only on public job submission — so this client-side check IS the
 * enforcement here, matching the hosted employer form.
 */
describe('EmployerJobForm — narrowing applied AFTER a job was posted', () => {
  /**
   * The employer job route runs NO server-side constraint check (only public
   * submission does), so this form is the only enforcement. An edit opens
   * with the job's stored values, which predate any narrowing the operator
   * has since applied — without a check the save silently stores a value the
   * board disallows.
   */
  function renderNarrowed(jobForm: JobFormSource) {
    return renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'draft' }}
        job={draftJob}
        jobForm={jobForm}
      />,
    );
  }

  async function submitAndExpect(jobForm: JobFormSource, text: string) {
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    const { container } = await renderNarrowed(jobForm);
    fireEvent.click(screen.getByRole('radio', { name: /Growth/ }));
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(mocks.updateJob).not.toHaveBeenCalled();
  }

  it('blocks a stored employment type the board no longer accepts', async () => {
    // draftJob is full_time; the board has narrowed to contract.
    await submitAndExpect(
      {
        object: 'public_board',
        jobForm: { employmentType: { allowedOptions: ['contract'] } },
      },
      m.jobForm_optionNotAllowedError(),
    );
  });

  it('blocks a stored work arrangement the board no longer accepts', async () => {
    await submitAndExpect(
      {
        object: 'public_board',
        jobForm: { workArrangement: { allowedOptions: ['remote'] } },
      },
      m.jobForm_optionNotAllowedError(),
    );
  });

  it('blocks a stored currency the board no longer accepts', async () => {
    await submitAndExpect(
      {
        object: 'public_board',
        jobForm: { salary: { allowedCurrencies: ['EUR'] } },
      },
      m.jobForm_currencyNotAllowedError({ currencies: 'EUR' }),
    );
  });

  it('saves normally when the stored values are all still accepted', async () => {
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    mocks.checkoutJob.mockResolvedValue({
      ok: true,
      data: { status: 'published', checkoutUrl: null },
    });
    const { container } = await renderNarrowed({
      object: 'public_board',
      jobForm: {
        employmentType: { allowedOptions: ['full_time'] },
        workArrangement: { allowedOptions: ['hybrid'] },
        salary: { allowedCurrencies: ['USD'] },
      },
    });
    fireEvent.click(screen.getByRole('radio', { name: /Growth/ }));
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(mocks.updateJob).toHaveBeenCalledTimes(1));
  });
});

describe('EmployerJobForm — office-location country lock', () => {
  const germany = {
    object: 'public_board' as const,
    jobForm: { location: { allowedCountries: ['DE'] } },
  };
  const franceOnly = {
    object: 'public_board' as const,
    jobForm: { location: { allowedCountries: ['FR'] } },
  };

  function renderEdit(jobForm?: JobFormSource) {
    return renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'draft' }}
        job={draftJob}
        jobForm={jobForm}
      />,
    );
  }

  it('blocks a save when a stored location sits outside the board list', async () => {
    // The fixture job is in Berlin (DE); the board has since narrowed to FR.
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    const { container } = await renderEdit(franceOnly);

    fireEvent.click(screen.getByRole('radio', { name: /Growth/ }));
    fireEvent.submit(container.querySelector('form')!);

    expect(
      await screen.findByText(
        m.jobForm_officeLocationCountryNotAllowedError({ countries: 'FR' }),
      ),
    ).toBeInTheDocument();
    expect(mocks.updateJob).not.toHaveBeenCalled();
  });

  it('refuses a disallowed pick inline, so the tag never enters the form', async () => {
    // The picker resolves a country for every suggestion — this is the path
    // that previously threw it away.
    const paris = {
      id: 'place-paris',
      slug: 'paris',
      name: 'Paris',
      contextLabel: 'France',
      countryCode: 'FR',
      regionCode: null,
    };
    await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={{
          suggestions: [paris],
          loading: false,
          onQueryChange: () => {},
        }}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'draft' }}
        job={draftJob}
        jobForm={germany}
      />,
    );

    const field = screen.getByLabelText(m.postJob_officeLocationsLabel());
    fireEvent.input(field, {
      target: { value: 'Par' },
      inputType: 'insertText',
    });
    fireEvent.click(await screen.findByText('Paris'));

    expect(
      await screen.findByText(
        m.jobForm_officeLocationCountryNotAllowedError({ countries: 'DE' }),
      ),
    ).toBeInTheDocument();
    // Berlin (the fixture's own location) is still the only tag.
    expect(
      screen.queryByRole('button', {
        name: m.placeTags_removeAriaLabel({ name: 'Paris' }),
      }),
    ).toBeNull();
  });

  it('saves normally when the stored location is inside the board list', async () => {
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    mocks.checkoutJob.mockResolvedValue({
      ok: true,
      data: { status: 'published', checkoutUrl: null },
    });
    const { container } = await renderEdit(germany);

    fireEvent.click(screen.getByRole('radio', { name: /Growth/ }));
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(mocks.updateJob).toHaveBeenCalledTimes(1));
  });

  it('refuses free text while a country lock is active — it carries no country to check', async () => {
    // Nothing downstream resolves it on this route, so accepting it would be
    // a hole in the lock this form exists to enforce.
    await renderEdit(germany);
    const field = screen.getByLabelText(m.postJob_officeLocationsLabel());
    fireEvent.change(field, { target: { value: 'Paris' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(
      await screen.findByText(
        m.jobForm_officeLocationCountryNotAllowedError({ countries: 'DE' }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: m.placeTags_removeAriaLabel({ name: 'Paris' }),
      }),
    ).toBeNull();
  });

  it('does not block when the board sets no country restriction', async () => {
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    mocks.checkoutJob.mockResolvedValue({
      ok: true,
      data: { status: 'published', checkoutUrl: null },
    });
    const { container } = await renderEdit(undefined);

    fireEvent.click(screen.getByRole('radio', { name: /Growth/ }));
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(mocks.updateJob).toHaveBeenCalledTimes(1));
  });
});

describe('EmployerJobForm — members-only board', () => {
  it('replaces the form with the join gate when the board refuses the write', async () => {
    // Entitlement is not on the wire — billing options carry no `canPost` —
    // so the gate comes from the refusal itself.
    mocks.updateJob.mockResolvedValue({
      ok: false,
      code: 'membership_required',
      message: 'Membership required.',
    });
    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'draft' }}
        job={draftJob}
        membershipGate={<div data-testid="membership-gate">Members only</div>}
      />,
    );

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() =>
      expect(screen.getByTestId('membership-gate')).toBeVisible(),
    );
    expect(container.querySelector('form')).toBeNull();
  });

  it('keeps the form up for any other refusal', async () => {
    mocks.updateJob.mockResolvedValue({
      ok: false,
      code: 'employer_jobs_quota_exceeded',
      message: 'Quota exceeded.',
    });
    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'draft' }}
        job={draftJob}
        membershipGate={<div data-testid="membership-gate">Members only</div>}
      />,
    );

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(mocks.updateJob).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('membership-gate')).toBeNull();
  });
});

/**
 * Board-defined custom fields (Settings → Job form) are one configuration
 * for every posting surface: the employer form renders the same definitions
 * the public /post form does, sends the answers, prefills them on edit and
 * blocks a save that leaves a required one empty — before the platform's
 * own 400 would.
 */
describe('EmployerJobForm — board custom fields', () => {
  const customFields = [
    {
      key: 'team',
      label: 'Team',
      type: 'short_text' as const,
      required: true,
    },
    {
      key: 'perks',
      label: 'Perks',
      type: 'multi_select' as const,
      required: false,
      options: [
        { key: 'gym', label: 'Gym' },
        { key: 'remote', label: 'Remote stipend' },
      ],
    },
  ];

  // `customFieldValues` reaches `EmployerJob` with the Board API release that
  // opened the employer job surface to custom fields; widened here so the
  // fixture also compiles against the SDK pin that predates it.
  const publishedWithAnswers: EmployerJob & {
    customFieldValues?: Record<string, string | string[] | boolean | number>;
  } = {
    ...draftJob,
    status: 'published',
    customFieldValues: { team: 'Platform', perks: ['gym'] },
  };

  it('renders the definitions and sends the answers on a draft create', async () => {
    mocks.createJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'create' }}
        job={{ ...draftJob, remoteOption: 'remote' }}
        customFields={customFields}
      />,
    );

    fireEvent.change(screen.getByLabelText('Team'), {
      target: { value: 'Platform' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Gym' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));

    await waitFor(() => expect(mocks.createJob).toHaveBeenCalledTimes(1));
    const body = mocks.createJob.mock.calls[0]![0].data.body;
    expect(body.customFieldValues).toEqual({
      team: 'Platform',
      perks: ['gym'],
    });
  });

  it('sends no bag at all when the board defines no custom fields', async () => {
    mocks.createJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'create' }}
        job={{ ...draftJob, remoteOption: 'remote' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));

    await waitFor(() => expect(mocks.createJob).toHaveBeenCalledTimes(1));
    const body = mocks.createJob.mock.calls[0]![0].data.body;
    expect('customFieldValues' in body).toBe(false);
  });

  it('prefills the stored answers on edit and clears a removed one with null', async () => {
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'published' }}
        job={publishedWithAnswers}
        customFields={customFields}
      />,
    );

    expect(screen.getByLabelText('Team')).toHaveValue('Platform');
    expect(screen.getByRole('checkbox', { name: 'Gym' })).toBeChecked();

    // Untick the only perk: the edit must send an explicit clear, because
    // the update is an additive merge and an omitted key keeps the old value.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Gym' }));
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(mocks.updateJob).toHaveBeenCalledTimes(1));
    const body = mocks.updateJob.mock.calls[0]![0].data.body;
    expect(body.customFieldValues).toEqual({ team: 'Platform', perks: null });
  });

  it('sends an untouched required Yes/No field as false, and leaves an optional one unanswered', async () => {
    mocks.createJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'create' }}
        job={{ ...draftJob, remoteOption: 'remote' }}
        customFields={[
          {
            key: 'visa',
            label: 'Visa sponsorship',
            type: 'boolean',
            required: true,
          },
          {
            key: 'relocation',
            label: 'Relocation assistance',
            type: 'boolean',
            required: false,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));

    await waitFor(() => expect(mocks.createJob).toHaveBeenCalledTimes(1));
    const body = mocks.createJob.mock.calls[0]![0].data.body;
    expect(body.customFieldValues).toEqual({ visa: false });
  });

  it('names the field when the board refuses a custom field the form could not check', async () => {
    // e.g. the operator made "Perks" required after this form loaded.
    mocks.createJob.mockResolvedValue({
      ok: false,
      code: 'jobs_constraint_violation',
      message: '"Perks" is required on this board',
      violations: [
        {
          code: 'custom_field_required',
          path: ['customFieldValues', 'perks'],
          params: { label: 'Perks' },
        },
      ],
    });
    await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'create' }}
        job={{ ...draftJob, remoteOption: 'remote' }}
        customFields={customFields}
      />,
    );

    fireEvent.change(screen.getByLabelText('Team'), {
      target: { value: 'Platform' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));

    expect(
      await screen.findByText(
        m.jobForm_customFieldRequiredError({ field: 'Perks' }),
      ),
    ).toBeInTheDocument();
  });

  it('blocks a save that leaves a required custom field empty', async () => {
    mocks.createJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    await renderWithRouter(
      <EmployerJobForm
        dependencies={dependencies}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'create' }}
        job={{ ...draftJob, remoteOption: 'remote' }}
        customFields={customFields}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));

    expect(
      await screen.findByText(
        m.jobForm_customFieldRequiredError({ field: 'Team' }),
      ),
    ).toBeInTheDocument();
    expect(mocks.createJob).not.toHaveBeenCalled();
  });
});

describe('EmployerJobForm — operator form layout', () => {
  const clearance = {
    key: 'clearance',
    label: 'Security clearance',
    type: 'short_text' as const,
    required: false,
  };
  const benefits = {
    key: 'benefits',
    label: 'Benefits',
    typeId: 'type-benefits',
    multiple: true,
    required: true,
    maxSelections: 3,
  };
  function builtin(
    key: string,
    overrides: { visible?: boolean; locked?: boolean } = {},
  ) {
    return {
      kind: 'builtin' as const,
      key,
      visible: overrides.visible ?? true,
      required: overrides.locked ?? false,
      locked: overrides.locked ?? false,
      lockReason: overrides.locked ? ('google_required' as const) : null,
    };
  }
  const layout: JobFormLayoutSource = {
    forms: {
      job: [
        builtin('description', { locked: true }),
        builtin('title', { locked: true }),
        builtin('seniority', { visible: false }),
        {
          kind: 'custom',
          key: 'clearance',
          visible: false,
          required: false,
          definition: clearance,
        },
        builtin('workArrangement', { locked: true }),
        builtin('applyMethod', { locked: true }),
        {
          kind: 'collection',
          key: 'benefits',
          visible: true,
          required: true,
          definition: benefits,
        },
      ],
    },
  };

  async function renderCreate(
    loadCollectionChoices = vi
      .fn()
      .mockResolvedValue([{ id: 'rec-pto', name: 'Paid time off' }]),
  ) {
    await renderWithRouter(
      <EmployerJobForm
        dependencies={{ ...dependencies, loadCollectionChoices }}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'create' }}
        job={{ ...draftJob, remoteOption: 'remote' }}
        jobForm={layout}
        customFields={[clearance]}
      />,
    );
    return loadCollectionChoices;
  }

  async function renderEdit(job: EmployerJob, jobForm = layout) {
    const { container } = await renderWithRouter(
      <EmployerJobForm
        dependencies={{
          ...dependencies,
          loadCollectionChoices: vi.fn().mockResolvedValue([]),
        }}
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'published' }}
        job={job}
        jobForm={jobForm}
        customFields={[clearance]}
      />,
    );
    return container;
  }

  const benefitsOnJob = {
    collectionValues: { benefits: ['rec-pto'] },
    resolvedCollectionFields: [
      {
        key: 'benefits',
        label: 'Benefits',
        entries: [
          {
            id: 'rec-pto',
            name: 'Paid time off',
            title: 'Generous paid leave',
            description: null,
            titleOverride: 'Generous paid leave',
            descriptionOverride: null,
            fields: [],
            values: {},
          },
        ],
      },
    ],
  } satisfies Partial<EmployerJob>;

  it('names a stored collection entry from the job read', async () => {
    await renderEdit({ ...draftJob, ...benefitsOnJob });

    expect(
      screen.getByRole('button', {
        name: m.placeTags_removeAriaLabel({ name: 'Paid time off' }),
      }),
    ).toBeInTheDocument();
  });

  it('saves an edit whose hidden employment type the board no longer allows, without sending it', async () => {
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    // The layout does not show the employment type, and the board now only
    // allows `contract`; the job is stored as `full_time`.
    const container = await renderEdit(
      { ...draftJob, ...benefitsOnJob, employmentType: 'full_time' },
      {
        ...layout,
        jobForm: { employmentType: { allowedOptions: ['contract'] } },
      },
    );

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(mocks.updateJob).toHaveBeenCalledTimes(1));
    const body = mocks.updateJob.mock.calls[0]![0].data.body;
    expect('employmentType' in body).toBe(false);
  });

  it('keeps a hidden custom field and an unchanged collection out of an edit', async () => {
    mocks.updateJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    const container = await renderEdit({
      ...draftJob,
      ...benefitsOnJob,
      customFieldValues: { clearance: 'TS/SCI' },
    });

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(mocks.updateJob).toHaveBeenCalledTimes(1));
    const body = mocks.updateJob.mock.calls[0]![0].data.body;
    expect('customFieldValues' in body).toBe(false);
    expect('collectionValues' in body).toBe(false);
  });

  it('renders the fields in layout order and leaves hidden ones out', async () => {
    await renderCreate();

    const description = screen.getByRole('toolbar', {
      name: m.postJob_descriptionLabel(),
    });
    const title = screen.getByLabelText(m.postJob_jobTitleLabel());
    expect(
      description.compareDocumentPosition(title) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByLabelText('Benefits')).toBeInTheDocument();
    expect(screen.queryByLabelText(m.postJob_seniorityLabel())).toBeNull();
    expect(screen.queryByLabelText('Security clearance')).toBeNull();
    // Not in the layout, so not on the form.
    expect(screen.queryByLabelText(m.postJob_salaryMinLabel())).toBeNull();
  });

  it('blocks a create until a required collection field has an entry, then sends its record ids', async () => {
    mocks.createJob.mockResolvedValue({ ok: true, data: { id: 'job-1' } });
    const loadCollectionChoices = await renderCreate();

    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));

    expect(
      await screen.findAllByText(
        m.jobForm_customFieldRequiredError({ field: 'Benefits' }),
      ),
    ).not.toHaveLength(0);
    expect(mocks.createJob).not.toHaveBeenCalled();

    fireEvent.input(screen.getByLabelText('Benefits'), {
      target: { value: 'Paid' },
      inputType: 'insertText',
    });
    fireEvent.click(await screen.findByText('Paid time off'));
    expect(loadCollectionChoices).toHaveBeenCalledWith('benefits', '');
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));

    await waitFor(() => expect(mocks.createJob).toHaveBeenCalledTimes(1));
    const body = mocks.createJob.mock.calls[0]?.[0]?.data.body;
    expect(body.collectionValues).toEqual({ benefits: ['rec-pto'] });
    // The hidden custom field is not collected, so it is not sent.
    expect(body.customFieldValues).toBeUndefined();
    expect(body.seniority).toBeUndefined();
    // A create still sends the employment type the body requires, hidden.
    expect(body.employmentType).toBe('full_time');
  });
});
