// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getTalentProfile } = vi.hoisted(() => ({ getTalentProfile: vi.fn() }));

vi.mock('../server/queries', () => ({ getTalentProfile }));

import { useSelectedTalent } from './-use-selected-talent';

function profile(handle: string) {
  return {
    object: 'talent_profile',
    handle,
    experiences: [],
    education: [],
    skills: [],
    languages: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

beforeEach(() => getTalentProfile.mockReset());
afterEach(cleanup);

describe('useSelectedTalent', () => {
  it('loads the URL-selected profile and preserves stale detail during transition', async () => {
    getTalentProfile.mockResolvedValueOnce(profile('ada'));
    const nextProfile = deferred<ReturnType<typeof profile>>();
    getTalentProfile.mockReturnValueOnce(nextProfile.promise);

    const { result, rerender } = renderHook(
      ({ handle }) => useSelectedTalent(handle),
      {
        initialProps: { handle: 'ada' as string | undefined },
      },
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    rerender({ handle: 'grace' });
    await waitFor(() => expect(result.current.status).toBe('loading'));
    expect(result.current.profile?.handle).toBe('ada');

    await act(async () => nextProfile.resolve(profile('grace')));
    await waitFor(() => expect(result.current.profile?.handle).toBe('grace'));
  });

  it('exposes a recoverable error and retries the same handle', async () => {
    getTalentProfile
      .mockRejectedValueOnce(new Error('Temporary outage'))
      .mockResolvedValueOnce(profile('ada'));
    const { result } = renderHook(() => useSelectedTalent('ada'));

    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(getTalentProfile).toHaveBeenCalledTimes(2);
  });

  it('returns to idle without fetching when there is no public handle', async () => {
    const { result } = renderHook(() => useSelectedTalent(undefined));
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(getTalentProfile).not.toHaveBeenCalled();
  });
});
