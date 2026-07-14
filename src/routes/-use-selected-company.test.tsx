// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getCompany } = vi.hoisted(() => ({ getCompany: vi.fn() }));

vi.mock('../server/queries', () => ({ getCompany }));

import { useSelectedCompany } from './-use-selected-company';

function company(slug: string) {
  return {
    id: `id-${slug}`,
    slug,
    name: slug,
    markets: [],
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

beforeEach(() => getCompany.mockReset());
afterEach(cleanup);

describe('useSelectedCompany', () => {
  it('loads the URL-selected company and preserves the previous pane during transition', async () => {
    getCompany.mockResolvedValueOnce(company('first-company'));
    const nextCompany = deferred<ReturnType<typeof company>>();
    getCompany.mockReturnValueOnce(nextCompany.promise);

    const { result, rerender } = renderHook(
      ({ slug }) => useSelectedCompany(slug),
      {
        initialProps: { slug: 'first-company' as string | undefined },
      },
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.company?.slug).toBe('first-company');

    rerender({ slug: 'second-company' });
    await waitFor(() => expect(result.current.status).toBe('loading'));
    expect(result.current.company?.slug).toBe('first-company');

    await act(async () => nextCompany.resolve(company('second-company')));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.company?.slug).toBe('second-company');
  });

  it('exposes a recoverable error and retries the same selection', async () => {
    getCompany
      .mockRejectedValueOnce(new Error('Temporary outage'))
      .mockResolvedValueOnce(company('first-company'));

    const { result } = renderHook(() => useSelectedCompany('first-company'));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.message).toBe('Temporary outage');
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(getCompany).toHaveBeenCalledTimes(2);
  });

  it('returns to idle without fetching when the detail pane has no selection', async () => {
    getCompany.mockResolvedValueOnce(company('first-company'));

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
    expect(getCompany).toHaveBeenCalledTimes(1);
  });
});
