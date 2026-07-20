// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createJob: vi.fn(),
  updateJob: vi.fn(),
  checkoutJob: vi.fn(),
  invalidate: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useRouter: () => ({
      invalidate: mocks.invalidate,
      navigate: mocks.navigate,
    }),
  };
});

vi.mock('../server/employers', () => ({
  createJob: mocks.createJob,
  updateJob: mocks.updateJob,
  checkoutJob: mocks.checkoutJob,
}));

import { EmployerJobForm } from './employer-job-form';

const suggestions = {
  suggestions: [],
  loading: false,
  onQueryChange: () => {},
};

const plan = {
  object: 'job_posting_plan',
  id: 'plan-growth',
  name: 'Growth',
  description: null,
  kind: 'subscription',
  isRecommended: false,
  prices: [{ isActive: true, currency: 'usd', amountCents: 9900 }],
} as never;

const draftJob = {
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
  company: {},
  officeLocations: [{ displayName: 'Berlin, Germany' }],
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
  it('prefills the role fields from an existing job in edit mode', () => {
    render(
      <EmployerJobForm
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'draft' }}
        job={draftJob as never}
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

    const { container } = render(
      <EmployerJobForm
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'draft' }}
        job={draftJob as never}
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

  it('hides the plan picker when editing a published job', () => {
    render(
      <EmployerJobForm
        slug="acme"
        locale="en-AU"
        remotePermits={null}
        plans={[plan]}
        billingOptions={[]}
        officeLocationSuggestions={suggestions}
        mode={{ kind: 'edit', jobId: 'job-1', status: 'published' }}
        job={{ ...draftJob, status: 'published' } as never}
      />,
    );

    expect(
      screen.queryByRole('radio', { name: /Growth/ }),
    ).not.toBeInTheDocument();
  });

  it('requires a billing choice before a create can publish', async () => {
    const { container } = render(
      <EmployerJobForm
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
