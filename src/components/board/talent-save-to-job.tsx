'use client';

import { useEffect, useState } from 'react';

import { Bookmark, BookmarkCheck, LoaderCircle } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toastActionError } from '@/lib/action-toast';
import { cn } from '@/lib/utils';
import { saveSourcedCandidate } from '@/server/employers';

export type TalentSaveToJobDependencies = {
  saveSourcedCandidate: (input: {
    data: { slug: string; job: string; candidateBoardUserId: string };
  }) => Promise<{ ok: true } | { ok: false; message?: string }>;
};

const talentSaveToJobDependencies: TalentSaveToJobDependencies = {
  saveSourcedCandidate,
};

export function TalentSaveToJob({
  slug,
  jobs,
  candidateBoardUserId,
  boundJobId,
  alreadySaved = false,
  presentation = 'default',
  onSaved,
  dependencies = talentSaveToJobDependencies,
}: {
  slug: string;
  jobs: Array<{ id: string; title: string }>;
  candidateBoardUserId: string;
  boundJobId?: string;
  alreadySaved?: boolean;
  presentation?: 'default' | 'icon';
  onSaved?: () => void;
  dependencies?: TalentSaveToJobDependencies;
}) {
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(alreadySaved);
  const iconOnly = presentation === 'icon';

  useEffect(() => {
    setSaved(alreadySaved);
  }, [alreadySaved, boundJobId, candidateBoardUserId]);

  if (jobs.length === 0) return null;

  function saveTo(job: string) {
    if (!job || pending || saved) return;
    setPending(true);
    void dependencies
      .saveSourcedCandidate({
        data: { slug, job, candidateBoardUserId },
      })
      .then((result) => {
        if (result.ok) {
          setSaved(true);
          onSaved?.();
          return;
        }
        void toastActionError(result.message);
      })
      .catch(() => {
        void toastActionError();
      })
      .finally(() => setPending(false));
  }

  function controlLabel(label: string, filled: boolean) {
    if (!iconOnly) return label;
    const Icon = pending ? LoaderCircle : filled ? BookmarkCheck : Bookmark;
    return (
      <>
        <Icon aria-hidden="true" className={cn(pending && 'animate-spin')} />
        <span className="sr-only">{label}</span>
      </>
    );
  }

  const label = saved ? m.talentSave_savedLabel() : m.talentSave_saveLabel();
  const trigger = (
    <Button
      type="button"
      variant={iconOnly ? 'ghost' : 'outline'}
      size={iconOnly ? 'icon' : 'default'}
      disabled={pending || saved}
      aria-label={label}
      className={cn(pending && 'cursor-wait')}
    />
  );

  if (saved || boundJobId) {
    return (
      <div
        className="relative z-10"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Button
          type="button"
          variant={iconOnly ? 'ghost' : 'outline'}
          size={iconOnly ? 'icon' : 'default'}
          disabled={pending || saved}
          aria-label={label}
          className={cn(pending && 'cursor-wait')}
          onClick={() => {
            if (boundJobId) saveTo(boundJobId);
          }}
        >
          {controlLabel(label, saved)}
        </Button>
      </div>
    );
  }

  return (
    <div
      className="relative z-10"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger render={trigger} aria-haspopup="menu">
          {controlLabel(m.talentSave_saveLabel(), false)}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{m.talentSave_jobLabel()}</DropdownMenuLabel>
            {jobs.map((job) => (
              <DropdownMenuItem key={job.id} onClick={() => saveTo(job.id)}>
                {job.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
