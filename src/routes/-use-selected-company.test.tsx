// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useSelectedCompany,
  type SelectedCompanyDependencies,
} from './-use-selected-company';

import type { PublicCompanyDetail, PublicJobCard } from '@cavuno/board';

const getCompany = vi.fn<SelectedCompanyDependencies['getCompany']>();
const getCompanySalarySummary =
  vi.fn<SelectedCompanyDependencies['getCompanySalarySummary']>();
const listCompanyJobs = vi.fn<SelectedCompanyDependencies['listCompanyJobs']>();
const dependencies: SelectedCompanyDependencies = {
  getCompany,
  getCompanySalarySummary,
  listCompanyJobs,
};

type SelectedCompanyProps = { slug: string | undefined };

function company(slug: string): PublicCompanyDetail {
  return {
    id: `id-${slug}`,
    object: 'public_company',
    slug,
    name: slug,
    logoUrl: null,
    website: null,
    description: null,
    summary: null,
    jobCount: 1,
    publishedJobCount: 1,
    salarySampleCount: 1,
    markets: [],
    links: { public: `https://jobs.example/companies/${slug}` },
  };
}

function jobs(slug: string) {
  const job: PublicJobCard = {
    id: `job-${slug}`,
    object: 'job_card',
    slug: `job-${slug}`,
    title: `${slug} job`,
    description: null,
    publishedAt: null,
    employmentType: null,
    remoteOption: null,
    remoteLocationLabel: null,
    remoteWorldwide: false,
    remoteWorkPermitCountryCodes: [],
    locationLabel: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryTimeframe: null,
    isFeatured: false,
    isSponsored: false,
    summary: null,
    company: { slug, name: slug, logoUrl: null },
    categories: [],
    skills: [],
    links: {
      public: `https://jobs.example/companies/${slug}/jobs/job-${slug}`,
    },
  };
  return {
    object: 'list' as const,
    url: `/v1/companies/${slug}/jobs`,
    data: [job],
    hasMore: false,
    nextCursor: null,
    count: 1,
  };
}

function salarySummary(slug: string) {
  return {
    overallSalary: {
      avgMin: 120_000,
      avgMax: 160_000,
      jobCount: slug === 'first-company' ? 4 : 8,
    },
    byCategory: [],
    currency: 'USD',
  };
}

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
  listCompanyJobs.mockReset();
  getCompanySalarySummary.mockReset();
});
afterEach(cleanup);

describe('useSelectedCompany', () => {
  it('loads the URL-selected company and preserves the previous pane during transition', async () => {
    getCompany.mockResolvedValueOnce(company('first-company'));
    listCompanyJobs.mockResolvedValueOnce(jobs('first-company'));
    getCompanySalarySummary.mockResolvedValueOnce(
      salarySummary('first-company'),
    );
    const nextCompany = deferred<ReturnType<typeof company>>();
    getCompany.mockReturnValueOnce(nextCompany.promise);
    listCompanyJobs.mockResolvedValueOnce(jobs('second-company'));
    getCompanySalarySummary.mockResolvedValueOnce(
      salarySummary('second-company'),
    );

    const initialProps: SelectedCompanyProps = { slug: 'first-company' };
    const { result, rerender } = renderHook(
      ({ slug }: { slug: string | undefined }) =>
        useSelectedCompany(slug, dependencies),
      {
        initialProps,
      },
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.company?.slug).toBe('first-company');
    expect(result.current.jobs?.data[0]?.id).toBe('job-first-company');
    expect(result.current.salarySummary?.overallSalary?.jobCount).toBe(4);

    rerender({ slug: 'second-company' });
    await waitFor(() => expect(result.current.status).toBe('loading'));
    expect(result.current.company?.slug).toBe('first-company');
    expect(result.current.jobs?.data[0]?.id).toBe('job-first-company');
    expect(result.current.salarySummary?.overallSalary?.jobCount).toBe(4);

    await act(async () => nextCompany.resolve(company('second-company')));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.company?.slug).toBe('second-company');
    expect(result.current.jobs?.data[0]?.id).toBe('job-second-company');
    expect(result.current.salarySummary?.overallSalary?.jobCount).toBe(8);
    expect(listCompanyJobs).toHaveBeenNthCalledWith(2, {
      data: { companySlug: 'second-company', limit: 4 },
    });
    expect(getCompanySalarySummary).toHaveBeenNthCalledWith(2, {
      data: { companySlug: 'second-company' },
    });
  });

  it('exposes a recoverable error and retries the same selection', async () => {
    getCompany
      .mockRejectedValueOnce(new Error('Temporary outage'))
      .mockResolvedValueOnce(company('first-company'));
    listCompanyJobs.mockResolvedValue(jobs('first-company'));
    getCompanySalarySummary.mockResolvedValue(salarySummary('first-company'));

    const { result } = renderHook(() =>
      useSelectedCompany('first-company', dependencies),
    );

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.message).toBe('Temporary outage');
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(getCompany).toHaveBeenCalledTimes(2);
    expect(listCompanyJobs).toHaveBeenCalledTimes(2);
    expect(getCompanySalarySummary).toHaveBeenCalledTimes(2);
  });

  it('returns to idle without fetching when the detail pane has no selection', async () => {
    getCompany.mockResolvedValueOnce(company('first-company'));
    listCompanyJobs.mockResolvedValueOnce(jobs('first-company'));
    getCompanySalarySummary.mockResolvedValueOnce(
      salarySummary('first-company'),
    );

    const initialProps: SelectedCompanyProps = { slug: 'first-company' };

    const { result, rerender } = renderHook(
      ({ slug }: { slug: string | undefined }) =>
        useSelectedCompany(slug, dependencies),
      {
        initialProps,
      },
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    rerender({ slug: undefined });

    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(result.current.company).toBeUndefined();
    expect(result.current.jobs).toBeUndefined();
    expect(result.current.salarySummary).toBeUndefined();
    expect(getCompany).toHaveBeenCalledTimes(1);
    expect(listCompanyJobs).toHaveBeenCalledTimes(1);
    expect(getCompanySalarySummary).toHaveBeenCalledTimes(1);
  });
});
