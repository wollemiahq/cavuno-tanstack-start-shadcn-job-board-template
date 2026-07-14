import { describe, expect, it } from 'vitest';

import { resolveSignupDestination } from './signup-destination';

/**
 * The single sign-up entry-point gate (CAV-514). One pure map from a board's
 * enabled roles to the href every consumer (header Sign up, `/auth/join`
 * loader) routes to:
 *   - both roles → `/auth/join` (the chooser earns its keep),
 *   - candidates only → `/auth/sign-up` (skip the chooser hop),
 *   - employers only → `/auth/employer/sign-up` (skip the chooser hop),
 *   - neither → `null` (no account can be created — hide the entry point).
 */
describe('resolveSignupDestination', () => {
  it('routes to the chooser when both roles are enabled', () => {
    expect(
      resolveSignupDestination({ candidates: true, employers: true }),
    ).toBe('/auth/join');
  });

  it('routes straight to the candidate form when only candidates are enabled', () => {
    expect(
      resolveSignupDestination({ candidates: true, employers: false }),
    ).toBe('/auth/sign-up');
  });

  it('routes straight to the employer form when only employers are enabled', () => {
    expect(
      resolveSignupDestination({ candidates: false, employers: true }),
    ).toBe('/auth/employer/sign-up');
  });

  it('returns null when neither role is enabled', () => {
    expect(
      resolveSignupDestination({ candidates: false, employers: false }),
    ).toBeNull();
  });
});
