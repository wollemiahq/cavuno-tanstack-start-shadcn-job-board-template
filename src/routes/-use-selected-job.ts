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

/**
 * Load the master–detail job pane for a URL-selected slug.
 *
 * When the listing already knows `companySlug` (every PublicJobCard does),
 * job + company + optional application state fan out in one parallel wave.
 * Without a known company, company is chained off the job payload (same
 * total work, one serial hop only when the list did not supply a slug).
 */
export function useSelectedJob(
  jobSlug?: string,
  includeApplicationState = false,
  companySlug?: string | null,
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

    const applicationP = includeApplicationState
      ? myApplicationForJob({ data: { jobSlug } }).catch(() => null)
      : Promise.resolve(null);

    const knownCompany = companySlug?.trim() || null;

    void (async () => {
      try {
        if (knownCompany) {
          const [job, company, application] = await Promise.all([
            getJob({ data: { jobSlug } }),
            getCompany({ data: { companySlug: knownCompany } }).catch(
              () => null,
            ),
            applicationP,
          ]);
          if (cancelled) return;
          setState({
            status: 'ready',
            job,
            alreadyApplied: application !== null,
            companyDescription: company?.description ?? null,
          });
          return;
        }

        const [job, application] = await Promise.all([
          getJob({ data: { jobSlug } }),
          applicationP,
        ]);
        const resolvedCompanySlug = job.company?.slug ?? null;
        const company = resolvedCompanySlug
          ? await getCompany({
              data: { companySlug: resolvedCompanySlug },
            }).catch(() => null)
          : null;
        if (cancelled) return;
        setState({
          status: 'ready',
          job,
          alreadyApplied: application !== null,
          companyDescription: company?.description ?? null,
        });
      } catch (cause: unknown) {
        if (cancelled) return;
        setState((previous) => ({
          status: 'error',
          job: previous.job,
          alreadyApplied: previous.alreadyApplied,
          companyDescription: previous.companyDescription,
          error: cause instanceof Error ? cause : new Error(String(cause)),
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt, companySlug, includeApplicationState, jobSlug]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, retry };
}
