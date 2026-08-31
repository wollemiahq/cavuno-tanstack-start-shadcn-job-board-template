"use client";

import { useId, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { List } from "lucide-react";

import { m } from "../../paraglide/messages";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { boardErrorMessage } from "@/lib/board-error-message";
import {
  filtersFromJob,
  listFiltersToTalentSearch,
  talentListDisplayName,
  type TalentListFilters,
} from "@/lib/talent-search";
import { createTalentList, type TalentListRecord } from "@/server/employers";

export function TalentListsPicker({
  slug,
  lists,
  jobs,
  selectedListId,
  currentFilters,
  onListsChange,
}: {
  slug: string;
  lists: TalentListRecord[];
  jobs: Array<{ id: string; title: string }>;
  selectedListId?: string;
  currentFilters: TalentListFilters;
  onListsChange: (lists: TalentListRecord[]) => void;
}) {
  const navigate = useNavigate({ from: "/talent/" });
  const [createOpen, setCreateOpen] = useState(false);
  const selected = lists.find((list) => list.id === selectedListId);
  const triggerName = selected ? talentListDisplayName(selected.name) : undefined;

  function selectList(list: TalentListRecord | null) {
    if (!list) {
      void navigate({
        search: (previous) => ({
          q: previous.q,
          place: previous.place,
        }),
      });
      return;
    }
    void navigate({
      search: {
        ...listFiltersToTalentSearch(list.filters),
        list: list.id,
        selectedTalent: undefined,
      },
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="max-w-56 min-w-0"
              aria-haspopup="menu"
              aria-label={
                triggerName
                  ? `${m.talentLists_triggerLabel()}, ${triggerName}`
                  : m.talentLists_triggerLabel()
              }
            />
          }
        >
          <List aria-hidden="true" />
          <span className="truncate">{triggerName ?? m.talentLists_triggerLabel()}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          {lists.map((list) => (
            <DropdownMenuCheckboxItem
              key={list.id}
              checked={list.id === selectedListId}
              onCheckedChange={() =>
                selectList(list.id === selectedListId ? null : list)
              }
            >
              <span className="min-w-0 truncate">
                {talentListDisplayName(list.name)}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            {m.talentLists_newList()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateListDialog
        slug={slug}
        jobs={jobs}
        currentFilters={currentFilters}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(list) => {
          onListsChange([list, ...lists]);
          selectList(list);
        }}
      />
    </>
  );
}

function CreateListDialog({
  slug,
  jobs,
  currentFilters,
  open,
  onOpenChange,
  onCreated,
}: {
  slug: string;
  jobs: Array<{ id: string; title: string }>;
  currentFilters: TalentListFilters;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (list: TalentListRecord) => void;
}) {
  const nameId = useId();
  const blankKindId = useId();
  const jobKindId = useId();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"blank" | "job">("blank");
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function close(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setName("");
      setKind("blank");
      setJobId(jobs[0]?.id ?? "");
      setError(null);
      setPending(false);
    }
  }

  function selectKind(next: "blank" | "job") {
    setKind(next);
    if (next === "job") {
      const job = jobs.find((row) => row.id === jobId) ?? jobs[0];
      if (job) {
        setJobId(job.id);
        setName(job.title);
      }
    }
  }

  function selectJob(nextJobId: string) {
    setJobId(nextJobId);
    const job = jobs.find((row) => row.id === nextJobId);
    if (job) setName(job.title);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="overscroll-contain">
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            const nextName = name.trim();
            if (!nextName) {
              setError(m.talentLists_nameRequired());
              return;
            }
            if (kind === "job" && !jobId) {
              setError(m.talentLists_jobRequired());
              return;
            }
            const job = jobs.find((row) => row.id === jobId);
            const filters = kind === "job" && job ? filtersFromJob(job) : currentFilters;
            setPending(true);
            setError(null);
            const payload =
              kind === "job"
                ? { slug, name: nextName, filters, job: jobId }
                : { slug, name: nextName, filters };
            void createTalentList({ data: payload })
              .then((result) => {
                if (!result.ok) {
                  setError(boardErrorMessage({ code: result.code }));
                  return;
                }
                onCreated(result.data);
                close(false);
              })
              .catch(() => {
                setError(boardErrorMessage({ code: "unknown" }));
              })
              .finally(() => setPending(false));
          }}
        >
          <DialogHeader>
            <DialogTitle>{m.talentLists_createTitle()}</DialogTitle>
            <DialogDescription>{m.talentLists_createDescription()}</DialogDescription>
          </DialogHeader>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor={nameId}>{m.talentLists_nameLabel()}</FieldLabel>
            <Input
              id={nameId}
              name="name"
              autoComplete="off"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={m.talentLists_namePlaceholder()}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
          <FieldSet>
            <FieldLegend variant="label">{m.talentLists_kindLabel()}</FieldLegend>
            <RadioGroup
              name="kind"
              value={kind}
              onValueChange={(value) => selectKind(value === "job" ? "job" : "blank")}
              className="gap-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id={blankKindId} value="blank" />
                <Label htmlFor={blankKindId} className="font-normal">
                  {m.talentLists_kindBlank()}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id={jobKindId} value="job" disabled={jobs.length === 0} />
                <Label htmlFor={jobKindId} className="font-normal">
                  {m.talentLists_kindJob()}
                </Label>
              </div>
            </RadioGroup>
          </FieldSet>
          {kind === "job" ? (
            <Field>
              <FieldLabel htmlFor="talent-list-job">{m.talentLists_jobLabel()}</FieldLabel>
              <select
                id="talent-list-job"
                name="job"
                value={jobId}
                onChange={(event) => selectJob(event.target.value)}
                className="border-input bg-background h-8 rounded-md border px-2 text-sm"
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => close(false)}>
              {m.jobSearch_cancelLabel()}
            </Button>
            <Button type="submit" disabled={pending}>
              {m.talentLists_createSubmit()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
