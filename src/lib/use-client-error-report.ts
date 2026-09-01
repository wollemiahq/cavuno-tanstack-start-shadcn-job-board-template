'use client';

import { useEffect } from 'react';

import { reportClientError } from './client-error-report';

/** Report from a route errorComponent — the hosted Ouch equivalent. */
export function useClientErrorReport(error: Error & { digest?: string }) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);
}
