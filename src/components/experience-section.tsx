"use client";

import { useState } from "react";

import { useRouter } from "@tanstack/react-router";
import type { CandidateExperience } from "@cavuno/board";

import {
  CandidateActionFeedback,
  type CandidateActionFeedbackState,
} from "@/components/candidate-action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { m } from "../paraglide/messages";
import { createExperience, deleteExperience, updateExperience } from "../server/account";

type Editing = { id: string | null } | null;

type Draft = {
  title: string;
  companyName: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
};

const EMPTY: Draft = {
  title: "",
  companyName: "",
  location: "",
  startDate: "",
  endDate: "",
  description: "",
};

function toDraft(item: CandidateExperience): Draft {
  return {
    title: item.title,
    companyName: item.companyName,
    location: item.location ?? "",
    startDate: item.startDate,
    endDate: item.endDate ?? "",
    description: item.description ?? "",
  };
}

/**
 * Work experience — list + add/edit/delete, over `board.me.profile`'s
 * `listExperience` / `createExperience` / `updateExperience` /
 * `deleteExperience`. The body is a merge-patch on edit (empty clears).
 */
export function ExperienceSection({ items }: { items: CandidateExperience[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<CandidateActionFeedbackState>("idle");

  const open = (item: CandidateExperience | null) => {
    setEditing({ id: item ? item.id : null });
    setDraft(item ? toDraft(item) : EMPTY);
  };

  const submit = async () => {
    setPending(true);
    setFeedback("idle");
    const body = {
      title: draft.title.trim(),
      companyName: draft.companyName.trim(),
      location: draft.location.trim(),
      startDate: draft.startDate,
      endDate: draft.endDate,
      description: draft.description.trim(),
    };
    try {
      if (editing?.id) {
        await updateExperience({ data: { id: editing.id, body } });
      } else {
        await createExperience({ data: body });
      }
      await router.invalidate();
      setEditing(null);
      setDraft(EMPTY);
      setFeedback("success");
    } catch {
      setFeedback("error");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="space-y-3" data-test="experience-section">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {m.experienceSection_heading()}
        </h2>
        {editing === null ? (
          <Button variant="outline" size="sm" onClick={() => open(null)}>
            {m.experienceSection_addLabel()}
          </Button>
        ) : null}
      </div>

      {items.length === 0 && editing === null ? (
        <p className="text-sm text-muted-foreground">{m.experienceSection_emptyText()}</p>
      ) : null}

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-border p-3"
          >
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">
                {item.companyName}
                {item.location ? ` · ${item.location}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.startDate}
                {item.endDate ? ` – ${item.endDate}` : ` – ${m.experienceSection_presentLabel()}`}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="sm" onClick={() => open(item)}>
                {m.experienceSection_editLabel()}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  setFeedback("idle");
                  try {
                    await deleteExperience({ data: { id: item.id } });
                    await router.invalidate();
                    setFeedback("success");
                  } catch {
                    setFeedback("error");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                {m.experienceSection_deleteLabel()}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {editing !== null ? (
        <form
          className="space-y-3 rounded-2xl border border-border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="experience-title">{m.experienceSection_titleLabel()}</Label>
              <Input
                id="experience-title"
                required
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="experience-company">{m.experienceSection_companyLabel()}</Label>
              <Input
                id="experience-company"
                required
                value={draft.companyName}
                onChange={(event) => setDraft({ ...draft, companyName: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="experience-location">{m.experienceSection_locationLabel()}</Label>
              <Input
                id="experience-location"
                value={draft.location}
                onChange={(event) => setDraft({ ...draft, location: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="experience-start">{m.experienceSection_startLabel()}</Label>
                <Input
                  id="experience-start"
                  type="date"
                  required
                  value={draft.startDate}
                  onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="experience-end">{m.experienceSection_endLabel()}</Label>
                <Input
                  id="experience-end"
                  type="date"
                  value={draft.endDate}
                  onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="experience-description">{m.experienceSection_descriptionLabel()}</Label>
            <Textarea
              id="experience-description"
              rows={3}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? m.experienceSection_savingLabel() : m.experienceSection_saveLabel()}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                setEditing(null);
                setDraft(EMPTY);
              }}
            >
              {m.experienceSection_cancelLabel()}
            </Button>
          </div>
        </form>
      ) : null}
      <CandidateActionFeedback state={feedback} />
    </section>
  );
}
