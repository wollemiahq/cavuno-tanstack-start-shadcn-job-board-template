'use client';

import { CompanySearchCombobox } from '@/components/company-search-combobox';
import type { HeaderSearchProps } from '@/components/Header';
import type { HeaderSearchMarket } from '@/lib/header-search';

export function HeaderSearchCompanyField({
  search,
  value,
  placeholder,
  onValueChange,
  onMarketChange,
}: {
  search: HeaderSearchProps['search'];
  value: string;
  placeholder: string;
  onValueChange: (value: string) => void;
  onMarketChange: (market: HeaderSearchMarket | null) => void;
}) {
  return (
    <CompanySearchCombobox
      {...search.companyMarketSuggestions}
      value={value}
      placeholder={placeholder}
      onValueChange={(nextValue) => {
        onValueChange(nextValue);
        onMarketChange(null);
      }}
      onSelect={(suggestion) => {
        onValueChange(suggestion.name);
        onMarketChange(suggestion);
        search.onSubmit({
          scope: 'companies',
          query: suggestion.name,
          location: null,
          term: null,
          market: suggestion,
        });
      }}
      onClear={() => onMarketChange(null)}
    />
  );
}
