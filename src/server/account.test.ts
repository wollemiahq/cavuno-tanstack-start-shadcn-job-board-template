/**
 * The `/account` read serves both roles (hosted parity). A candidate gets the
 * full profile editor's data; an employer-only board user has no candidate
 * profile, so they get the employer profile view (name + avatar) without any
 * of the candidate `/me/profile/*` detail reads.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readAccount, type AccountBoard } from './account';

const headers = { authorization: 'Bearer token' };

const retrieveMe = vi.fn();
const candidateReads = {
  retrieve: vi.fn(),
  listExperience: vi.fn(),
  listEducation: vi.fn(),
  listSkills: vi.fn(),
  listLanguages: vi.fn(),
  retrieveCustomFields: vi.fn(),
  retrieveObjectReferences: vi.fn(),
};
const listSavedJobs = vi.fn();
const retrieveResume = vi.fn();

const emptyList = {
  object: 'list',
  data: [],
  hasMore: false,
  nextCursor: null,
};

const board = {
  me: {
    retrieve: retrieveMe,
    profile: candidateReads,
    savedJobs: { list: listSavedJobs },
    resume: { retrieve: retrieveResume },
  },
} satisfies AccountBoard;

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

beforeEach(() => {
  vi.clearAllMocks();
  candidateReads.retrieve.mockResolvedValue({ object: 'candidate_profile' });
  candidateReads.listExperience.mockResolvedValue(emptyList);
  candidateReads.listEducation.mockResolvedValue(emptyList);
  candidateReads.listSkills.mockResolvedValue(emptyList);
  candidateReads.listLanguages.mockResolvedValue(emptyList);
  candidateReads.retrieveCustomFields.mockResolvedValue(null);
  candidateReads.retrieveObjectReferences.mockResolvedValue(null);
  listSavedJobs.mockResolvedValue(emptyList);
  retrieveResume.mockResolvedValue({ object: 'resume' });
});

describe('readAccount', () => {
  it('reads only the employer profile view for an employer', async () => {
    const me = boardUser('employer');
    retrieveMe.mockResolvedValue(me);
    candidateReads.retrieve.mockResolvedValue({
      object: 'candidate_profile',
      displayName: 'Ada Lovelace',
      avatarUrl: 'https://cdn.example.com/ada.png',
    });

    const account = await readAccount(board, headers);

    expect(account).toEqual({
      role: 'employer',
      me,
      profile: {
        object: 'candidate_profile',
        displayName: 'Ada Lovelace',
        avatarUrl: 'https://cdn.example.com/ada.png',
      },
    });
    expect(candidateReads.retrieve).toHaveBeenCalledWith(undefined, {
      headers,
    });
    const { retrieve: _profile, ...candidateDetailReads } = candidateReads;
    for (const read of Object.values(candidateDetailReads)) {
      expect(read).not.toHaveBeenCalled();
    }
    expect(listSavedJobs).not.toHaveBeenCalled();
    expect(retrieveResume).not.toHaveBeenCalled();
  });

  it('loads the profile editor data for a candidate', async () => {
    const me = boardUser('candidate');
    retrieveMe.mockResolvedValue(me);

    const account = await readAccount(board, headers);

    expect(account).toEqual({
      role: 'candidate',
      me,
      profile: { object: 'candidate_profile' },
      experience: emptyList,
      education: emptyList,
      skills: emptyList,
      languages: emptyList,
      savedJobs: emptyList,
      resume: { object: 'resume' },
      customFields: null,
      objectReferences: null,
    });
    for (const read of Object.values(candidateReads)) {
      expect(read).toHaveBeenCalledTimes(1);
    }
    expect(listSavedJobs).toHaveBeenCalledWith({ limit: 50 }, { headers });
  });

  it('refuses an unverified employer before any profile read', async () => {
    retrieveMe.mockResolvedValue({
      ...boardUser('employer'),
      emailVerified: false,
    });

    await expect(readAccount(board, headers)).rejects.toThrow(
      'EMAIL_UNVERIFIED',
    );
    expect(candidateReads.retrieve).not.toHaveBeenCalled();
  });
});
