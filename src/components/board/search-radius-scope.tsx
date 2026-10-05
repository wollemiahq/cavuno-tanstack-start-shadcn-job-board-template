'use client';

import {
  formatDistance,
  searchRadiusOptions,
  type DistanceUnit,
} from '@cavuno/board/format';
import { ChevronDown } from 'lucide-react';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

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

const EXACT = 'exact';

/**
 * "Showing jobs in Sydney ⌄" under a location listing's result count. The
 * menu widens the listing to a preset distance around the place, or returns
 * it to the place itself.
 */
export function SearchRadiusScope({
  place,
  unit,
  within,
  onWithinChange,
}: {
  /** The place's display name. */
  place: string;
  unit: DistanceUnit;
  /** The applied distance in `unit`, or `undefined` for the place itself. */
  within: number | undefined;
  onWithinChange: (within: number | undefined) => void;
}) {
  const locale = getLocale();
  const options = searchRadiusOptions(unit);
  const label =
    within === undefined
      ? m.searchRadius_exactScope({ place })
      : m.searchRadius_withinScope({
          distance: formatDistance(within, unit, locale),
          place,
        });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="-ms-2"
            data-test="search-radius-trigger"
          />
        }
      >
        <span>{label}</span>
        <ChevronDown aria-hidden="true" className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{m.searchRadius_menuLabel()}</DropdownMenuLabel>
          {/* Radio items keep the menu open by default; picking a distance
              is a one-shot choice, so each item closes it. */}
          <DropdownMenuRadioGroup
            value={within === undefined ? EXACT : String(within)}
            onValueChange={(value: string) =>
              onWithinChange(value === EXACT ? undefined : Number(value))
            }
          >
            <DropdownMenuRadioItem value={EXACT} closeOnClick>
              {m.searchRadius_exactOption()}
            </DropdownMenuRadioItem>
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={String(option.value)}
                closeOnClick
              >
                {m.searchRadius_withinOption({
                  distance: formatDistance(option.value, unit, locale),
                })}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
