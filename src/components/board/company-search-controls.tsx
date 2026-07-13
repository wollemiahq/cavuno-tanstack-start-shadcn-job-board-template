"use client";

import { useEffect, useState } from "react";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_MARKETS = "__all_markets__";

export type CompanySearchControlsProps = {
  query?: string;
  marketSlug?: string;
  markets: Array<{ slug: string; name: string }>;
  labels: {
    query: string;
    queryPlaceholder: string;
    market: string;
    allMarkets: string;
    search: string;
  };
  onSubmit: (query: string) => void;
  onMarketChange: (marketSlug: string | undefined, query: string) => void;
};

export function CompanySearchControls({
  query,
  marketSlug,
  markets,
  labels,
  onSubmit,
  onMarketChange,
}: CompanySearchControlsProps) {
  const [draft, setDraft] = useState(query ?? "");
  const marketItems = [
    { value: ALL_MARKETS, label: labels.allMarkets },
    ...markets.map((market) => ({ value: market.slug, label: market.name })),
  ];

  useEffect(() => setDraft(query ?? ""), [query]);

  return (
    <form
      data-slot="company-search-form"
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
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={labels.queryPlaceholder}
            aria-label={labels.query}
            className="h-11 bg-background pl-9"
          />
        </div>

        <Select
          items={marketItems}
          value={marketSlug ?? ALL_MARKETS}
          onValueChange={(value) =>
            onMarketChange(value === ALL_MARKETS || value == null ? undefined : value, draft)
          }
        >
          <SelectTrigger aria-label={labels.market} className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {marketItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button type="submit" size="lg" className="h-11 md:px-6">
          <Search aria-hidden="true" />
          {labels.search}
        </Button>
      </div>
    </form>
  );
}
