import { useCallback, useEffect, useState } from 'react';

import { myApplicationForJob } from '../server/applications';
import { getCompany, getJob } from '../server/queries';

import type { PublicJob } from '@cavuno/board';

export type SelectedJobState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  job?: PublicJob;
  /** Platform company `summary` for the about-card intro (never HTML body). */
  companySummary: string | null;
  /** The company's membership plan name — public identity on the about card. */
  companyMembershipPlanName: string | null;
  /**
   * The private candidate read is independent from the public job. `unknown`
   * keeps the detail readable without turning a failed lookup into permission
   * to submit another application.
   */
  applicationState: 'not-requested' | 'applied' | 'not-applied' | 'unknown';
  error?: Error;
  retry: () => void;
};

export type SelectedJobDependencies = {
  getCompany: typeof getCompany;
  getJob: typeof getJob;
  myApplicationForJob: typeof myApplicationForJob;
};

const selectedJobDependencies: SelectedJobDependencies = {
  getCompany,
  getJob,
  myApplicationForJob,
};

/**
 * Load the master–detail job pane for a URL-selected slug.
 *
 * When the listing already knows `companySlug`, job + company + optional
 * application state fan out in one parallel wave. Company is fetched only
 * for `summary` (about intro); chrome uses `job.company`. Without a known
 * slug, company is chained off the job payload.
 */
export function useSelectedJob(
  jobSlug?: string,
  includeApplicationState = false,
  companySlug?: string | null,
  dependencies: SelectedJobDependencies = selectedJobDependencies,
): SelectedJobState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<SelectedJobState, 'retry'>>({
    status: 'idle',
    companySummary: null,
    companyMembershipPlanName: null,
    applicationState: 'not-requested',
  });

  useEffect(() => {
    if (!jobSlug) {
      setState({
        status: 'idle',
        companySummary: null,
        companyMembershipPlanName: null,
        applicationState: 'not-requested',
      });
      return;
    }

    let cancelled = false;
    setState((previous) => ({
      status: 'loading',
      job: previous.job,
      companySummary: previous.companySummary,
      companyMembershipPlanName: previous.companyMembershipPlanName,
      applicationState: includeApplicationState ? 'unknown' : 'not-requested',
    }));

    const applicationP = includeApplicationState
      ? dependencies
          .myApplicationForJob({ data: { jobSlug } })
          .then((application) =>
            application === null
              ? ({ status: 'not-applied' } as const)
              : ({ status: 'applied' } as const),
          )
          .catch(() => ({ status: 'unknown' }) as const)
      : Promise.resolve({ status: 'not-requested' } as const);

    const knownCompany = companySlug?.trim() || null;

    void (async () => {
      try {
        if (knownCompany) {
          const [job, company, application] = await Promise.all([
            dependencies.getJob({ data: { jobSlug } }),
            dependencies
              .getCompany({ data: { companySlug: knownCompany } })
              .catch(() => null),
            applicationP,
          ]);
          if (cancelled) return;
          setState({
            status: 'ready',
            job,
            companySummary: company?.summary ?? null,
            companyMembershipPlanName: company?.membership?.planName ?? null,
            applicationState: application.status,
          });
          return;
        }

        const [job, application] = await Promise.all([
          dependencies.getJob({ data: { jobSlug } }),
          applicationP,
        ]);
        const resolvedCompanySlug = job.company?.slug ?? null;
        const company = resolvedCompanySlug
          ? await dependencies
              .getCompany({
                data: { companySlug: resolvedCompanySlug },
              })
              .catch(() => null)
          : null;
        if (cancelled) return;
        setState({
          status: 'ready',
          job,
          companySummary: company?.summary ?? null,
          companyMembershipPlanName: company?.membership?.planName ?? null,
          applicationState: application.status,
        });
      } catch (cause: unknown) {
        if (cancelled) return;
        setState((previous) => ({
          status: 'error',
          job: previous.job,
          companySummary: previous.companySummary,
          companyMembershipPlanName: previous.companyMembershipPlanName,
          applicationState: previous.applicationState,
          error: cause instanceof Error ? cause : new Error(String(cause)),
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt, companySlug, dependencies, includeApplicationState, jobSlug]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, retry };
}
