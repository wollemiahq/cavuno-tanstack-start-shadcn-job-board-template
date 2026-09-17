import { describe, expect, it } from 'vitest';

import { employerPostDestination } from './employer-post-destination';

const verified = { emailVerified: true };

describe('employerPostDestination', () => {
  it('leaves guests on the public posting form', () => {
    expect(employerPostDestination(null, null)).toEqual({ kind: 'stay' });
  });

  it('waits while verified chrome has not loaded companies', () => {
    expect(employerPostDestination(verified, null)).toEqual({
      kind: 'pending',
    });
  });

  it('sends a single approved company to its posting form', () => {
    expect(
      employerPostDestination(verified, [
        {
          status: 'approved',
          company: { slug: 'acme-ventures' },
        },
      ]),
    ).toEqual({ kind: 'company', slug: 'acme-ventures' });
  });

  it('sends several companies to the dashboard to pick one', () => {
    expect(
      employerPostDestination(verified, [
        { status: 'approved', company: { slug: 'acme' } },
        { status: 'approved', company: { slug: 'globex' } },
      ]),
    ).toEqual({ kind: 'dashboard' });
  });

  it('ignores pending memberships and companies without a slug', () => {
    expect(
      employerPostDestination(verified, [
        { status: 'pending', company: { slug: 'pending-co' } },
        { status: 'approved', company: { slug: null } },
      ]),
    ).toEqual({ kind: 'stay' });
  });
});
