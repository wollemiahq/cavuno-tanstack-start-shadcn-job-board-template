"use client";

import { useEffect, useState } from "react";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [draft, setDraft] = useState({ q: q ?? "", skill: skill ?? "" });

  useEffect(() => {
    setDraft({ q: q ?? "", skill: skill ?? "" });
  }, [q, skill]);

  return (
    <form
      data-slot="talent-search-form"
      className="rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draft);
      }}
    >
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.6fr)_auto]">
        <div className="relative min-w-0">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={draft.q}
            onChange={(event) =>
              setDraft((current) => ({ ...current, q: event.target.value }))
            }
            placeholder={labels.queryPlaceholder}
            aria-label={labels.query}
            className="h-11 bg-background pl-9"
          />
        </div>

        <Input
          type="text"
          value={draft.skill}
          onChange={(event) =>
            setDraft((current) => ({ ...current, skill: event.target.value }))
          }
          placeholder={labels.skillPlaceholder}
          aria-label={labels.skill}
          className="h-11 bg-background"
        />

        <Button type="submit" size="lg" className="h-11 md:px-6">
          <Search aria-hidden="true" />
          {labels.search}
        </Button>
      </div>
    </form>
  );
}
