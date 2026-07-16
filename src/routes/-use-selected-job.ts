import { useCallback, useEffect, useState } from 'react';

import { myApplicationForJob } from '../server/applications';
import { getCompany, getJob } from '../server/queries';

import type { PublicJob } from '@cavuno/board';

export type SelectedJobState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  job?: PublicJob;
  companyDescription: string | null;
  alreadyApplied: boolean;
  error?: Error;
  retry: () => void;
};

export function useSelectedJob(
  jobSlug?: string,
  includeApplicationState = false,
): SelectedJobState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<SelectedJobState, 'retry'>>({
    status: 'idle',
    alreadyApplied: false,
    companyDescription: null,
  });

  useEffect(() => {
    if (!jobSlug) {
      setState({
        status: 'idle',
        alreadyApplied: false,
        companyDescription: null,
      });
      return;
    }

    let cancelled = false;
    setState((previous) => ({
      status: 'loading',
      job: previous.job,
      alreadyApplied: previous.alreadyApplied,
      companyDescription: previous.companyDescription,
    }));

    const application = includeApplicationState
      ? myApplicationForJob({ data: { jobSlug } }).catch(() => null)
      : Promise.resolve(null);

    void getJob({ data: { jobSlug } })
      .then(async (job) => {
        const company = job.company?.slug
          ? await getCompany({ data: { companySlug: job.company.slug } })
          : null;

        return { job, company, application: await application };
      })
      .then(({ job, company, application }) => {
        if (!cancelled) {
          setState({
            status: 'ready',
            job,
            alreadyApplied: application !== null,
            companyDescription: company?.description ?? null,
          });
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setState((previous) => ({
          status: 'error',
          job: previous.job,
          alreadyApplied: previous.alreadyApplied,
          companyDescription: previous.companyDescription,
          error: cause instanceof Error ? cause : new Error(String(cause)),
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, includeApplicationState, jobSlug]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, retry };
}
