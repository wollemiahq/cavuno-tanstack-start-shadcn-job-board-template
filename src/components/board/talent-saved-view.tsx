'use client';

import { useId, useMemo } from 'react';

import { m } from '../../paraglide/messages';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
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

export type SavedViewStage = { id: string; label: string };

/**
 * The open saved search's view switch: everyone the search finds, or only
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
      <ButtonGroup aria-label={m.talentSaved_showLabel()}>
        <Button
          type="button"
          variant={saved ? 'outline' : 'default'}
          aria-pressed={!saved}
          onClick={() => {
            if (saved) onSavedChange(false);
          }}
        >
          {m.talentSaved_allOption()}
        </Button>
        <Button
          type="button"
          variant={saved ? 'default' : 'outline'}
          aria-pressed={saved}
          onClick={() => {
            if (!saved) onSavedChange(true);
          }}
        >
          {m.talentSaved_savedOption({
            count: savedCount.toLocaleString(language),
          })}
        </Button>
      </ButtonGroup>
      {saved && stages.length > 0 ? (
        <StageSelect stages={stages} stage={stage} onChange={onStageChange} />
      ) : null}
    </div>
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
