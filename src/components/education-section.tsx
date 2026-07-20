'use client';

import { useState } from 'react';

import { formatMonthYear } from '@cavuno/board/format';
import { useRouter } from '@tanstack/react-router';
import { GraduationCap, Pencil, Trash2 } from 'lucide-react';

import { m } from '../paraglide/messages';
import {
  createEducation,
  deleteEducation,
  updateEducation,
} from '../server/account';

import { MonthYearField } from '@/components/month-year-field';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { toastActionError } from '@/lib/action-toast';
import type { CandidateEducation } from '@cavuno/board';

type Editing = { id: string | null } | null;

type Draft = {
  institutionName: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  /** Actual or expected — education always has one (the LinkedIn model). */
  endDate: string;
  description: string;
};

const EMPTY: Draft = {
  institutionName: '',
  degree: '',
  fieldOfStudy: '',
  startDate: '',
  endDate: '',
  description: '',
};

function toDraft(item: CandidateEducation): Draft {
  return {
    institutionName: item.institutionName,
    degree: item.degree ?? '',
    fieldOfStudy: item.fieldOfStudy ?? '',
    startDate: item.startDate ?? '',
    endDate: item.endDate ?? '',
    description: item.description ?? '',
  };
}

/** Month-granular display for stored `YYYY-MM-DD` / `YYYY-MM-01` dates. */
function monthLabel(language: string, value: string | null): string {
  if (!value) return '';
  return formatMonthYear(language, value);
}

/**
 * Education — list + add/edit/delete, over `board.me.profile`'s
 * `listEducation` / `createEducation` / `updateEducation` /
 * `deleteEducation`. Dates are month-granular (stored as `YYYY-MM-01`).
 */
export function EducationSection({
  items,
  language,
}: {
  items: CandidateEducation[];
  language: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pending, setPending] = useState(false);

  const open = (item: CandidateEducation | null) => {
    setEditing({ id: item ? item.id : null });
    setDraft(item ? toDraft(item) : EMPTY);
  };

  const submit = async () => {
    setPending(true);
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
    } catch {
      void toastActionError();
    } finally {
      setPending(false);
    }
  };

  const editorForm =
    editing !== null ? (
      <form
        key={editing.id ?? 'new'}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <FieldGroup className="gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="education-institution">
                {m.educationSection_institutionLabel()}
              </FieldLabel>
              <Input
                id="education-institution"
                required
                value={draft.institutionName}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    institutionName: event.target.value,
                  })
                }
              />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="education-degree">
                {m.educationSection_degreeLabel()}
              </FieldLabel>
              <Input
                id="education-degree"
                value={draft.degree}
                onChange={(event) =>
                  setDraft({ ...draft, degree: event.target.value })
                }
              />
            </Field>
            <Field className="gap-1.5 sm:col-span-2">
              <FieldLabel htmlFor="education-field">
                {m.educationSection_fieldOfStudyLabel()}
              </FieldLabel>
              <Input
                id="education-field"
                value={draft.fieldOfStudy}
                onChange={(event) =>
                  setDraft({ ...draft, fieldOfStudy: event.target.value })
                }
              />
            </Field>
            <MonthYearField
              idPrefix="education-start"
              label={m.educationSection_startLabel()}
              language={language}
              defaultValue={draft.startDate}
              onChange={(startDate) =>
                setDraft((prev) => ({ ...prev, startDate }))
              }
              monthAriaLabel={m.monthYearField_monthPlaceholder()}
              yearAriaLabel={m.monthYearField_yearPlaceholder()}
              monthPlaceholder={m.monthYearField_monthPlaceholder()}
              yearPlaceholder={m.monthYearField_yearPlaceholder()}
            />
            <MonthYearField
              idPrefix="education-end"
              label={m.educationSection_endLabel()}
              language={language}
              defaultValue={draft.endDate}
              onChange={(endDate) => setDraft((prev) => ({ ...prev, endDate }))}
              monthAriaLabel={m.monthYearField_monthPlaceholder()}
              yearAriaLabel={m.monthYearField_yearPlaceholder()}
              monthPlaceholder={m.monthYearField_monthPlaceholder()}
              yearPlaceholder={m.monthYearField_yearPlaceholder()}
            />
          </div>
          <Field className="gap-1.5">
            <FieldLabel htmlFor="education-description">
              {m.educationSection_descriptionLabel()}
            </FieldLabel>
            <Textarea
              id="education-description"
              rows={3}
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
            />
          </Field>
          {/* Overlay editors right-align their footer, Cancel before the
              primary — the Dialog/Sheet/AlertDialog convention. */}
          <div className="flex justify-end gap-2">
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
            <Button type="submit" size="sm" disabled={pending}>
              {pending
                ? m.educationSection_savingLabel()
                : m.educationSection_saveLabel()}
            </Button>
          </div>
        </FieldGroup>
      </form>
    ) : null;

  const addButton = (
    <Button variant="outline" size="sm" onClick={() => open(null)}>
      {m.educationSection_addLabel()}
    </Button>
  );

  return (
    <Card data-test="education-section" id="education">
      <CardHeader>
        <CardTitle>
          <h2>{m.educationSection_heading()}</h2>
        </CardTitle>
        {items.length > 0 ? <CardAction>{addButton}</CardAction> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <Empty className="border-0 p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GraduationCap aria-hidden="true" />
              </EmptyMedia>
              <EmptyDescription>
                {m.educationSection_emptyText()}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>{addButton}</EmptyContent>
          </Empty>
        ) : null}

        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item) => (
              <Item key={item.id} variant="outline" size="sm" render={<li />}>
                <ItemContent>
                  <ItemTitle>{item.institutionName}</ItemTitle>
                  <ItemDescription>
                    {[item.degree, item.fieldOfStudy]
                      .filter(Boolean)
                      .join(', ')}
                  </ItemDescription>
                  {item.startDate || item.endDate ? (
                    <ItemDescription className="text-xs">
                      {monthLabel(language, item.startDate)} –{' '}
                      {item.endDate
                        ? monthLabel(language, item.endDate)
                        : m.educationSection_presentLabel()}
                    </ItemDescription>
                  ) : null}
                </ItemContent>
                <ItemActions>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={m.educationSection_editLabel()}
                    title={m.educationSection_editLabel()}
                    onClick={() => open(item)}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={m.educationSection_deleteLabel()}
                    title={m.educationSection_deleteLabel()}
                    disabled={pending}
                    onClick={async () => {
                      setPending(true);
                      try {
                        await deleteEducation({ data: { id: item.id } });
                        await router.invalidate();
                      } catch {
                        void toastActionError();
                      } finally {
                        setPending(false);
                      }
                    }}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ul>
        ) : null}

        <Dialog
          open={editing !== null && editing.id === null}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        >
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{m.educationSection_addLabel()}</DialogTitle>
            </DialogHeader>
            {editorForm}
          </DialogContent>
        </Dialog>

        <Sheet
          open={editing !== null && editing.id !== null}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        >
          <SheetContent side="right" className="w-full gap-0 sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{m.educationSection_editTitle()}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4 pt-2">{editorForm}</div>
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}
