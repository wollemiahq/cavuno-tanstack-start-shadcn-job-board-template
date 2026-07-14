import { useCallback, useEffect, useState } from 'react';

import { getCompany } from '../server/queries';

import type { PublicCompanyDetail } from '@cavuno/board';

export type SelectedCompanyState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  company?: PublicCompanyDetail;
  error?: Error;
  retry: () => void;
};

export function useSelectedCompany(companySlug?: string): SelectedCompanyState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<SelectedCompanyState, 'retry'>>({
    status: 'idle',
  });

  useEffect(() => {
    if (!companySlug) {
      setState({ status: 'idle' });
      return;
    }

    let cancelled = false;
    setState((previous) => ({
      status: 'loading',
      company: previous.company,
    }));

    void getCompany({ data: { companySlug } })
      .then((company) => {
        if (!cancelled) setState({ status: 'ready', company });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setState((previous) => ({
          status: 'error',
          company: previous.company,
          error: cause instanceof Error ? cause : new Error(String(cause)),
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, companySlug]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, retry };
}
