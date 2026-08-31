'use client';

import { useState } from 'react';

import { Briefcase, LoaderCircle } from 'lucide-react';

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
import { cn } from '@/lib/utils';
import { updateTalentList, type TalentListRecord } from '@/server/employers';

const NONE = '__none__';

function selectString(nextValue: unknown): string | undefined {
  if (typeof nextValue === 'string') return nextValue;
  if (
    nextValue &&
    typeof nextValue === 'object' &&
    'value' in nextValue &&
    typeof nextValue.value === 'string'
  ) {
    return nextValue.value;
  }
  return undefined;
}

export function TalentListJobLink({
  slug,
  listId,
  jobId,
  jobs,
  onUpdated,
}: {
  slug: string;
  listId: string;
  jobId: string | null;
  jobs: Array<{ id: string; title: string }>;
  onUpdated: (list: TalentListRecord) => void;
}) {
  const [pending, setPending] = useState(false);
  const bound = jobs.find((job) => job.id === jobId);
  const items = [NONE, ...jobs.map((job) => job.id)];
  const filled = Boolean(bound);

  function labelFor(id: string) {
    if (id === NONE) return m.talentLists_linkJobNone();
    return jobs.find((job) => job.id === id)?.title ?? id;
  }

  function bind(nextJobId: string | null) {
    if (pending) return;
    if ((nextJobId ?? null) === (jobId ?? null)) return;
    setPending(true);
    void updateTalentList({
      data: { slug, listId, job: nextJobId },
    })
      .then((result) => {
        if (result.ok) {
          onUpdated(result.data);
          return;
        }
        void toastActionError(result.message);
      })
      .catch(() => {
        void toastActionError();
      })
      .finally(() => setPending(false));
  }

  if (jobs.length === 0) return null;

  return (
    <Combobox
      autoHighlight={false}
      items={items}
      value={bound?.id ?? NONE}
      itemToStringLabel={labelFor}
      onValueChange={(next) => {
        const id = selectString(next);
        if (!id || id === (bound?.id ?? NONE)) return;
        bind(id === NONE ? null : id);
      }}
    >
      <ComboboxTrigger
        aria-label={filled ? bound.title : m.talentLists_linkJobEmpty()}
        className="[&>svg:last-child]:hidden"
        render={
          <Button
            type="button"
            variant={filled ? 'default' : 'outline'}
            disabled={pending}
            className={cn('max-w-56 min-w-0', pending && 'cursor-wait')}
          />
        }
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <Briefcase aria-hidden="true" className={cn(filled && 'fill-current')} />
        )}
        <span className="truncate">
          {filled ? bound.title : m.talentLists_linkJobEmpty()}
        </span>
      </ComboboxTrigger>
      <ComboboxContent
        align="end"
        className="min-w-56 w-max max-w-[min(24rem,var(--available-width))]"
      >
        <ComboboxEmpty>{m.talentLists_linkJobEmpty()}</ComboboxEmpty>
        <ComboboxList>
          {(id: string) => (
            <ComboboxItem key={id} value={id} className="whitespace-nowrap">
              {labelFor(id)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
