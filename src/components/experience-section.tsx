'use client';

import { useState } from 'react';

import { formatMonthYear } from '@cavuno/board/format';
import { useRouter } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  createExperience,
  deleteExperience,
  updateExperience,
} from '../server/account';

import {
  CandidateActionFeedback,
  type CandidateActionFeedbackState,
} from '@/components/candidate-action-feedback';
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { Textarea } from '@/components/ui/textarea';
import type { CandidateExperience } from '@cavuno/board';

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
  title: '',
  companyName: '',
  location: '',
  startDate: '',
  endDate: '',
  description: '',
};

function toDraft(item: CandidateExperience): Draft {
  return {
    title: item.title,
    companyName: item.companyName,
    location: item.location ?? '',
    startDate: item.startDate,
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
  const [feedback, setFeedback] =
    useState<CandidateActionFeedbackState>('idle');

  const open = (item: CandidateExperience | null) => {
    setEditing({ id: item ? item.id : null });
    setDraft(item ? toDraft(item) : EMPTY);
  };

  const submit = async () => {
    setPending(true);
    setFeedback('idle');
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
      setFeedback('success');
    } catch {
      setFeedback('error');
    } finally {
      setPending(false);
    }
  };

  return (
    <Card data-test="experience-section" id="experience">
      <CardHeader>
        <CardTitle>
          <h2>{m.experienceSection_heading()}</h2>
        </CardTitle>
        {editing === null ? (
          <CardAction>
            <Button variant="outline" size="sm" onClick={() => open(null)}>
              {m.experienceSection_addLabel()}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && editing === null ? (
          <p className="text-muted-foreground text-sm">
            {m.experienceSection_emptyText()}
          </p>
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
                    {monthLabel(language, item.startDate)}
                    {' – '}
                    {item.endDate
                      ? monthLabel(language, item.endDate)
                      : m.experienceSection_presentLabel()}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button variant="ghost" size="sm" onClick={() => open(item)}>
                    {m.experienceSection_editLabel()}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={async () => {
                      setPending(true);
                      setFeedback('idle');
                      try {
                        await deleteExperience({ data: { id: item.id } });
                        await router.invalidate();
                        setFeedback('success');
                      } catch {
                        setFeedback('error');
                      } finally {
                        setPending(false);
                      }
                    }}
                  >
                    {m.experienceSection_deleteLabel()}
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ul>
        ) : null}

        {editing !== null ? (
          <form
            key={editing.id ?? 'new'}
            className="border-border rounded-2xl border p-4"
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
                  clearAriaLabel={m.monthYearField_clearAriaLabel()}
                />
                <MonthYearField
                  idPrefix="experience-end"
                  label={m.experienceSection_endLabel()}
                  language={language}
                  clearable
                  defaultValue={draft.endDate}
                  onChange={(endDate) =>
                    setDraft((prev) => ({ ...prev, endDate }))
                  }
                  monthAriaLabel={m.monthYearField_monthPlaceholder()}
                  yearAriaLabel={m.monthYearField_yearPlaceholder()}
                  monthPlaceholder={m.monthYearField_monthPlaceholder()}
                  yearPlaceholder={m.monthYearField_yearPlaceholder()}
                  clearAriaLabel={m.monthYearField_clearAriaLabel()}
                />
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
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending}>
                  {pending
                    ? m.experienceSection_savingLabel()
                    : m.experienceSection_saveLabel()}
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
            </FieldGroup>
          </form>
        ) : null}
        <CandidateActionFeedback state={feedback} />
      </CardContent>
    </Card>
  );
}
