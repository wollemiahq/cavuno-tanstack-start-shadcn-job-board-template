'use client';

import { useEffect, useMemo, useState } from 'react';

import { Bookmark, LoaderCircle } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/combobox';
import { toastActionError } from '@/lib/action-toast';
import { talentListDisplayName } from '@/lib/talent-search';
import { cn } from '@/lib/utils';
import { saveSourcedCandidate } from '@/server/employers';

type SaveDestination = {
  id: string;
  name: string;
  jobId: string;
};

function destinationsFrom(args: {
  lists: Array<{ id: string; name: string; jobId: string | null }>;
  jobs: Array<{ id: string; title: string }>;
}): SaveDestination[] {
  const fromLists = args.lists.flatMap((list) =>
    list.jobId
      ? [
          {
            id: list.id,
            name: talentListDisplayName(list.name),
            jobId: list.jobId,
          },
        ]
      : [],
  );
  if (fromLists.length > 0) return fromLists;
  return args.jobs.map((job) => ({
    id: job.id,
    name: job.title,
    jobId: job.id,
  }));
}

function selectedForBound(
  destinations: SaveDestination[],
  boundJobId: string | undefined,
  alreadySaved: boolean,
) {
  if (!alreadySaved || !boundJobId) return [];
  return destinations.filter((destination) => destination.jobId === boundJobId);
}

function sameDestinations(left: SaveDestination[], right: SaveDestination[]) {
  if (left.length !== right.length) return false;
  return left.every((destination, index) => destination.id === right[index]?.id);
}

export function TalentSaveToJob({
  slug,
  jobs,
  lists = [],
  candidateBoardUserId,
  boundJobId,
  alreadySaved = false,
  presentation = 'default',
  onSaved,
}: {
  slug: string;
  jobs: Array<{ id: string; title: string }>;
  lists?: Array<{ id: string; name: string; jobId: string | null }>;
  candidateBoardUserId: string;
  boundJobId?: string;
  alreadySaved?: boolean;
  presentation?: 'default' | 'icon';
  onSaved?: () => void;
}) {
  const destinations = useMemo(
    () => destinationsFrom({ lists, jobs }),
    [lists, jobs],
  );
  const [pendingJobIds, setPendingJobIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<SaveDestination[]>(() =>
    selectedForBound(destinations, boundJobId, alreadySaved),
  );
  const iconOnly = presentation === 'icon';
  const pending = pendingJobIds.length > 0;
  const filled = selected.length > 0;

  useEffect(() => {
    const next = selectedForBound(destinations, boundJobId, alreadySaved);
    setSelected((current) => (sameDestinations(current, next) ? current : next));
    // Re-init when the person or bound job changes, not when list records refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- alreadySaved toggling after a save must not wipe other selections
  }, [boundJobId, candidateBoardUserId]);

  useEffect(() => {
    if (!boundJobId || !alreadySaved) return;
    const bound = destinations.find((destination) => destination.jobId === boundJobId);
    if (!bound) return;
    setSelected((current) =>
      current.some((destination) => destination.jobId === boundJobId)
        ? current
        : [...current, bound],
    );
  }, [alreadySaved, boundJobId, destinations]);

  if (destinations.length === 0) return null;

  function saveTo(job: string) {
    if (!job || pendingJobIds.includes(job)) return;
    setPendingJobIds((current) => [...current, job]);
    const request = Promise.resolve(
      saveSourcedCandidate({
        data: { slug, job, candidateBoardUserId },
      }),
    );
    void request
      .then((result) => {
        if (result.ok) {
          if (!boundJobId || job === boundJobId) onSaved?.();
          return;
        }
        setSelected((current) =>
          current.filter((destination) => destination.jobId !== job),
        );
        void toastActionError(result.message);
      })
      .catch(() => {
        setSelected((current) =>
          current.filter((destination) => destination.jobId !== job),
        );
        void toastActionError();
      })
      .finally(() => {
        setPendingJobIds((current) => current.filter((id) => id !== job));
      });
  }

  function handleValueChange(next: SaveDestination[]) {
    const previousJobs = new Set(selected.map((destination) => destination.jobId));
    if (!sameDestinations(selected, next)) setSelected(next);
    for (const destination of next) {
      if (!previousJobs.has(destination.jobId)) saveTo(destination.jobId);
    }
  }

  const label = filled ? m.talentSave_savedLabel() : m.talentSave_saveLabel();
  const Icon = pending ? LoaderCircle : Bookmark;

  return (
    <div
      className="relative z-10"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Combobox
        multiple
        autoHighlight={false}
        items={destinations}
        value={selected}
        onValueChange={handleValueChange}
        itemToStringLabel={(destination) => destination.name}
        isItemEqualToValue={(item, value) => item.id === value.id}
      >
        <ComboboxTrigger
          aria-label={label}
          className="[&>svg:last-child]:hidden"
          render={
            <Button
              type="button"
              variant={iconOnly ? 'ghost' : 'outline'}
              size={iconOnly ? 'icon' : 'default'}
              disabled={pending}
              className={cn(pending && 'cursor-wait')}
            />
          }
        >
          <Icon
            aria-hidden="true"
            className={cn(pending && 'animate-spin', filled && 'fill-current')}
          />
          {iconOnly ? <span className="sr-only">{label}</span> : label}
        </ComboboxTrigger>
        <ComboboxContent
          align={iconOnly ? 'end' : 'end'}
          className="min-w-56 w-max max-w-[min(24rem,var(--available-width))]"
        >
          <ComboboxEmpty>{m.talentSave_jobLabel()}</ComboboxEmpty>
          <ComboboxList>
            {(destination: SaveDestination) => (
              <ComboboxItem
                key={destination.id}
                value={destination}
                className="whitespace-nowrap"
              >
                {destination.name}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
