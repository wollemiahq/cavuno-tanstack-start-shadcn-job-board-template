import { describe, expect, it } from 'vitest';

import { isSsoOnly, signInOptionsForAvailable } from './board-sign-in';

import type { BoardRoleSignIn, PublicBoardSignIn } from '@cavuno/board';

const NO_BUILT_INS = {
  password: false,
  magicLink: false,
  google: false,
  linkedin: false,
};
const members = { id: 'conn_members', label: 'Members', logoUrl: null };
const staff = { id: 'conn_staff', label: 'Staff', logoUrl: null };

function role(overrides: Partial<BoardRoleSignIn>): BoardRoleSignIn {
  return { methods: NO_BUILT_INS, ssoConnections: [], ...overrides };
}

const signIn: PublicBoardSignIn = {
  candidate: role({ ssoConnections: [members] }),
  employer: role({ ssoConnections: [staff] }),
};

describe('signInOptionsForAvailable', () => {
  it('keeps the listed built-in methods and ignores unknown keys', () => {
    const options = signInOptionsForAvailable(signIn, 'candidate', {
      methods: ['magicLink', 'passkey'],
      ssoConnectionIds: [],
    });
    expect(options.methods).toEqual({ ...NO_BUILT_INS, magicLink: true });
    expect(options.ssoChoices).toEqual([]);
  });

  it("matches connection ids to the page role first, then the other role's", () => {
    const options = signInOptionsForAvailable(signIn, 'candidate', {
      methods: [],
      ssoConnectionIds: ['conn_staff', 'conn_members', 'conn_gone'],
    });
    expect(options.ssoChoices).toEqual([
      { connection: staff, role: 'employer' },
      { connection: members, role: 'candidate' },
    ]);
  });
});

describe('isSsoOnly', () => {
  it('is true only with connections and no built-in method', () => {
    const choice = { connection: members, role: 'candidate' as const };
    expect(isSsoOnly({ methods: NO_BUILT_INS, ssoChoices: [choice] })).toBe(
      true,
    );
    expect(isSsoOnly({ methods: NO_BUILT_INS, ssoChoices: [] })).toBe(false);
    expect(
      isSsoOnly({
        methods: { ...NO_BUILT_INS, google: true },
        ssoChoices: [choice],
      }),
    ).toBe(false);
  });
});
