'use client';

import { useId, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const ANY = '__any__';

export type JobsFilterOption = {
  value: string;
  label: string;
};

export type JobsFilterValues = {
  workplace?: string;
  employmentType?: string;
  seniority?: string[];
};

export type JobsFilterToolbarLabels = {
  workplace: string;
  anyWorkplace: string;
  employmentType: string;
  anyEmploymentType: string;
  seniority: string;
  allFilters: string;
  filters: string;
  sheetDescription: string;
  reset: string;
  apply: string;
  cancel: string;
};

export type JobsFilterToolbarProps = {
  labels: JobsFilterToolbarLabels;
  options: {
    workplace: JobsFilterOption[];
    employmentType: JobsFilterOption[];
    seniority: JobsFilterOption[];
  };
  value: JobsFilterValues;
  onApply: (value: JobsFilterValues) => void;
  onReset: () => void;
};

function FilterSelect({
  label,
  anyLabel,
  options,
  value,
  onValueChange,
  showLabel = false,
}: {
  label: string;
  anyLabel: string;
  options: JobsFilterOption[];
  value?: string;
  onValueChange: (value: string | undefined) => void;
  showLabel?: boolean;
}) {
  const items = [{ value: ANY, label: anyLabel }, ...options];
  const controlId = useId();

  return (
    <Field className="w-auto gap-0">
      <FieldLabel
        htmlFor={controlId}
        className={showLabel ? undefined : 'sr-only'}
      >
        {label}
      </FieldLabel>
      <Select
        items={items}
        value={value ?? ANY}
        onValueChange={(nextValue) =>
          onValueChange(
            nextValue === ANY || nextValue == null ? undefined : nextValue,
          )
        }
      >
        <SelectTrigger id={controlId} aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

export function JobsFilterToolbar({
  labels,
  options,
  value,
  onApply,
  onReset,
}: JobsFilterToolbarProps) {
  const [sheetMode, setSheetMode] = useState<'desktop' | 'mobile' | null>(null);
  const [draft, setDraft] = useState<JobsFilterValues>({});
  const activeCount =
    Number(Boolean(value.workplace)) +
    Number(Boolean(value.employmentType)) +
    (value.seniority?.length ?? 0);

  const openSheet = (mode: 'desktop' | 'mobile') => {
    setDraft({
      ...value,
      seniority: value.seniority ? [...value.seniority] : undefined,
    });
    setSheetMode(mode);
  };

  const closeSheet = () => setSheetMode(null);

  const applyDraft = () => {
    onApply({
      ...(draft.workplace ? { workplace: draft.workplace } : {}),
      ...(draft.employmentType ? { employmentType: draft.employmentType } : {}),
      ...(draft.seniority?.length ? { seniority: draft.seniority } : {}),
    });
    closeSheet();
  };

  const setDraftSeniority = (seniority: string, checked: boolean) => {
    const current = draft.seniority ?? [];
    setDraft({
      ...draft,
      seniority: checked
        ? [...current, seniority]
        : current.filter((value) => value !== seniority),
    });
  };

  return (
    <>
      <div className="hidden items-center gap-2 md:flex">
        <FilterSelect
          label={labels.workplace}
          anyLabel={labels.anyWorkplace}
          options={options.workplace}
          value={value.workplace}
          onValueChange={(workplace) => onApply({ ...value, workplace })}
        />
        <FilterSelect
          label={labels.employmentType}
          anyLabel={labels.anyEmploymentType}
          options={options.employmentType}
          value={value.employmentType}
          onValueChange={(employmentType) =>
            onApply({ ...value, employmentType })
          }
        />
        <Button
          type="button"
          variant="outline"
          aria-haspopup="dialog"
          aria-expanded={sheetMode === 'desktop'}
          onClick={() => openSheet('desktop')}
        >
          {labels.allFilters}
          {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
        </Button>
        {activeCount > 0 && (
          <Button type="button" variant="ghost" onClick={onReset}>
            {labels.reset}
          </Button>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        className="md:hidden"
        aria-haspopup="dialog"
        aria-expanded={sheetMode === 'mobile'}
        onClick={() => openSheet('mobile')}
      >
        {labels.filters}
        {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
      </Button>

      <Sheet
        open={sheetMode !== null}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
      >
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>
              {sheetMode === 'desktop' ? labels.allFilters : labels.filters}
            </SheetTitle>
            <SheetDescription>{labels.sheetDescription}</SheetDescription>
          </SheetHeader>

          <FieldGroup className="flex flex-1 gap-6 overflow-y-auto px-6 py-2">
            <FilterSelect
              label={labels.workplace}
              anyLabel={labels.anyWorkplace}
              options={options.workplace}
              value={draft.workplace}
              onValueChange={(workplace) => setDraft({ ...draft, workplace })}
              showLabel
            />

            <FilterSelect
              label={labels.employmentType}
              anyLabel={labels.anyEmploymentType}
              options={options.employmentType}
              value={draft.employmentType}
              onValueChange={(employmentType) =>
                setDraft({ ...draft, employmentType })
              }
              showLabel
            />

            <FieldSet className="gap-3">
              <FieldLegend variant="label">{labels.seniority}</FieldLegend>
              {options.seniority.map((option) => (
                <Field
                  key={option.value}
                  orientation="horizontal"
                  className="min-h-8"
                >
                  <Checkbox
                    id={`seniority-${option.value}`}
                    checked={draft.seniority?.includes(option.value) ?? false}
                    onCheckedChange={(checked) =>
                      setDraftSeniority(option.value, checked === true)
                    }
                  />
                  <FieldLabel
                    htmlFor={`seniority-${option.value}`}
                    className="cursor-pointer font-normal"
                  >
                    {option.label}
                  </FieldLabel>
                </Field>
              ))}
            </FieldSet>
          </FieldGroup>

          <SheetFooter className="border-t">
            <Button type="button" variant="ghost" onClick={() => setDraft({})}>
              {labels.reset}
            </Button>
            <Button type="button" variant="outline" onClick={closeSheet}>
              {labels.cancel}
            </Button>
            <Button type="button" onClick={applyDraft}>
              {labels.apply}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
