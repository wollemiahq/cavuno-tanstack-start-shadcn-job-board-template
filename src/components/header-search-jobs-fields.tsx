'use client';

import type { HeaderSearchProps } from '@/components/Header';
import { KeywordCombobox } from '@/components/keyword-combobox';
import { LocationCombobox } from '@/components/location-combobox';
import type {
  HeaderSearchLocation,
  HeaderSearchTerm,
} from '@/lib/header-search';

export function HeaderSearchJobsFields({
  search,
  value,
  location,
  placeholder,
  onValueChange,
  onLocationChange,
  onTermChange,
}: {
  search: HeaderSearchProps['search'];
  value: string;
  location: HeaderSearchLocation | null;
  placeholder: string;
  onValueChange: (value: string) => void;
  onLocationChange: (location: HeaderSearchLocation | null) => void;
  onTermChange: (term: HeaderSearchTerm | null) => void;
}) {
  return (
    <>
      <KeywordCombobox
        {...search.keywordSuggestions}
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
        {...search.locationSuggestions}
        value={location?.slug}
        valueLabel={location?.name}
        onSelect={onLocationChange}
        onClear={() => onLocationChange(null)}
        className="border-border bg-input/50 h-9 min-w-0 flex-1"
      />
    </>
  );
}
