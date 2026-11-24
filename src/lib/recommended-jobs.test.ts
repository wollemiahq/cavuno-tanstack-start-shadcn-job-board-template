import { describe, expect, it } from 'vitest';

import { recommendedJobsEmptyKind } from './recommended-jobs';

describe('recommendedJobsEmptyKind', () => {
  it('asks for a resume when there are no skills', () => {
    expect(
      recommendedJobsEmptyKind({
        skillCount: 0,
        interestedRoleCount: 0,
        parseStatus: null,
      }),
    ).toBe('needs-profile');
    expect(
      recommendedJobsEmptyKind({
        skillCount: 0,
        interestedRoleCount: 0,
        parseStatus: 'parsed',
      }),
    ).toBe('needs-profile');
  });

  it('asks for a resume while a parse is pending', () => {
    expect(
      recommendedJobsEmptyKind({
        skillCount: 2,
        interestedRoleCount: 0,
        parseStatus: 'parsing',
      }),
    ).toBe('needs-profile');
  });

  it('is empty when the profile already has signal', () => {
    expect(
      recommendedJobsEmptyKind({
        skillCount: 2,
        interestedRoleCount: 0,
        parseStatus: 'parsed',
      }),
    ).toBe('empty');
  });

  it('counts interested roles as signal without any skills', () => {
    expect(
      recommendedJobsEmptyKind({
        skillCount: 0,
        interestedRoleCount: 1,
        parseStatus: null,
      }),
    ).toBe('empty');
    expect(
      recommendedJobsEmptyKind({
        skillCount: 0,
        interestedRoleCount: 1,
        parseStatus: 'parsing',
      }),
    ).toBe('needs-profile');
  });
});
