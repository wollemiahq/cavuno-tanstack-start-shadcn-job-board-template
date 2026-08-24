'use client';

import { lazy, Suspense, useRef } from 'react';

import { Search, X } from 'lucide-react';

import { m } from '../paraglide/messages';

import type { HeaderSearchProps } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import type { HeaderSearchScope } from '@/lib/header-search';

const LazyHeaderSearchJobsFields = lazy(() =>
  import('@/components/header-search-jobs-fields').then(
    ({ HeaderSearchJobsFields }) => ({
      default: HeaderSearchJobsFields,
    }),
  ),
);

const LazyHeaderSearchBlogField = lazy(() =>
  import('@/components/header-search-blog-field').then(
    ({ HeaderSearchBlogField }) => ({
      default: HeaderSearchBlogField,
    }),
  ),
);

const LazyHeaderSearchCompanyField = lazy(() =>
  import('@/components/header-search-company-field').then(
    ({ HeaderSearchCompanyField }) => ({
      default: HeaderSearchCompanyField,
    }),
  ),
);

function HeaderSearchFieldsFallback({ fields }: { fields: 1 | 2 }) {
  return Array.from({ length: fields }, (_, index) => (
    <span
      key={index}
      aria-hidden="true"
      // data-slot opts the placeholder into ButtonGroup's segmented-corner
      // rules, so its shape matches the real field it stands in for (right
      // edge flattened against the search button, not a free-floating pill).
      data-slot="header-search-fallback"
      className="border-border bg-input/50 h-9 min-w-0 flex-1 rounded-2xl border"
    />
  ));
}

export function HeaderSearchEnhanced({
  search,
  fields,
  jobsPlaceholder,
  companiesPlaceholder,
  talentPlaceholder,
  blogPlaceholder,
}: HeaderSearchProps) {
  // Field state lives in Header (`fields`), NOT here: the same search form
  // renders twice while the mobile nav sheet is open (page header + sheet
  // header), and two independent useState copies made the sheet's input
  // appear as a fresh empty duplicate of the one the user just typed in.
  const {
    value,
    setValue,
    location,
    setLocation,
    term,
    setTerm,
    market,
    setMarket,
  } = fields;
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const scopePlaceholders = {
    jobs: jobsPlaceholder,
    companies: companiesPlaceholder,
    talent: talentPlaceholder,
    blog: blogPlaceholder,
  } satisfies Record<HeaderSearchScope, string>;

  return (
    <form
      role="search"
      data-search-scope={search.scope}
      onSubmit={(event) => {
        event.preventDefault();
        search.onSubmit({
          scope: search.scope,
          query: value.trim() || undefined,
          location,
          term,
          market,
        });
      }}
      className="col-span-2 row-start-2 w-full min-w-0 py-2 xl:col-auto xl:row-auto xl:flex-1 xl:py-0"
    >
      <ButtonGroup
        aria-label={m.searchBar_searchAriaLabel()}
        className="w-full min-w-0"
      >
        {search.scope === 'jobs' ? (
          <Suspense fallback={<HeaderSearchFieldsFallback fields={2} />}>
            <LazyHeaderSearchJobsFields
              search={search}
              value={value}
              location={location}
              placeholder={scopePlaceholders.jobs}
              onValueChange={setValue}
              onLocationChange={setLocation}
              onTermChange={setTerm}
            />
          </Suspense>
        ) : search.scope === 'companies' ? (
          <Suspense fallback={<HeaderSearchFieldsFallback fields={1} />}>
            <LazyHeaderSearchCompanyField
              search={search}
              value={value}
              placeholder={scopePlaceholders.companies}
              onValueChange={setValue}
              onMarketChange={setMarket}
            />
          </Suspense>
        ) : search.scope === 'blog' ? (
          <Suspense fallback={<HeaderSearchFieldsFallback fields={1} />}>
            <LazyHeaderSearchBlogField
              search={search}
              value={value}
              placeholder={scopePlaceholders.blog}
              onValueChange={setValue}
              onTermChange={setTerm}
            />
          </Suspense>
        ) : (
          <InputGroup className="border-border bg-input/50 h-9 min-w-0 flex-1">
            <InputGroupInput
              ref={keywordInputRef}
              type="search"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-label={m.searchBar_keywordAriaLabel()}
              placeholder={scopePlaceholders[search.scope]}
              className="min-w-0"
            />
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            {value ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  aria-label={m.searchBar_clearAriaLabel()}
                  onClick={() => {
                    setValue('');
                    keywordInputRef.current?.focus();
                  }}
                  className="text-muted-foreground"
                >
                  <X aria-hidden="true" />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
        )}
        <Button
          type="submit"
          variant="outline"
          size="icon-lg"
          aria-label={m.searchBar_searchAriaLabel()}
          className="size-9 shrink-0"
        >
          <Search aria-hidden="true" />
        </Button>
      </ButtonGroup>
    </form>
  );
}
