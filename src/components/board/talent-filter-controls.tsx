'use client';

import { useEffect, useId, useState } from 'react';

import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';

export type TalentFilterControlsProps = {
  q?: string;
  skill?: string;
  labels: {
    skill: string;
    skillPlaceholder: string;
    search: string;
  };
  onSubmit: (search: { q: string; skill: string }) => void;
};

/** Secondary Talent filters; the shared header owns the candidate query. */
export function TalentFilterControls({
  q,
  skill,
  labels,
  onSubmit,
}: TalentFilterControlsProps) {
  const [draftSkill, setDraftSkill] = useState(skill ?? '');
  const skillId = useId();

  useEffect(() => {
    setDraftSkill(skill ?? '');
  }, [skill]);

  return (
    <form
      data-slot="talent-filter-bar"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ q: q ?? '', skill: draftSkill });
      }}
      className="flex min-w-0 items-center"
    >
      <Field className="w-full max-w-sm gap-0">
        <FieldLabel htmlFor={skillId} className="sr-only">
          {labels.skill}
        </FieldLabel>
        <ButtonGroup className="w-full">
          <InputGroup className="border-border bg-input/50 h-8 min-w-0 flex-1">
            <InputGroupInput
              id={skillId}
              type="text"
              value={draftSkill}
              onChange={(event) => setDraftSkill(event.target.value)}
              placeholder={labels.skillPlaceholder}
              aria-label={labels.skill}
            />
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            {draftSkill ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  aria-label={`Clear ${labels.skill.toLocaleLowerCase()}`}
                  onClick={() => setDraftSkill('')}
                >
                  <X aria-hidden="true" />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
          <Button type="submit" variant="outline" size="sm">
            {labels.search}
          </Button>
        </ButtonGroup>
      </Field>
    </form>
  );
}
