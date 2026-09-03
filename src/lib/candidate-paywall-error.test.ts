import { BoardApiError } from '@cavuno/board';
import { describe, expect, it } from 'vitest';

import { candidateLoaderError } from './candidate-loader-error';
import {
  isCandidatePaywallAccessError,
  throwCandidatePaywallSignal,
} from './candidate-paywall-error';

function boardError(status: number, code: string) {
  return new BoardApiError({
    status,
    code,
    message: 'Refused.',
    raw: {},
  });
}

describe('candidate paywall refusal', () => {
  it('recognises the 403 the board sends when the plan does not unlock a feature', () => {
    expect(
      isCandidatePaywallAccessError(
        boardError(403, 'candidate_paywall_access_required'),
      ),
    ).toBe(true);
  });

  it('is not any other 403', () => {
    expect(
      isCandidatePaywallAccessError(boardError(403, 'auth_forbidden')),
    ).toBe(false);
  });

  it('is not the same code at another status', () => {
    expect(
      isCandidatePaywallAccessError(
        boardError(404, 'candidate_paywall_access_required'),
      ),
    ).toBe(false);
  });

  it('is not a plain error that merely mentions the code', () => {
    expect(
      isCandidatePaywallAccessError(
        new Error('candidate_paywall_access_required'),
      ),
    ).toBe(false);
  });
});

describe('the boundary signal', () => {
  it('rethrows the refusal as a signal the candidate loaders read', () => {
    let thrown: unknown;
    try {
      throwCandidatePaywallSignal(
        boardError(403, 'candidate_paywall_access_required'),
      );
    } catch (error) {
      thrown = error;
    }

    expect(candidateLoaderError(thrown)).toBe('paywall-locked');
  });

  it('passes every other failure through untouched', () => {
    const other = boardError(500, 'internal_error');

    expect(() => throwCandidatePaywallSignal(other)).toThrow(other);
  });

  it('keeps the sign-in and verification signals distinct', () => {
    expect(candidateLoaderError(new Error('UNAUTHENTICATED'))).toBe(
      'unauthenticated',
    );
    expect(candidateLoaderError(new Error('EMAIL_UNVERIFIED'))).toBe(
      'email-unverified',
    );
  });
});
