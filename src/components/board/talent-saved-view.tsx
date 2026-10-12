'use client';

import { useId, useMemo } from 'react';

import { m } from '../../paraglide/messages';

import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ANY_STAGE = '__any__';
const ALL = 'all';
const SAVED = 'saved';
const VIEW_VALUES = [ALL, SAVED];

export type SavedViewStage = { id: string; label: string };

/**
 * The open saved search's view filter: everyone the search finds, or only
 * the people saved to it. A list linked to a job also filters the saved
 * people by their stage on that job's pipeline.
 */
export function TalentSavedViewControls({
  saved,
  savedCount,
  language,
  stages,
  stage,
  onSavedChange,
  onStageChange,
}: {
  saved: boolean;
  /** People saved to the list. */
  savedCount: number;
  language: string;
  /** The linked job's visible pipeline stages; empty when not linked. */
  stages: readonly SavedViewStage[];
  stage?: string;
  onSavedChange: (saved: boolean) => void;
  onStageChange: (stage: string | undefined) => void;
}) {
  return (
    <div data-slot="talent-saved-view" className="flex items-center gap-2">
      <ViewSelect
        saved={saved}
        savedCount={savedCount}
        language={language}
        onChange={onSavedChange}
      />
      {saved && stages.length > 0 ? (
        <StageSelect stages={stages} stage={stage} onChange={onStageChange} />
      ) : null}
    </div>
  );
}

function ViewSelect({
  saved,
  savedCount,
  language,
  onChange,
}: {
  saved: boolean;
  savedCount: number;
  language: string;
  onChange: (saved: boolean) => void;
}) {
  const controlId = useId();
  const count = savedCount.toLocaleString(language);
  // Stable items/label lookup, as for the stage select below.
  const { items, optionLabel } = useMemo(() => {
    const lookup = (value: string) =>
      value === SAVED
        ? m.talentSaved_savedCountOption({
            count: savedCount,
            countLabel: count,
          })
        : m.talentSaved_allCandidatesOption();
    return {
      items: Object.fromEntries(VIEW_VALUES.map((id) => [id, lookup(id)])),
      optionLabel: lookup,
    };
  }, [count, savedCount]);

  return (
    <Field className="w-auto gap-0">
      <FieldLabel htmlFor={controlId} className="sr-only">
        {m.talentSaved_showLabel()}
      </FieldLabel>
      <Select
        items={items}
        value={saved ? SAVED : ALL}
        itemToStringLabel={optionLabel}
        onValueChange={(next) => {
          const nextSaved = next === SAVED;
          if (next == null || nextSaved === saved) return;
          onChange(nextSaved);
        }}
      >
        <SelectTrigger id={controlId} aria-label={m.talentSaved_showLabel()}>
          {/* The trigger and the menu option both read "N saved". */}
          <SelectValue>
            {(value: string) =>
              value === SAVED
                ? m.talentSaved_savedOption({
                    count: savedCount,
                    countLabel: count,
                  })
                : m.talentSaved_allCandidatesOption()
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          <SelectGroup>
            {VIEW_VALUES.map((id) => (
              <SelectItem key={id} value={id}>
                {optionLabel(id)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function StageSelect({
  stages,
  stage,
  onChange,
}: {
  stages: readonly SavedViewStage[];
  stage?: string;
  onChange: (stage: string | undefined) => void;
}) {
  const controlId = useId();
  // Stable items/label lookup: Base UI's Select re-syncs its store when these
  // change identity, which loops when it happens on every render.
  const { values, items, labelFor } = useMemo(() => {
    const labels = new Map(stages.map((row) => [row.id, row.label]));
    const anyLabel = m.talentSaved_anyStageOption();
    const lookup = (value: string) => labels.get(value) ?? anyLabel;
    const ids = [ANY_STAGE, ...stages.map((row) => row.id)];
    return {
      values: ids,
      items: Object.fromEntries(ids.map((id) => [id, lookup(id)])),
      labelFor: lookup,
    };
  }, [stages]);
  const value = stage && values.includes(stage) ? stage : ANY_STAGE;

  return (
    <Field className="w-auto gap-0">
      <FieldLabel htmlFor={controlId} className="sr-only">
        {m.talentSaved_stageLabel()}
      </FieldLabel>
      <Select
        items={items}
        value={value}
        itemToStringLabel={labelFor}
        onValueChange={(next) => {
          const nextStage =
            next === ANY_STAGE || next == null ? undefined : next;
          if (nextStage === stage) return;
          onChange(nextStage);
        }}
      >
        <SelectTrigger id={controlId} aria-label={m.talentSaved_stageLabel()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectGroup>
            {values.map((id) => (
              <SelectItem key={id} value={id}>
                {labelFor(id)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
