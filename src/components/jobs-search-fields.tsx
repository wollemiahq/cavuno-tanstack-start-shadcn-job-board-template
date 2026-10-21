'use client';

import type { Ref, RefObject } from 'react';

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
  /** The search bar both suggestion popups span. */
  popupSpanRef?: RefObject<HTMLElement | null>;
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
  popupSpanRef,
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
        popupSpanRef={popupSpanRef}
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
        popupSpanRef={popupSpanRef}
      />
    </>
  );
}
