// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getCompany, getCompanySalarySummary, listCompanyJobs } = vi.hoisted(
  () => ({
    getCompany: vi.fn(),
    getCompanySalarySummary: vi.fn(),
    listCompanyJobs: vi.fn(),
  }),
);

vi.mock('../server/queries', () => ({
  getCompany,
  getCompanySalarySummary,
  listCompanyJobs,
}));

import { useSelectedCompany } from './-use-selected-company';

function company(slug: string) {
  return {
    id: `id-${slug}`,
    slug,
    name: slug,
    markets: [],
  };
}

function jobs(slug: string) {
  return {
    data: [{ id: `job-${slug}`, slug: `job-${slug}`, title: `${slug} job` }],
    hasMore: false,
    nextCursor: null,
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
  let reject!: (reason?: unknown) => void;
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

    const { result, rerender } = renderHook(
      ({ slug }) => useSelectedCompany(slug),
      {
        initialProps: { slug: 'first-company' as string | undefined },
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

    const { result } = renderHook(() => useSelectedCompany('first-company'));

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

    const { result, rerender } = renderHook(
      ({ slug }) => useSelectedCompany(slug),
      {
        initialProps: { slug: 'first-company' as string | undefined },
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
