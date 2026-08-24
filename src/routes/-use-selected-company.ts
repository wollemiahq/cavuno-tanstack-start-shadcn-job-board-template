import { useCallback, useEffect, useState } from 'react';

import {
  getCompany,
  getCompanySalarySummary,
  listCompanyJobs,
} from '../server/queries';

import type { PublicCompanyDetail } from '@cavuno/board';

export type SelectedCompanyState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  company?: PublicCompanyDetail;
  jobs?: Awaited<ReturnType<typeof listCompanyJobs>>;
  salarySummary?: Awaited<ReturnType<typeof getCompanySalarySummary>>;
  error?: Error;
  retry: () => void;
};

export type SelectedCompanyDependencies = {
  getCompany: typeof getCompany;
  getCompanySalarySummary: typeof getCompanySalarySummary;
  listCompanyJobs: typeof listCompanyJobs;
};

const selectedCompanyDependencies: SelectedCompanyDependencies = {
  getCompany,
  getCompanySalarySummary,
  listCompanyJobs,
};

export function useSelectedCompany(
  companySlug?: string,
  dependencies: SelectedCompanyDependencies = selectedCompanyDependencies,
): SelectedCompanyState {
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
      jobs: previous.jobs,
      salarySummary: previous.salarySummary,
    }));

    void Promise.all([
      dependencies.getCompany({ data: { companySlug } }),
      dependencies.listCompanyJobs({ data: { companySlug, limit: 4 } }),
      dependencies.getCompanySalarySummary({ data: { companySlug } }),
    ])
      .then(([company, jobs, salarySummary]) => {
        if (!cancelled) {
          setState({ status: 'ready', company, jobs, salarySummary });
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setState((previous) => ({
          status: 'error',
          company: previous.company,
          jobs: previous.jobs,
          salarySummary: previous.salarySummary,
          error: cause instanceof Error ? cause : new Error(String(cause)),
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, companySlug, dependencies]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, retry };
}
