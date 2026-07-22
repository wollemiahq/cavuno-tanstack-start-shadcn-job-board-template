'use client';

import { useState } from 'react';

import { Bookmark, BookmarkCheck, LoaderCircle } from 'lucide-react';

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
  presentation = 'default',
  block = false,
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
  presentation?: 'default' | 'icon';
  /** Fill the container width — for the sidebar's two-up actions row. */
  block?: boolean;
}) {
  const [trackedJobId, setTrackedJobId] = useState(jobId);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );

  if (trackedJobId !== jobId) {
    setTrackedJobId(jobId);
    setState('idle');
  }

  const iconOnly = presentation === 'icon';
  const controlVariant = iconOnly ? 'ghost' : 'outline';
  const controlSize = iconOnly ? 'icon' : 'lg';
  // Full-width only makes sense for the text presentation (icon stays square).
  const blockClass = block && !iconOnly ? 'w-full' : undefined;

  function controlLabel(
    label: string,
    controlState: 'idle' | 'saving' | 'saved',
  ) {
    if (!iconOnly) return label;

    const Icon =
      controlState === 'saving'
        ? LoaderCircle
        : controlState === 'saved'
          ? BookmarkCheck
          : Bookmark;

    return (
      <>
        <Icon
          aria-hidden="true"
          className={cn(controlState === 'saving' && 'animate-spin')}
        />
        <span className="sr-only">{label}</span>
      </>
    );
  }

  if (!viewer) {
    return (
      <a
        href={candidateSignInHref(returnTo)}
        data-presentation={presentation}
        className={cn(
          buttonVariants({
            variant: controlVariant,
            size: controlSize,
          }),
          blockClass,
        )}
      >
        {controlLabel(labels.save, 'idle')}
      </a>
    );
  }

  if (!viewer.emailVerified) {
    return (
      <a
        href={candidateVerifyEmailHref(returnTo)}
        data-presentation={presentation}
        className={cn(
          buttonVariants({
            variant: controlVariant,
            size: controlSize,
          }),
          blockClass,
        )}
      >
        {controlLabel(labels.save, 'idle')}
      </a>
    );
  }

  if (state === 'saved') {
    return (
      <a
        href="/account/saved"
        data-presentation={presentation}
        className={cn(
          buttonVariants({
            variant: controlVariant,
            size: controlSize,
          }),
          blockClass,
        )}
      >
        {controlLabel(labels.saved, 'saved')}
      </a>
    );
  }

  return (
    <div
      className={cn('flex flex-col gap-1', iconOnly && 'relative', blockClass)}
    >
      <Button
        type="button"
        variant={iconOnly ? 'ghost' : 'outline'}
        size={iconOnly ? 'icon' : 'lg'}
        data-presentation={presentation}
        className={cn(state === 'saving' && 'cursor-wait', blockClass)}
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
        {controlLabel(
          state === 'saving' ? labels.saving : labels.save,
          state === 'saving' ? 'saving' : 'idle',
        )}
      </Button>
      {state === 'error' ? (
        <p
          role="alert"
          className={cn('text-destructive text-sm', iconOnly && 'sr-only')}
        >
          {labels.error}
        </p>
      ) : null}
    </div>
  );
}
