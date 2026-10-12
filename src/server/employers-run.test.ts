/**
 * `run()` turns a Board API failure into a `{ ok: false }` result the form can
 * act on. A domain-rule `validation_bad_request` names its refused fields, and
 * those names must survive the server-fn boundary.
 */
import { BoardApiError } from '@cavuno/board';
import { describe, expect, it } from 'vitest';

import { run } from './employers';

type ValidationDetails = {
  workEmail?: string[];
  issues?: Array<{ path: string[]; message: string }>;
};

function rejectWith(details: ValidationDetails) {
  return run(() =>
    Promise.reject(
      new BoardApiError({
        status: 400,
        code: 'validation_bad_request',
        message: 'Use a work email matching the company website domain.',
        details,
        raw: undefined,
      }),
    ),
  );
}

describe('run', () => {
  it('carries the field names a validation failure refused', async () => {
    const result = await rejectWith({ workEmail: ['wire text'] });
    expect(result).toMatchObject({
      ok: false,
      code: 'validation_bad_request',
      fields: ['workEmail'],
    });
  });

  it('reports no fields when the details are not a field map', async () => {
    const result = await rejectWith({
      issues: [{ path: ['workEmail'], message: 'wire text' }],
    });
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('fields');
  });
});
