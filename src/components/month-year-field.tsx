'use client';

import { useMemo, useState } from 'react';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Month + year picker for profile dates (experience/education). People rarely
 * remember the exact day, so the field captures month granularity and emits a
 * stable first-of-month ISO date (`YYYY-MM-01`) — the shape the display
 * pipeline (SDK `formatMonthYear`, talent-profile month rendering) reads at
 * month granularity anyway.
 *
 * The two selects hold their own partial state and only emit once both parts
 * are chosen; mount it with a `key` per editing session so stale parts cannot
 * leak between edits.
 */

const YEARS_BACK = 60;
const YEARS_FORWARD = 6;

function parseParts(value: string): { year: string; month: string } {
  const [year, month] = value.split('-');
  if (
    !year ||
    !month ||
    Number.isNaN(Number(year)) ||
    Number.isNaN(Number(month))
  ) {
    return { year: '', month: '' };
  }
  return { year, month };
}

export function MonthYearField({
  idPrefix,
  label,
  language,
  defaultValue = '',
  onChange,
  required = false,
  clearable = false,
  monthAriaLabel,
  yearAriaLabel,
  monthPlaceholder,
  yearPlaceholder,
  clearAriaLabel,
}: {
  idPrefix: string;
  label: string;
  /** BCP-47 locale for month names (the board language). */
  language: string;
  /** Initial `YYYY-MM-01` (or empty). The field owns its state after mount. */
  defaultValue?: string;
  /** Fired with `YYYY-MM-01` once both parts are set, or `''` on clear. */
  onChange: (value: string) => void;
  required?: boolean;
  /** Renders a clear control once any part is set (optional end dates). */
  clearable?: boolean;
  monthAriaLabel: string;
  yearAriaLabel: string;
  monthPlaceholder: string;
  yearPlaceholder: string;
  clearAriaLabel: string;
}) {
  const [parts, setParts] = useState(() => parseParts(defaultValue));

  const monthItems = useMemo(() => {
    const monthName = new Intl.DateTimeFormat(language, {
      month: 'long',
      timeZone: 'UTC',
    });
    return Object.fromEntries(
      Array.from({ length: 12 }, (_, index) => {
        const value = String(index + 1).padStart(2, '0');
        return [value, monthName.format(new Date(Date.UTC(2020, index, 1)))];
      }),
    );
  }, [language]);

  const yearItems = useMemo(() => {
    const current = new Date().getUTCFullYear();
    return Object.fromEntries(
      Array.from({ length: YEARS_BACK + YEARS_FORWARD + 1 }, (_, index) => {
        const year = String(current + YEARS_FORWARD - index);
        return [year, year];
      }),
    );
  }, []);

  const commit = (next: { year: string; month: string }) => {
    setParts(next);
    onChange(next.year && next.month ? `${next.year}-${next.month}-01` : '');
  };

  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={`${idPrefix}-month`}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <Select
          items={monthItems}
          value={parts.month || null}
          required={required}
          onValueChange={(month) =>
            commit({ ...parts, month: (month as string | null) ?? '' })
          }
        >
          <SelectTrigger
            id={`${idPrefix}-month`}
            aria-label={monthAriaLabel}
            className="w-full min-w-0 flex-[3]"
          >
            <SelectValue placeholder={monthPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(monthItems).map(([value, name]) => (
              <SelectItem key={value} value={value}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={yearItems}
          value={parts.year || null}
          required={required}
          onValueChange={(year) =>
            commit({ ...parts, year: (year as string | null) ?? '' })
          }
        >
          <SelectTrigger
            id={`${idPrefix}-year`}
            aria-label={yearAriaLabel}
            className="w-full min-w-0 flex-[2]"
          >
            <SelectValue placeholder={yearPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(yearItems).map(([value, name]) => (
              <SelectItem key={value} value={value}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {clearable && (parts.month || parts.year) ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={clearAriaLabel}
            className="text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => commit({ year: '', month: '' })}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
    </Field>
  );
}
