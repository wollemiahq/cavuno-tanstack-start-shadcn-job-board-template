// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { formatDistance } from '@cavuno/board/format';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchRadiusScope } from './search-radius-scope';

import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';

afterEach(cleanup);

// Expected wording comes from the catalog, so the suite holds in any board
// language (`pnpm run test:locale`).
const n = (value: number) => value.toLocaleString(getLocale());
const mi = (value: number) => formatDistance(value, 'mi', getLocale());
const km = (value: number) => formatDistance(value, 'km', getLocale());
const houstonOnly = () => m.searchRadius_exactPlace({ place: 'Houston' });

type Props = Parameters<typeof SearchRadiusScope>[0];

const houston: Props = {
  place: 'Houston',
  unit: 'mi',
  within: 25,
  defaultWithin: 25,
  range: { from: 1, to: 20, count: 93 },
  onWithinChange: () => {},
};

function line(props: Partial<Props> = {}) {
  const { container } = render(<SearchRadiusScope {...houston} {...props} />);
  return container.querySelector('[data-slot="search-radius-scope"]');
}

describe('SearchRadiusScope', () => {
  it('says the range, distance and place in one line; only the distance opens the menu', () => {
    expect(line()?.textContent).toBe(
      m.searchRadius_withinScope({
        from: n(1),
        to: n(20),
        count: 93,
        countLabel: n(93),
        distance: mi(25),
        place: 'Houston',
      }),
    );
    expect(screen.getByRole('button').textContent).toBe(mi(25));
  });

  it('names the place itself at the exact place, the menu still there', () => {
    expect(line({ within: null })?.textContent).toBe(
      m.searchRadius_exactScope({
        from: n(1),
        to: n(20),
        count: 93,
        countLabel: n(93),
        exactPlace: houstonOnly(),
      }),
    );
    expect(screen.getByRole('button').textContent).toBe(houstonOnly());
  });

  it('says one job in the singular', () => {
    expect(line({ range: { from: 1, to: 1, count: 1 } })?.textContent).toBe(
      m.searchRadius_withinScope({
        from: n(1),
        to: n(1),
        count: 1,
        countLabel: n(1),
        distance: mi(25),
        place: 'Houston',
      }),
    );
  });

  it('says the one job at the exact place in the singular', () => {
    expect(
      line({ within: null, range: { from: 1, to: 1, count: 1 } })?.textContent,
    ).toBe(
      m.searchRadius_exactScope({
        from: n(1),
        to: n(1),
        count: 1,
        countLabel: n(1),
        exactPlace: houstonOnly(),
      }),
    );
  });

  it('says the position of a last page holding one job, not a range', () => {
    const range = { from: 21, to: 21, count: 21 };

    expect(line({ range })?.textContent).toBe(
      m.searchRadius_withinScopeLast({
        to: n(21),
        count: 21,
        countLabel: n(21),
        distance: mi(25),
        place: 'Houston',
      }),
    );
    cleanup();
    expect(line({ within: null, range })?.textContent).toBe(
      m.searchRadius_exactScopeLast({
        to: n(21),
        count: 21,
        countLabel: n(21),
        exactPlace: houstonOnly(),
      }),
    );
  });

  it('keeps the menu with no results', () => {
    expect(line({ range: { from: 0, to: 0, count: 0 } })?.textContent).toBe(
      m.searchRadius_withinEmpty({ distance: mi(25), place: 'Houston' }),
    );
    expect(screen.getByRole('button').textContent).toBe(mi(25));
  });

  it('leaves the range out when the count is unknown', () => {
    expect(line({ unit: 'km', within: 10, range: null })?.textContent).toBe(
      m.searchRadius_withinScopeUncounted({
        distance: km(10),
        place: 'Houston',
      }),
    );
  });

  it('offers the exact place and the presets in the place unit', async () => {
    line();
    fireEvent.click(screen.getByRole('button', { name: mi(25) }));
    const options = await screen.findAllByRole('menuitemradio');
    expect(options.map((option) => option.textContent)).toEqual([
      m.searchRadius_exactOption(),
      ...[5, 10, 25, 50, 100].map((value) =>
        m.searchRadius_withinOption({ distance: mi(value) }),
      ),
    ]);
  });

  it.each([
    ['the exact place', () => m.searchRadius_exactOption(), 0],
    [
      'within 10 mi',
      () => m.searchRadius_withinOption({ distance: mi(10) }),
      10,
    ],
    // The default distance is the plain URL: no `within`.
    [
      'within 25 mi',
      () => m.searchRadius_withinOption({ distance: mi(25) }),
      undefined,
    ],
  ])('picking %s sets within to %s', async (_label, option, expected) => {
    const onWithinChange = vi.fn();
    line({ within: 50, onWithinChange });

    fireEvent.click(screen.getByRole('button', { name: mi(50) }));
    fireEvent.click(
      await screen.findByRole('menuitemradio', { name: option() }),
    );
    expect(onWithinChange).toHaveBeenCalledWith(expected);
  });

  it('closes the menu once a distance is picked', async () => {
    line();

    fireEvent.click(screen.getByRole('button', { name: mi(25) }));
    fireEvent.click(
      await screen.findByRole('menuitemradio', {
        name: m.searchRadius_withinOption({ distance: mi(10) }),
      }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument(),
    );
  });
});
