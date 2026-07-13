"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const ANY = "__any__";

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
}: {
  label: string;
  anyLabel: string;
  options: JobsFilterOption[];
  value?: string;
  onValueChange: (value: string | undefined) => void;
}) {
  const items = [{ value: ANY, label: anyLabel }, ...options];

  return (
    <Select
      items={items}
      value={value ?? ANY}
      onValueChange={(nextValue) =>
        onValueChange(nextValue === ANY || nextValue == null ? undefined : nextValue)
      }
    >
      <SelectTrigger aria-label={label}>
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
  );
}

export function JobsFilterToolbar({
  labels,
  options,
  value,
  onApply,
  onReset,
}: JobsFilterToolbarProps) {
  const [sheetMode, setSheetMode] = useState<"desktop" | "mobile" | null>(null);
  const [draft, setDraft] = useState<JobsFilterValues>({});
  const activeCount =
    Number(Boolean(value.workplace)) +
    Number(Boolean(value.employmentType)) +
    (value.seniority?.length ?? 0);

  const openSheet = (mode: "desktop" | "mobile") => {
    setDraft({ ...value, seniority: value.seniority ? [...value.seniority] : undefined });
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
      seniority: checked ? [...current, seniority] : current.filter((value) => value !== seniority),
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
          onValueChange={(employmentType) => onApply({ ...value, employmentType })}
        />
        <Button
          type="button"
          variant="outline"
          aria-haspopup="dialog"
          aria-expanded={sheetMode === "desktop"}
          onClick={() => openSheet("desktop")}
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
        aria-expanded={sheetMode === "mobile"}
        onClick={() => openSheet("mobile")}
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
            <SheetTitle>{sheetMode === "desktop" ? labels.allFilters : labels.filters}</SheetTitle>
            <SheetDescription>{labels.sheetDescription}</SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-2">
            <div className="grid gap-2">
              <span className="text-sm font-medium">{labels.workplace}</span>
              <FilterSelect
                label={labels.workplace}
                anyLabel={labels.anyWorkplace}
                options={options.workplace}
                value={draft.workplace}
                onValueChange={(workplace) => setDraft({ ...draft, workplace })}
              />
            </div>

            <div className="grid gap-2">
              <span className="text-sm font-medium">{labels.employmentType}</span>
              <FilterSelect
                label={labels.employmentType}
                anyLabel={labels.anyEmploymentType}
                options={options.employmentType}
                value={draft.employmentType}
                onValueChange={(employmentType) => setDraft({ ...draft, employmentType })}
              />
            </div>

            <fieldset className="grid gap-3">
              <legend className="mb-2 text-sm font-medium">{labels.seniority}</legend>
              {options.seniority.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-8 cursor-pointer items-center gap-3 text-sm"
                >
                  <Checkbox
                    checked={draft.seniority?.includes(option.value) ?? false}
                    onCheckedChange={(checked) => setDraftSeniority(option.value, checked === true)}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
          </div>

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
