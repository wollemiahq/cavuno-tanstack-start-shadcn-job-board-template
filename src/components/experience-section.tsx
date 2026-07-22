'use client';

import { useState } from 'react';

import { useRouter } from '@tanstack/react-router';
import { Briefcase, Pencil, Trash2 } from 'lucide-react';

import { m } from '../paraglide/messages';
import {
  createExperience,
  deleteExperience,
  updateExperience,
} from '../server/account';

import { profileMonthLabel } from '@/board/profile-view-model';
import type { LocationSuggestionState } from '@/components/location-combobox';
import { LocationSuggestField } from '@/components/location-suggest-field';
import { MonthYearField } from '@/components/month-year-field';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { toastActionError } from '@/lib/action-toast';
import type { CandidateExperience } from '@cavuno/board';

type Editing = { id: string | null } | null;

type Draft = {
  title: string;
  companyName: string;
  location: string;
  startDate: string;
  endDate: string;
  /** "I currently work here" — an unset end date, expressed as a toggle. */
  current: boolean;
  description: string;
};

const EMPTY: Draft = {
  title: '',
  companyName: '',
  location: '',
  startDate: '',
  endDate: '',
  current: false,
  description: '',
};

function toDraft(item: CandidateExperience): Draft {
  return {
    title: item.title,
    companyName: item.companyName,
    location: item.location ?? '',
    startDate: item.startDate,
    endDate: item.endDate ?? '',
    current: !item.endDate,
    description: item.description ?? '',
  };
}

/**
 * Work experience — list + add/edit/delete, over `board.me.profile`'s
 * `listExperience` / `createExperience` / `updateExperience` /
 * `deleteExperience`. The body is a merge-patch on edit (empty clears).
 * Dates are month-granular (stored as `YYYY-MM-01`); location offers board
 * place suggestions but stays a free string on the API.
 */
export function ExperienceSection({
  items,
  language,
  locationSuggestions,
}: {
  items: CandidateExperience[];
  language: string;
  locationSuggestions: LocationSuggestionState;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pending, setPending] = useState(false);

  const open = (item: CandidateExperience | null) => {
    setEditing({ id: item ? item.id : null });
    setDraft(item ? toDraft(item) : EMPTY);
  };

  const submit = async () => {
    setPending(true);
    const body = {
      title: draft.title.trim(),
      companyName: draft.companyName.trim(),
      location: draft.location.trim(),
      startDate: draft.startDate,
      endDate: draft.current ? '' : draft.endDate,
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
              <FieldLabel htmlFor="experience-title">
                {m.experienceSection_titleLabel()}
              </FieldLabel>
              <Input
                id="experience-title"
                required
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
              />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="experience-company">
                {m.experienceSection_companyLabel()}
              </FieldLabel>
              <Input
                id="experience-company"
                required
                value={draft.companyName}
                onChange={(event) =>
                  setDraft({ ...draft, companyName: event.target.value })
                }
              />
            </Field>
            <Field className="gap-1.5 sm:col-span-2">
              <FieldLabel htmlFor="experience-location">
                {m.experienceSection_locationLabel()}
              </FieldLabel>
              <LocationSuggestField
                id="experience-location"
                value={draft.location}
                onValueChange={(location) =>
                  setDraft((prev) => ({ ...prev, location }))
                }
                searchingText={m.locationCombobox_searchingText()}
                {...locationSuggestions}
              />
            </Field>
            <MonthYearField
              idPrefix="experience-start"
              label={m.experienceSection_startLabel()}
              language={language}
              required
              defaultValue={draft.startDate}
              onChange={(startDate) =>
                setDraft((prev) => ({ ...prev, startDate }))
              }
              monthAriaLabel={m.monthYearField_monthPlaceholder()}
              yearAriaLabel={m.monthYearField_yearPlaceholder()}
              monthPlaceholder={m.monthYearField_monthPlaceholder()}
              yearPlaceholder={m.monthYearField_yearPlaceholder()}
            />
            {draft.current ? null : (
              <MonthYearField
                key={`end-${editing.id ?? 'new'}`}
                idPrefix="experience-end"
                label={m.experienceSection_endLabel()}
                language={language}
                defaultValue={draft.endDate}
                onChange={(endDate) =>
                  setDraft((prev) => ({ ...prev, endDate }))
                }
                monthAriaLabel={m.monthYearField_monthPlaceholder()}
                yearAriaLabel={m.monthYearField_yearPlaceholder()}
                monthPlaceholder={m.monthYearField_monthPlaceholder()}
                yearPlaceholder={m.monthYearField_yearPlaceholder()}
              />
            )}
            <Label className="w-fit cursor-pointer sm:col-span-2">
              <Checkbox
                checked={draft.current}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({
                    ...prev,
                    current: checked === true,
                    endDate: checked === true ? '' : prev.endDate,
                  }))
                }
              />
              {m.experienceSection_currentRoleLabel()}
            </Label>
          </div>
          <Field className="gap-1.5">
            <FieldLabel htmlFor="experience-description">
              {m.experienceSection_descriptionLabel()}
            </FieldLabel>
            <Textarea
              id="experience-description"
              rows={4}
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
              {m.experienceSection_cancelLabel()}
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending
                ? m.experienceSection_savingLabel()
                : m.experienceSection_saveLabel()}
            </Button>
          </div>
        </FieldGroup>
      </form>
    ) : null;

  const addButton = (
    <Button variant="outline" size="sm" onClick={() => open(null)}>
      {m.experienceSection_addLabel()}
    </Button>
  );

  return (
    <Card data-test="experience-section" id="experience">
      <CardHeader>
        <CardTitle>
          <h2>{m.experienceSection_heading()}</h2>
        </CardTitle>
        {items.length > 0 ? <CardAction>{addButton}</CardAction> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <Empty className="border-0 p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Briefcase aria-hidden="true" />
              </EmptyMedia>
              <EmptyDescription>
                {m.experienceSection_emptyText()}
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
                  <ItemTitle>{item.title}</ItemTitle>
                  <ItemDescription>
                    {item.companyName}
                    {item.location ? ` · ${item.location}` : ''}
                  </ItemDescription>
                  <ItemDescription className="text-xs">
                    {profileMonthLabel(language, item.startDate)}
                    {' – '}
                    {item.endDate
                      ? profileMonthLabel(language, item.endDate)
                      : m.experienceSection_presentLabel()}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={m.experienceSection_editLabel()}
                    title={m.experienceSection_editLabel()}
                    onClick={() => open(item)}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={m.experienceSection_deleteLabel()}
                    title={m.experienceSection_deleteLabel()}
                    disabled={pending}
                    onClick={async () => {
                      setPending(true);
                      try {
                        await deleteExperience({ data: { id: item.id } });
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
              <DialogTitle>{m.experienceSection_addLabel()}</DialogTitle>
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
              <SheetTitle>{m.experienceSection_editTitle()}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4 pt-2">{editorForm}</div>
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}
