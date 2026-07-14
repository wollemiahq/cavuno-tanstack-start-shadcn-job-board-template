'use client';

import { useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  candidateSignInHref,
  candidateVerifyEmailHref,
} from '@/lib/candidate-return-to';
import { cn } from '@/lib/utils';

export function SaveJobButton({
  jobId,
  viewer,
  returnTo,
  labels,
  onSave,
  onSaved,
}: {
  jobId: string;
  viewer: { emailVerified: boolean } | null;
  returnTo: string;
  labels: {
    save: string;
    saving: string;
    saved: string;
    error: string;
  };
  onSave: (jobId: string) => Promise<void>;
  onSaved?: () => Promise<void> | void;
}) {
  const [trackedJobId, setTrackedJobId] = useState(jobId);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );

  if (trackedJobId !== jobId) {
    setTrackedJobId(jobId);
    setState('idle');
  }

  if (!viewer) {
    return (
      <a
        href={candidateSignInHref(returnTo)}
        className={buttonVariants({ variant: 'outline', size: 'lg' })}
      >
        {labels.save}
      </a>
    );
  }

  if (!viewer.emailVerified) {
    return (
      <a
        href={candidateVerifyEmailHref(returnTo)}
        className={buttonVariants({ variant: 'outline', size: 'lg' })}
      >
        {labels.save}
      </a>
    );
  }

  if (state === 'saved') {
    return (
      <a
        href="/account/saved"
        className={buttonVariants({ variant: 'outline', size: 'lg' })}
      >
        {labels.saved}
      </a>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className={cn(state === 'saving' && 'cursor-wait')}
        disabled={state === 'saving'}
        onClick={async () => {
          setState('saving');
          try {
            await onSave(jobId);
            await onSaved?.();
            setState('saved');
          } catch (error) {
            if (String(error).includes('EMAIL_UNVERIFIED')) {
              window.location.assign(candidateVerifyEmailHref(returnTo));
              return;
            }
            setState('error');
          }
        }}
      >
        {state === 'saving' ? labels.saving : labels.save}
      </Button>
      {state === 'error' ? (
        <p role="alert" className="text-destructive text-sm">
          {labels.error}
        </p>
      ) : null}
    </div>
  );
}
