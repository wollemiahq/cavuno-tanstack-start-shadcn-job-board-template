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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL_MARKETS = '__all_markets__';

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
  const [draft, setDraft] = useState(query ?? '');
  const queryId = useId();
  const marketId = useId();
  const marketItems = [
    { value: ALL_MARKETS, label: labels.allMarkets },
    ...markets.map((market) => ({ value: market.slug, label: market.name })),
  ];

  useEffect(() => setDraft(query ?? ''), [query]);

  return (
    <form
      data-slot="company-search-form"
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
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={labels.queryPlaceholder}
                  aria-label={labels.query}
                />
                <InputGroupAddon>
                  <Search aria-hidden="true" />
                </InputGroupAddon>
              </InputGroup>
            </Field>

            <Field className="min-w-0 gap-0">
              <FieldLabel htmlFor={marketId} className="sr-only">
                {labels.market}
              </FieldLabel>
              <Select
                items={marketItems}
                value={marketSlug ?? ALL_MARKETS}
                onValueChange={(value) =>
                  onMarketChange(
                    value === ALL_MARKETS || value == null ? undefined : value,
                    draft,
                  )
                }
              >
                <SelectTrigger
                  id={marketId}
                  aria-label={labels.market}
                  className="h-11 w-full"
                >
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
