'use client';

import { useEffect } from 'react';

import { reportClientError } from './client-error-report';

/** Report from a route errorComponent — the hosted Ouch equivalent. */
export function useClientErrorReport(error: unknown) {
  useEffect(() => {
    // Route boundaries type the thrown value as `unknown`; anything can be thrown.
    reportClientError(
      error instanceof Error ? error : new Error(String(error)),
    );
  }, [error]);
}
