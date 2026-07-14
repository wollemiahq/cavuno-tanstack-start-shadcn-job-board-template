import { useCallback, useEffect, useState } from "react";

import type { PublicJob } from "@cavuno/board";

import { getJob } from "../server/queries";
import { myApplicationForJob } from "../server/applications";

export type SelectedJobState = {
  status: "idle" | "loading" | "ready" | "error";
  job?: PublicJob;
  alreadyApplied: boolean;
  error?: Error;
  retry: () => void;
};

export function useSelectedJob(
  jobSlug?: string,
  includeApplicationState = false,
): SelectedJobState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<SelectedJobState, "retry">>({
    status: "idle",
    alreadyApplied: false,
  });

  useEffect(() => {
    if (!jobSlug) {
      setState({ status: "idle", alreadyApplied: false });
      return;
    }

    let cancelled = false;
    setState((previous) => ({
      status: "loading",
      job: previous.job,
      alreadyApplied: previous.alreadyApplied,
    }));

    void Promise.all([
      getJob({ data: { jobSlug } }),
      includeApplicationState
        ? myApplicationForJob({ data: { jobSlug } }).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([job, application]) => {
        if (!cancelled) {
          setState({
            status: "ready",
            job,
            alreadyApplied: application !== null,
          });
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setState((previous) => ({
          status: "error",
          job: previous.job,
          alreadyApplied: previous.alreadyApplied,
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
