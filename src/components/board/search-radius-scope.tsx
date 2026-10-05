'use client';

import {
  formatDistance,
  searchRadiusOptions,
  type DistanceUnit,
} from '@cavuno/board/format';
import { ChevronDown, MapPin } from 'lucide-react';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

import { SEARCH_RADIUS_EXACT } from '@/board/search-radius';
import type { ResultsRange } from '@/components/board/jobs-results-bar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Stands in for the menu while the message is formatted, then split on. */
const MENU_SLOT = '\u0000';

/**
 * The results line of a city or locality listing, SEEK-style: "Showing 1–20
 * jobs within **25 mi ⌄** of Houston". Only the distance opens the menu,
 * which picks a preset distance or the place itself ("Showing 1–20 jobs in
 * **Houston only ⌄**").
 */
export function SearchRadiusScope({
  place,
  unit,
  within,
  defaultWithin,
  range,
  onWithinChange,
}: {
  /** The place's short name, e.g. `Houston`. */
  place: string;
  unit: DistanceUnit;
  /** The applied distance in `unit`, or `null` for the place itself. */
  within: number | null;
  /** The market default in `unit`; picking it drops `within` from the URL. */
  defaultWithin: number;
  /** The page's range, or `null` when the count is unknown. */
  range: ResultsRange | null;
  /**
   * The new `within` URL value: a preset, `0` for the exact place, or
   * `undefined` for the default distance (the plain URL).
   */
  onWithinChange: (within: number | undefined) => void;
}) {
  const locale = getLocale();
  const distance = (value: number) => formatDistance(value, unit, locale);
  const triggerText =
    within === null ? m.searchRadius_exactPlace({ place }) : distance(within);
  const [before, after = ''] = sentence({
    place,
    within,
    range,
    locale,
  }).split(MENU_SLOT);

  return (
    <p
      data-slot="search-radius-scope"
      className="text-muted-foreground flex items-center gap-1 text-xs"
    >
      <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
      <span>
        {before}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-foreground px-1 font-semibold"
                data-test="search-radius-trigger"
              />
            }
          >
            <span>{triggerText}</span>
            <ChevronDown aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {m.searchRadius_menuLabel()}
              </DropdownMenuLabel>
              {/* Radio items keep the menu open by default; picking a
                  distance is a one-shot choice, so each item closes it. */}
              <DropdownMenuRadioGroup
                value={String(within ?? SEARCH_RADIUS_EXACT)}
                onValueChange={(value: string) => {
                  const next = Number(value);
                  onWithinChange(next === defaultWithin ? undefined : next);
                }}
              >
                <DropdownMenuRadioItem
                  value={String(SEARCH_RADIUS_EXACT)}
                  closeOnClick
                >
                  {m.searchRadius_exactOption()}
                </DropdownMenuRadioItem>
                {searchRadiusOptions(unit).map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={String(option.value)}
                    closeOnClick
                  >
                    {m.searchRadius_withinOption({
                      distance: distance(option.value),
                    })}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {after}
      </span>
    </p>
  );
}

/** The line's text with `MENU_SLOT` where the distance menu goes. */
function sentence({
  place,
  within,
  range,
  locale,
}: {
  place: string;
  within: number | null;
  range: ResultsRange | null;
  locale: string;
}): string {
  if (within === null) {
    if (range === null) {
      return m.searchRadius_exactScopeUncounted({ exactPlace: MENU_SLOT });
    }
    if (range.count === 0) {
      return m.searchRadius_exactEmpty({ exactPlace: MENU_SLOT });
    }
    return m.searchRadius_exactScope({
      from: range.from.toLocaleString(locale),
      to: range.to.toLocaleString(locale),
      count: range.count,
      countLabel: range.count.toLocaleString(locale),
      exactPlace: MENU_SLOT,
    });
  }
  if (range === null) {
    return m.searchRadius_withinScopeUncounted({ distance: MENU_SLOT, place });
  }
  if (range.count === 0) {
    return m.searchRadius_withinEmpty({ distance: MENU_SLOT, place });
  }
  return m.searchRadius_withinScope({
    from: range.from.toLocaleString(locale),
    to: range.to.toLocaleString(locale),
    count: range.count,
    countLabel: range.count.toLocaleString(locale),
    distance: MENU_SLOT,
    place,
  });
}
