"use client";

import { useState } from "react";

import { useRouter } from "@tanstack/react-router";
import type { CandidateEducation } from "@cavuno/board";

import {
  CandidateActionFeedback,
  type CandidateActionFeedbackState,
} from "@/components/candidate-action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { m } from "../paraglide/messages";
import { createEducation, deleteEducation, updateEducation } from "../server/account";

type Editing = { id: string | null } | null;

type Draft = {
  institutionName: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  description: string;
};

const EMPTY: Draft = {
  institutionName: "",
  degree: "",
  fieldOfStudy: "",
  startDate: "",
  endDate: "",
  description: "",
};

function toDraft(item: CandidateEducation): Draft {
  return {
    institutionName: item.institutionName,
    degree: item.degree ?? "",
    fieldOfStudy: item.fieldOfStudy ?? "",
    startDate: item.startDate ?? "",
    endDate: item.endDate ?? "",
    description: item.description ?? "",
  };
}

/**
 * Education — list + add/edit/delete, over `board.me.profile`'s
 * `listEducation` / `createEducation` / `updateEducation` /
 * `deleteEducation`.
 */
export function EducationSection({ items }: { items: CandidateEducation[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<CandidateActionFeedbackState>("idle");

  const open = (item: CandidateEducation | null) => {
    setEditing({ id: item ? item.id : null });
    setDraft(item ? toDraft(item) : EMPTY);
  };

  const submit = async () => {
    setPending(true);
    setFeedback("idle");
    const body = {
      institutionName: draft.institutionName.trim(),
      degree: draft.degree.trim(),
      fieldOfStudy: draft.fieldOfStudy.trim(),
      startDate: draft.startDate,
      endDate: draft.endDate,
      description: draft.description.trim(),
    };
    try {
      if (editing?.id) {
        await updateEducation({ data: { id: editing.id, body } });
      } else {
        await createEducation({ data: body });
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
    <section className="space-y-3" data-test="education-section">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {m.educationSection_heading()}
        </h2>
        {editing === null ? (
          <Button variant="outline" size="sm" onClick={() => open(null)}>
            {m.educationSection_addLabel()}
          </Button>
        ) : null}
      </div>

      {items.length === 0 && editing === null ? (
        <p className="text-sm text-muted-foreground">{m.educationSection_emptyText()}</p>
      ) : null}

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-border p-3"
          >
            <div>
              <p className="font-medium">{item.institutionName}</p>
              <p className="text-sm text-muted-foreground">
                {[item.degree, item.fieldOfStudy].filter(Boolean).join(", ")}
              </p>
              {item.startDate || item.endDate ? (
                <p className="text-xs text-muted-foreground">
                  {item.startDate ?? "?"} – {item.endDate ?? m.educationSection_presentLabel()}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="sm" onClick={() => open(item)}>
                {m.educationSection_editLabel()}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  setFeedback("idle");
                  try {
                    await deleteEducation({ data: { id: item.id } });
                    await router.invalidate();
                    setFeedback("success");
                  } catch {
                    setFeedback("error");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                {m.educationSection_deleteLabel()}
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
              <Label htmlFor="education-institution">{m.educationSection_institutionLabel()}</Label>
              <Input
                id="education-institution"
                required
                value={draft.institutionName}
                onChange={(event) => setDraft({ ...draft, institutionName: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="education-degree">{m.educationSection_degreeLabel()}</Label>
              <Input
                id="education-degree"
                value={draft.degree}
                onChange={(event) => setDraft({ ...draft, degree: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="education-field">{m.educationSection_fieldOfStudyLabel()}</Label>
              <Input
                id="education-field"
                value={draft.fieldOfStudy}
                onChange={(event) => setDraft({ ...draft, fieldOfStudy: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="education-start">{m.educationSection_startLabel()}</Label>
                <Input
                  id="education-start"
                  type="date"
                  value={draft.startDate}
                  onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="education-end">{m.educationSection_endLabel()}</Label>
                <Input
                  id="education-end"
                  type="date"
                  value={draft.endDate}
                  onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="education-description">{m.educationSection_descriptionLabel()}</Label>
            <Textarea
              id="education-description"
              rows={3}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? m.educationSection_savingLabel() : m.educationSection_saveLabel()}
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
              {m.educationSection_cancelLabel()}
            </Button>
          </div>
        </form>
      ) : null}
      <CandidateActionFeedback state={feedback} />
    </section>
  );
}
