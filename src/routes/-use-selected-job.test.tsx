// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getCompany, getJob, myApplicationForJob } = vi.hoisted(() => ({
  getCompany: vi.fn(),
  getJob: vi.fn(),
  myApplicationForJob: vi.fn(),
}));

vi.mock('../server/queries', () => ({ getCompany, getJob }));
vi.mock('../server/applications', () => ({ myApplicationForJob }));

import { useSelectedJob } from './-use-selected-job';

function job(slug: string) {
  return { id: `id-${slug}`, slug, title: slug };
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
      ({ slug }) => useSelectedJob(slug),
      {
        initialProps: { slug: 'first-job' as string | undefined },
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

    const { result } = renderHook(() => useSelectedJob('first-job'));

    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(getJob).toHaveBeenCalledTimes(2);
  });

  it('does not fetch when mobile has no pane selection', () => {
    const { result } = renderHook(() => useSelectedJob(undefined));

    expect(result.current.status).toBe('idle');
    expect(getJob).not.toHaveBeenCalled();
  });

  it("seeds a verified returning candidate's existing application", async () => {
    getJob.mockResolvedValue(job('first-job'));
    myApplicationForJob.mockResolvedValue({ id: 'application-1' });

    const { result } = renderHook(() => useSelectedJob('first-job', true));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(myApplicationForJob).toHaveBeenCalledWith({
      data: { jobSlug: 'first-job' },
    });
    expect(result.current.alreadyApplied).toBe(true);
  });

  it('still renders the public job when private application state is unavailable', async () => {
    getJob.mockResolvedValue(job('first-job'));
    myApplicationForJob.mockRejectedValue(
      new Error('Private state unavailable'),
    );

    const { result } = renderHook(() => useSelectedJob('first-job', true));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.job?.slug).toBe('first-job');
    expect(result.current.alreadyApplied).toBe(false);
  });

  it('does not request private application state for anonymous or unverified viewers', async () => {
    getJob.mockResolvedValue(job('first-job'));

    const { result } = renderHook(() => useSelectedJob('first-job', false));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(myApplicationForJob).not.toHaveBeenCalled();
    expect(result.current.alreadyApplied).toBe(false);
  });

  it('loads the attached company description for the about-company section', async () => {
    getJob.mockResolvedValue({
      ...job('first-job'),
      company: { slug: 'acme' },
    });
    getCompany.mockResolvedValue({
      slug: 'acme',
      description: '<p>Acme builds tools for modern product teams.</p>',
    });

    const { result } = renderHook(() => useSelectedJob('first-job'));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(getCompany).toHaveBeenCalledWith({
      data: { companySlug: 'acme' },
    });
    expect(result.current.companyDescription).toBe(
      '<p>Acme builds tools for modern product teams.</p>',
    );
  });
});
