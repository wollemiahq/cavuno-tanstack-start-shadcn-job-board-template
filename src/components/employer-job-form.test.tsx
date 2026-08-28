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

import type { EmployerJob, JobPostingPlan } from '@cavuno/board';

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
        expect.objectContaining({ to: '/employers/companies/$slug' }),
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

  it('keeps a saved edit committed when list reconciliation fails', async () => {
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

    expect(await screen.findByRole('status')).toHaveTextContent(
      /change was saved/i,
    );
    expect(mocks.updateJob).toHaveBeenCalledOnce();
    expect(mocks.navigate).not.toHaveBeenCalled();
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
