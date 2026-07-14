import { m } from "../paraglide/messages";

export type CandidateActionFeedbackState = "idle" | "success" | "error";

export function CandidateActionFeedback({ state }: { state: CandidateActionFeedbackState }) {
  if (state === "idle") return null;

  if (state === "error") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {m.candidateAction_errorText()}
      </p>
    );
  }

  return (
    <p role="status" className="text-sm text-muted-foreground">
      {m.candidateAction_successText()}
    </p>
  );
}
