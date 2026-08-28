// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useSelectedTalent,
  type SelectedTalentDependencies,
} from './-use-selected-talent';

import type { TalentProfile } from '@cavuno/board';

const getTalentProfile =
  vi.fn<SelectedTalentDependencies['getTalentProfile']>();
const dependencies: SelectedTalentDependencies = { getTalentProfile };

function profile(handle: string): TalentProfile {
  return {
    object: 'talent_profile',
    id: 'talent_prof_selected',
    handle,
    displayName: handle,
    headline: null,
    location: null,
    bio: null,
    avatarUrl: null,
    jobSearchStatus: null,
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
      ({ handle }: { handle: string | undefined }) =>
        useSelectedTalent(handle, dependencies),
      {
        initialProps: { handle: 'ada' },
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
    const { result } = renderHook(() => useSelectedTalent('ada', dependencies));

    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(getTalentProfile).toHaveBeenCalledTimes(2);
  });

  it('returns to idle without fetching when there is no public handle', async () => {
    const { result } = renderHook(() =>
      useSelectedTalent(undefined, dependencies),
    );
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(getTalentProfile).not.toHaveBeenCalled();
  });
});
