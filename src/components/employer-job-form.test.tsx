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
