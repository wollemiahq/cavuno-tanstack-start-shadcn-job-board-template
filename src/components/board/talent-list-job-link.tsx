"use client";

import { useState } from "react";

import { Briefcase, LoaderCircle } from "lucide-react";

import { m } from "../../paraglide/messages";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { toastActionError } from "@/lib/action-toast";
import { cn } from "@/lib/utils";
import { updateTalentList, type ActionResult, type TalentListRecord } from "@/server/employers";

const NONE = "__none__";

export type UpdateTalentListFn = (input: {
  data: {
    slug: string;
    listId: string;
    job?: string | null;
  };
}) => Promise<ActionResult<TalentListRecord>>;

export function TalentListJobLink({
  slug,
  listId,
  jobId,
  jobs,
  onUpdated,
  updateList = updateTalentList,
}: {
  slug: string;
  listId: string;
  jobId: string | null;
  jobs: Array<{ id: string; title: string }>;
  onUpdated: (list: TalentListRecord) => void;
  updateList?: UpdateTalentListFn;
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
    void updateList({
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
      filteredItems={items}
      filter={null}
      value={bound?.id ?? NONE}
      itemToStringLabel={labelFor}
      onValueChange={(id) => {
        if (!id || id === (bound?.id ?? NONE)) return;
        bind(id === NONE ? null : id);
      }}
    >
      <ComboboxTrigger
        aria-label={bound ? bound.title : m.talentLists_linkJobEmpty()}
        className="[&>svg:last-child]:hidden"
        render={
          <Button
            type="button"
            variant={filled ? "default" : "outline"}
            disabled={pending}
            className={cn("max-w-56 min-w-0", pending && "cursor-wait")}
          />
        }
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <Briefcase aria-hidden="true" />
        )}
        <span className="truncate">{bound ? bound.title : m.talentLists_linkJobEmpty()}</span>
      </ComboboxTrigger>
      <ComboboxContent
        align="end"
        className="w-max max-w-[min(24rem,var(--available-width))] min-w-56"
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
