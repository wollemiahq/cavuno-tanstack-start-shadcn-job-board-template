/**
 * The `/matches` read. Job matches come from a candidate profile, so an
 * employer-only board user gets the employer state and none of the candidate
 * reads (no resume prompt that the API would refuse).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  readRecommendedJobs,
  type RecommendedJobsBoard,
} from './recommended-jobs-read';

const headers = { authorization: 'Bearer token' };

const retrieveMe = vi.fn();
const listRecommended = vi.fn();
const listSkills = vi.fn();
const retrieveResume = vi.fn();

const board = {
  me: {
    retrieve: retrieveMe,
    recommendedJobs: { list: listRecommended },
    profile: { listSkills },
    resume: { retrieve: retrieveResume },
  },
} satisfies RecommendedJobsBoard;

function boardUser(role: 'candidate' | 'employer') {
  return {
    object: 'board_user',
    id: 'user-1',
    role,
    email: 'ada@example.com',
    displayName: 'Ada Lovelace',
    emailVerified: true,
    hasPassword: true,
  };
}

const emptyList = {
  object: 'list',
  data: [],
  hasMore: false,
  nextCursor: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  listRecommended.mockResolvedValue(emptyList);
  listSkills.mockResolvedValue(emptyList);
  retrieveResume.mockResolvedValue({ object: 'resume', parseStatus: null });
});

describe('readRecommendedJobs', () => {
  it('gives an employer the employer state without any candidate reads', async () => {
    retrieveMe.mockResolvedValue(boardUser('employer'));

    await expect(readRecommendedJobs(board, headers)).resolves.toEqual({
      employerOnly: true,
    });
    expect(listRecommended).not.toHaveBeenCalled();
    expect(listSkills).not.toHaveBeenCalled();
    expect(retrieveResume).not.toHaveBeenCalled();
  });

  it('reads the recommendations for a candidate', async () => {
    retrieveMe.mockResolvedValue(boardUser('candidate'));

    await expect(readRecommendedJobs(board, headers)).resolves.toMatchObject({
      employerOnly: false,
      data: [],
      skillCount: 0,
      parseStatus: null,
    });
    expect(listRecommended).toHaveBeenCalledOnce();
  });

  it('still refuses an unverified employer', async () => {
    retrieveMe.mockResolvedValue({
      ...boardUser('employer'),
      emailVerified: false,
    });

    await expect(readRecommendedJobs(board, headers)).rejects.toThrow(
      'EMAIL_UNVERIFIED',
    );
  });
});
