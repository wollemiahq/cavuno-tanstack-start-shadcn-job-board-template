// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useSelectedJob,
  type SelectedJobDependencies,
} from './-use-selected-job';

import type {
  Application,
  PublicCompanyDetail,
  PublicJob,
} from '@cavuno/board';

const getCompany = vi.fn<SelectedJobDependencies['getCompany']>();
const getJob = vi.fn<SelectedJobDependencies['getJob']>();
const myApplicationForJob =
  vi.fn<SelectedJobDependencies['myApplicationForJob']>();
const dependencies: SelectedJobDependencies = {
  getCompany,
  getJob,
  myApplicationForJob,
};

function job(slug: string): PublicJob {
  return {
    id: `id-${slug}`,
    object: 'public_job',
    slug,
    title: slug,
    status: 'published',
    companyId: 'company-1',
    description: null,
    applicationUrl: null,
    company: {
      id: 'company-1',
      slug: null,
      name: null,
      logoUrl: null,
      website: null,
    },
    officeLocations: [],
    placeHierarchy: [],
    categories: [],
    skills: [],
    remoteOption: null,
    remoteWorldwide: false,
    remoteWorkPermitCountryCodes: [],
    remoteWorkPermitSubdivisionCodes: [],
    remotePermits: [],
    remoteAllowedTzOffsets: [],
    remoteSponsorship: 'unknown',
    remoteTimezones: [],
    educationRequirements: [],
    experienceMonths: null,
    experienceInPlaceOfEducation: null,
    inOfficePeriod: null,
    inOfficeFrequency: null,
    customFieldValues: {},
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryTimeframe: null,
    isFeatured: false,
    isSponsored: false,
    applyAction: 'external_direct',
    seniority: null,
    employmentType: null,
    publishedAt: null,
    expiresAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    links: { public: `https://jobs.example/companies/acme/jobs/${slug}` },
  };
}

function company(summary: string): PublicCompanyDetail {
  return {
    id: 'company-1',
    object: 'public_company',
    slug: 'acme',
    name: 'Acme',
    logoUrl: null,
    website: null,
    description: '<p>Full HTML body that must not be used as intro.</p>',
    summary,
    jobCount: 1,
    publishedJobCount: 1,
    salarySampleCount: 0,
    markets: [],
    links: { public: 'https://jobs.example/companies/acme' },
  };
}

const application: Application = {
  id: 'application-1',
  object: 'application',
  status: 'applied',
  appliedAt: '2026-07-14T00:00:00.000Z',
  updatedAt: '2026-07-14T00:00:00.000Z',
  coverNote: null,
  candidateName: null,
  candidateEmail: null,
  candidateLocation: null,
  candidateHeadline: null,
  resumeFilename: null,
  job: null,
};

const jobCompany: NonNullable<PublicJob['company']> = {
  id: 'company-1',
  slug: 'acme',
  name: 'Acme',
  logoUrl: null,
  website: null,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject: (reason?: Error) => void = () => {
    throw new Error('Deferred rejection was not initialized');
  };
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  getCompany.mockReset();
  getJob.mockReset();
  myApplicationForJob.mockReset();
});
afterEach(cleanup);

describe('useSelectedJob', () => {
  it('loads the URL-selected job and preserves the previous pane during transition', async () => {
    getJob.mockResolvedValueOnce(job('first-job'));
    const nextJob = deferred<ReturnType<typeof job>>();
    getJob.mockReturnValueOnce(nextJob.promise);

    const { result, rerender } = renderHook(
      ({ slug }: { slug: string | undefined }) =>
        useSelectedJob(slug, false, undefined, dependencies),
      {
        initialProps: { slug: 'first-job' },
      },
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.job?.slug).toBe('first-job');

    rerender({ slug: 'second-job' });
    await waitFor(() => expect(result.current.status).toBe('loading'));
    expect(result.current.job?.slug).toBe('first-job');

    await act(async () => nextJob.resolve(job('second-job')));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.job?.slug).toBe('second-job');
  });

  it('exposes a recoverable error and retries the same selection', async () => {
    getJob
      .mockRejectedValueOnce(new Error('Temporary outage'))
      .mockResolvedValueOnce(job('first-job'));

    const { result } = renderHook(() =>
      useSelectedJob('first-job', false, undefined, dependencies),
    );

    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(getJob).toHaveBeenCalledTimes(2);
  });

  it('does not fetch when mobile has no pane selection', () => {
    const { result } = renderHook(() =>
      useSelectedJob(undefined, false, undefined, dependencies),
    );

    expect(result.current.status).toBe('idle');
    expect(getJob).not.toHaveBeenCalled();
  });

  it("seeds a verified returning candidate's existing application", async () => {
    getJob.mockResolvedValue(job('first-job'));
    myApplicationForJob.mockResolvedValue(application);

    const { result } = renderHook(() =>
      useSelectedJob('first-job', true, undefined, dependencies),
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(myApplicationForJob).toHaveBeenCalledWith({
      data: { jobSlug: 'first-job' },
    });
    expect(result.current.applicationState).toBe('applied');
  });

  it('still renders the public job when private application state is unavailable', async () => {
    getJob.mockResolvedValue(job('first-job'));
    myApplicationForJob.mockRejectedValue(
      new Error('Private state unavailable'),
    );

    const { result } = renderHook(() =>
      useSelectedJob('first-job', true, undefined, dependencies),
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.job?.slug).toBe('first-job');
    expect(result.current.applicationState).toBe('unknown');
  });

  it('does not request private application state for anonymous or unverified viewers', async () => {
    getJob.mockResolvedValue(job('first-job'));

    const { result } = renderHook(() =>
      useSelectedJob('first-job', false, undefined, dependencies),
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(myApplicationForJob).not.toHaveBeenCalled();
    expect(result.current.applicationState).toBe('not-requested');
  });

  it('loads company summary for the about-company intro (never description HTML)', async () => {
    getJob.mockResolvedValue({
      ...job('first-job'),
      company: jobCompany,
    });
    getCompany.mockResolvedValue(
      company('Acme builds tools for modern product teams.'),
    );

    const { result } = renderHook(() =>
      useSelectedJob('first-job', false, undefined, dependencies),
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(getCompany).toHaveBeenCalledWith({
      data: { companySlug: 'acme' },
    });
    expect(result.current.companySummary).toBe(
      'Acme builds tools for modern product teams.',
    );
  });

  it('fans out job + company in parallel when the list already knows the company slug', async () => {
    const selectedJob = {
      ...job('first-job'),
      company: jobCompany,
    };
    const jobGate = deferred<typeof selectedJob>();
    const companyGate = deferred<PublicCompanyDetail>();
    getJob.mockReturnValueOnce(jobGate.promise);
    getCompany.mockReturnValueOnce(companyGate.promise);

    const { result } = renderHook(() =>
      useSelectedJob('first-job', false, 'acme', dependencies),
    );

    await waitFor(() => expect(getJob).toHaveBeenCalled());
    expect(getCompany).toHaveBeenCalledWith({
      data: { companySlug: 'acme' },
    });
    expect(result.current.status).toBe('loading');

    await act(async () => {
      jobGate.resolve(selectedJob);
      companyGate.resolve(company('Parallel summary.'));
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.companySummary).toBe('Parallel summary.');
  });
});
