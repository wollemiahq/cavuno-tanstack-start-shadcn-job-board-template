import { BoardApiError, isNotFound } from '@cavuno/board';
import { describe, expect, it } from 'vitest';

import { boardApiErrorAdapter } from './board-api-error-serialization';

function roundTrip(error: BoardApiError): BoardApiError {
  return boardApiErrorAdapter.fromSerializable(
    boardApiErrorAdapter.toSerializable(error),
  );
}

describe('BoardApiError serialization', () => {
  it('keeps a Board API 404 a not-found error on the client', () => {
    const received = roundTrip(
      new BoardApiError({
        status: 404,
        code: 'jobs_not_found',
        message: 'Job not found',
        requestId: 'req_1',
        raw: undefined,
      }),
    );

    expect(isNotFound(received)).toBe(true);
    expect(received).toMatchObject({
      status: 404,
      code: 'jobs_not_found',
      message: 'Job not found',
      requestId: 'req_1',
    });
  });

  it('leaves the response body and details on the server', () => {
    const wire = boardApiErrorAdapter.toSerializable(
      new BoardApiError({
        status: 403,
        code: 'unknown_error',
        message: 'Forbidden',
        details: { field: 'x' },
        raw: '<!DOCTYPE html><title>Attention Required!</title>',
      }),
    );

    expect(wire).toEqual({
      status: 403,
      code: 'unknown_error',
      message: 'Forbidden',
      requestId: null,
    });
  });

  it('claims only Board API errors', () => {
    expect(boardApiErrorAdapter.test(new Error('Job not found'))).toBe(false);
    expect(
      boardApiErrorAdapter.test(
        new BoardApiError({
          status: 500,
          code: 'x',
          message: 'x',
          raw: undefined,
        }),
      ),
    ).toBe(true);
  });
});
