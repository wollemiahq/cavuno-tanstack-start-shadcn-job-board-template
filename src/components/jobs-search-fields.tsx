'use client';

import type { Ref } from 'react';

import {
  KeywordCombobox,
  type KeywordSuggestionState,
} from '@/components/keyword-combobox';
import {
  LocationCombobox,
  type LocationComboboxHandle,
  type LocationSearchState,
} from '@/components/location-combobox';
import type {
  HeaderSearchLocation,
  HeaderSearchTerm,
} from '@/lib/header-search';

export interface JobsSearchFieldsProps {
  keywordSuggestions: KeywordSuggestionState;
  locationSuggestions: LocationSearchState;
  /** Lets the host form settle typed-but-unpicked location text on submit. */
  locationRef?: Ref<LocationComboboxHandle>;
  value: string;
  location: HeaderSearchLocation | null;
  placeholder: string;
  locationClassName?: string;
  onValueChange: (value: string) => void;
  onLocationChange: (location: HeaderSearchLocation | null) => void;
  onTermChange: (term: HeaderSearchTerm | null) => void;
}

/** Compose the keyword and location controls used to search jobs. */
export function JobsSearchFields({
  keywordSuggestions,
  locationSuggestions,
  locationRef,
  value,
  location,
  placeholder,
  locationClassName,
  onValueChange,
  onLocationChange,
  onTermChange,
}: JobsSearchFieldsProps) {
  return (
    <>
      <KeywordCombobox
        {...keywordSuggestions}
        value={value}
        placeholder={placeholder}
        onValueChange={(nextValue) => {
          onValueChange(nextValue);
          onTermChange(null);
        }}
        onSelect={(suggestion) => {
          onValueChange(suggestion.name);
          onTermChange(suggestion);
        }}
        onClear={() => onTermChange(null)}
      />
      <LocationCombobox
        {...locationSuggestions}
        ref={locationRef}
        value={location?.slug}
        valueLabel={location?.name}
        onSelect={onLocationChange}
        onClear={() => onLocationChange(null)}
        className={locationClassName}
      />
    </>
  );
}
