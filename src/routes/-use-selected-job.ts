import { useCallback, useEffect, useState } from "react";

import type { PublicJob } from "@cavuno/board";

import { getJob } from "../server/queries";

export type SelectedJobState = {
  status: "idle" | "loading" | "ready" | "error";
  job?: PublicJob;
  error?: Error;
  retry: () => void;
};

export function useSelectedJob(jobSlug?: string): SelectedJobState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<SelectedJobState, "retry">>({ status: "idle" });

  useEffect(() => {
    if (!jobSlug) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState((previous) => ({
      status: "loading",
      job: previous.job,
    }));

    void getJob({ data: { jobSlug } })
      .then((job) => {
        if (!cancelled) setState({ status: "ready", job });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setState((previous) => ({
          status: "error",
          job: previous.job,
          error: cause instanceof Error ? cause : new Error(String(cause)),
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, jobSlug]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, retry };
}
