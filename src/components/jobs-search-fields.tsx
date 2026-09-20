'use client';

import {
  KeywordCombobox,
  type KeywordSuggestionState,
} from '@/components/keyword-combobox';
import {
  LocationCombobox,
  type LocationSuggestionState,
} from '@/components/location-combobox';
import type {
  HeaderSearchLocation,
  HeaderSearchTerm,
} from '@/lib/header-search';

export interface JobsSearchFieldsProps {
  keywordSuggestions: KeywordSuggestionState;
  locationSuggestions: LocationSuggestionState;
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
        value={location?.slug}
        valueLabel={location?.name}
        onSelect={onLocationChange}
        onClear={() => onLocationChange(null)}
        className={locationClassName}
      />
    </>
  );
}
