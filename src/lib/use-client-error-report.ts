'use client';

import { useEffect } from 'react';

import { reportClientError } from './client-error-report';

/**
 * Report from a route errorComponent — the hosted Ouch equivalent. Route
 * boundaries type the thrown value as `unknown`, since anything can be thrown.
 */
export function useClientErrorReport(cause: unknown) {
  useEffect(() => {
    reportClientError(
      cause instanceof Error ? cause : new Error(String(cause), { cause }),
    );
  }, [cause]);
}
