import { useCallback, useEffect, useState } from "react";

import type { TalentProfile } from "@cavuno/board";

import { getTalentProfile } from "../server/queries";

export type SelectedTalentState = {
  status: "idle" | "loading" | "ready" | "error";
  profile?: TalentProfile;
  error?: Error;
  retry: () => void;
};

export function useSelectedTalent(handle?: string): SelectedTalentState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<SelectedTalentState, "retry">>({
    status: "idle",
  });

  useEffect(() => {
    if (!handle) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState((previous) => ({
      status: "loading",
      profile: previous.profile,
    }));

    void getTalentProfile({ data: { handle } })
      .then((profile) => {
        if (!cancelled) setState({ status: "ready", profile });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setState((previous) => ({
          status: "error",
          profile: previous.profile,
          error: cause instanceof Error ? cause : new Error(String(cause)),
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, handle]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, retry };
}
