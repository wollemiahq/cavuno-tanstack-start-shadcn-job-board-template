'use client';

import { useState } from 'react';

import { m } from '../../paraglide/messages';

import { CustomFieldFilterFields } from '@/components/board/custom-field-filter-fields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  countCustomFieldFilters,
  type CustomFilterField,
} from '@/lib/custom-field-filters';
import type { CustomFieldFilter } from '@cavuno/board';

export type CompanyCustomFilters = {
  fields: CustomFilterField[];
  active: CustomFieldFilter[];
  onChange: (next: CustomFieldFilter[]) => void;
};

/**
 * The companies "All filters" button and sheet: the board's public company
 * profile fields, staged in a draft until Apply, like the jobs sheet.
 */
export function CompanyFilters({
  fields,
  active,
  onChange,
}: CompanyCustomFilters) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<CustomFieldFilter[]>([]);
  const activeCount = countCustomFieldFilters(active);

  if (fields.length === 0) return null;

  const openSheet = () => {
    setDraft(active);
    setSheetOpen(true);
  };

  return (
    <div data-slot="company-filter-bar" className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        onClick={openSheet}
      >
        {m.jobSearch_allFiltersLabel()}
        {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
      </Button>
      {activeCount > 0 && (
        <Button type="button" variant="ghost" onClick={() => onChange([])}>
          {m.jobSearch_resetLabel()}
        </Button>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{m.jobSearch_allFiltersLabel()}</SheetTitle>
            <SheetDescription>
              {m.companySearch_filterSheetDescription()}
            </SheetDescription>
          </SheetHeader>

          <FieldGroup className="flex flex-1 gap-6 overflow-y-auto px-6 py-2">
            <CustomFieldFilterFields
              fields={fields}
              value={draft}
              onChange={setDraft}
            />
          </FieldGroup>

          <SheetFooter className="flex-row items-center border-t">
            <Button type="button" variant="ghost" onClick={() => setDraft([])}>
              {m.jobSearch_resetLabel()}
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => {
                onChange(draft);
                setSheetOpen(false);
              }}
            >
              {m.jobSearch_applyFiltersLabel()}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
