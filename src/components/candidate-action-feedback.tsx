import { m } from '../paraglide/messages';

import { Alert, AlertDescription } from '@/components/ui/alert';

export type CandidateActionFeedbackState = 'idle' | 'success' | 'error';

export function CandidateActionFeedback({
  state,
}: {
  state: CandidateActionFeedbackState;
}) {
  if (state === 'idle') return null;

  if (state === 'error') {
    return (
      <Alert variant="destructive">
        <AlertDescription>{m.candidateAction_errorText()}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert role="status">
      <AlertDescription>{m.candidateAction_successText()}</AlertDescription>
    </Alert>
  );
}
