import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { EMPLOYER_NOT_MEMBER } from '../lib/employer-not-member';
import { gatedRead } from './board-access';

/** `gatedRead` is the last point at which a `BoardApiError` is still structured. */
const context = {
  boardAccessHeaders: {},
  currentPath: '/companies/acme/jobs/new',
};

/** The shape the SDK's `isBoardApiError` duck-types on. */
function boardApiError(code: string, status: number, message: string) {
  return Object.assign(new Error(message), {
    name: 'BoardApiError',
    status,
    code,
    requestId: 'req_test',
    raw: {},
  });
}

/** Run `gatedRead` over a failing read and return whatever it throws. */
async function thrownBy<T>(error: T) {
  try {
    await gatedRead(context, () => Promise.reject(error));
  } catch (thrown) {
    return thrown;
  }
  throw new Error('expected gatedRead to throw');
}

describe('gatedRead', () => {
  it('passes a successful read through', async () => {
    await expect(gatedRead(context, () => Promise.resolve('ok'))).resolves.toBe(
      'ok',
    );
  });

  it('turns the password wall into a redirect to the challenge', async () => {
    const error = await thrownBy(
      boardApiError('board_password_required', 401, 'Password required'),
    );

    if (!isRedirect(error)) throw new Error('Expected a /password redirect');
    expect(error.options.to).toBe('/password');
    expect(error.options.search).toEqual({
      redirect: '/companies/acme/jobs/new',
    });
  });

  it('turns an unapproved company claim into the loader sentinel', async () => {
    const error = await thrownBy(
      boardApiError(
        'employer_not_member',
        403,
        'You are not an approved member of this company',
      ),
    );

    if (!(error instanceof Error)) throw new Error('expected an Error');
    expect(error.message).toBe(EMPLOYER_NOT_MEMBER);
  });

  it('still recognises the claim when the API rewords its message', async () => {
    const error = await thrownBy(
      boardApiError('employer_not_member', 403, 'Membership pending approval'),
    );

    if (!(error instanceof Error)) throw new Error('expected an Error');
    expect(error.message).toBe(EMPLOYER_NOT_MEMBER);
  });

  it('leaves any other board error unchanged', async () => {
    const original = boardApiError('employer_job_not_found', 404, 'Not found');
    expect(await thrownBy(original)).toBe(original);
  });
});
