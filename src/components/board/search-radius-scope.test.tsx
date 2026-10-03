// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { formatDistance } from '@cavuno/board/format';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';
import { SearchRadiusScope } from './search-radius-scope';

afterEach(cleanup);

const distance = (value: number, unit: 'mi' | 'km') =>
  formatDistance(value, unit, getLocale());

describe('SearchRadiusScope', () => {
  it('names the place itself until a distance is chosen', () => {
    render(
      <SearchRadiusScope
        place="Austin"
        unit="mi"
        within={undefined}
        onWithinChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', {
        name: m.searchRadius_exactScope({ place: 'Austin' }),
      }),
    ).toBeInTheDocument();
  });

  it('offers the exact place and the presets in the place unit', async () => {
    const onWithinChange = vi.fn();
    render(
      <SearchRadiusScope
        place="Austin"
        unit="mi"
        within={undefined}
        onWithinChange={onWithinChange}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: m.searchRadius_exactScope({ place: 'Austin' }),
      }),
    );
    const options = await screen.findAllByRole('menuitemradio');
    expect(options.map((option) => option.textContent)).toEqual([
      m.searchRadius_exactOption(),
      ...[5, 10, 25, 50, 100].map((value) =>
        m.searchRadius_withinOption({ distance: distance(value, 'mi') }),
      ),
    ]);

    fireEvent.click(
      screen.getByRole('menuitemradio', {
        name: m.searchRadius_withinOption({ distance: distance(25, 'mi') }),
      }),
    );
    expect(onWithinChange).toHaveBeenCalledWith(25);
  });

  it('labels a widened listing and returns it to the exact place', async () => {
    const onWithinChange = vi.fn();
    render(
      <SearchRadiusScope
        place="Berlin"
        unit="km"
        within={10}
        onWithinChange={onWithinChange}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: m.searchRadius_withinScope({
          distance: distance(10, 'km'),
          place: 'Berlin',
        }),
      }),
    );
    fireEvent.click(
      await screen.findByRole('menuitemradio', {
        name: m.searchRadius_exactOption(),
      }),
    );
    expect(onWithinChange).toHaveBeenCalledWith(undefined);
  });
});
