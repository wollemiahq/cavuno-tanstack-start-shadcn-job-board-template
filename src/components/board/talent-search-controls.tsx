'use client';

import { useEffect, useId, useState } from 'react';

import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';

export type TalentSearchControlsProps = {
  q?: string;
  skill?: string;
  labels: {
    query: string;
    queryPlaceholder: string;
    skill: string;
    skillPlaceholder: string;
    search: string;
  };
  onSubmit: (search: { q: string; skill: string }) => void;
};

export function TalentSearchControls({
  q,
  skill,
  labels,
  onSubmit,
}: TalentSearchControlsProps) {
  const [draft, setDraft] = useState({ q: q ?? '', skill: skill ?? '' });
  const queryId = useId();
  const skillId = useId();

  useEffect(() => {
    setDraft({ q: q ?? '', skill: skill ?? '' });
  }, [q, skill]);

  return (
    <form
      data-slot="talent-search-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draft);
      }}
    >
      <Card size="sm" className="gap-0 py-0">
        <CardContent className="p-3">
          <FieldGroup className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.6fr)_auto]">
            <Field className="min-w-0 gap-0">
              <FieldLabel htmlFor={queryId} className="sr-only">
                {labels.query}
              </FieldLabel>
              <InputGroup className="border-border bg-background h-11">
                <InputGroupInput
                  id={queryId}
                  type="search"
                  value={draft.q}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      q: event.target.value,
                    }))
                  }
                  placeholder={labels.queryPlaceholder}
                  aria-label={labels.query}
                />
                <InputGroupAddon>
                  <Search aria-hidden="true" />
                </InputGroupAddon>
              </InputGroup>
            </Field>

            <Field className="min-w-0 gap-0">
              <FieldLabel htmlFor={skillId} className="sr-only">
                {labels.skill}
              </FieldLabel>
              <InputGroup className="border-border bg-background h-11">
                <InputGroupInput
                  id={skillId}
                  type="text"
                  value={draft.skill}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      skill: event.target.value,
                    }))
                  }
                  placeholder={labels.skillPlaceholder}
                  aria-label={labels.skill}
                />
              </InputGroup>
            </Field>

            <Button type="submit" size="lg" className="h-11 md:px-6">
              <Search aria-hidden="true" />
              {labels.search}
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
