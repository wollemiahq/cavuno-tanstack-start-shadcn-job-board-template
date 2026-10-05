// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchRadiusScope } from './search-radius-scope';

afterEach(cleanup);

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
      'Showing 1–20 jobs within 25 mi of Houston',
    );
    expect(screen.getByRole('button').textContent).toBe('25 mi');
  });

  it('names the place itself at the exact place, the menu still there', () => {
    expect(line({ within: null })?.textContent).toBe(
      'Showing 1–20 jobs in Houston only',
    );
    expect(screen.getByRole('button').textContent).toBe('Houston only');
  });

  it('says one job in the singular', () => {
    expect(line({ range: { from: 1, to: 1, count: 1 } })?.textContent).toBe(
      'Showing 1 job within 25 mi of Houston',
    );
  });

  it('keeps the menu with no results', () => {
    expect(line({ range: { from: 0, to: 0, count: 0 } })?.textContent).toBe(
      'No jobs within 25 mi of Houston',
    );
    expect(screen.getByRole('button').textContent).toBe('25 mi');
  });

  it('leaves the range out when the count is unknown', () => {
    expect(line({ unit: 'km', within: 10, range: null })?.textContent).toBe(
      'Showing jobs within 10 km of Houston',
    );
  });

  it('offers the exact place and the presets in the place unit', async () => {
    line();
    fireEvent.click(screen.getByRole('button', { name: '25 mi' }));
    const options = await screen.findAllByRole('menuitemradio');
    expect(options.map((option) => option.textContent)).toEqual([
      'Exact location only',
      'Within 5 mi',
      'Within 10 mi',
      'Within 25 mi',
      'Within 50 mi',
      'Within 100 mi',
    ]);
  });

  it.each([
    ['Exact location only', 0],
    ['Within 10 mi', 10],
    // The default distance is the plain URL: no `within`.
    ['Within 25 mi', undefined],
  ])('picking %s sets within to %s', async (option, expected) => {
    const onWithinChange = vi.fn();
    line({ within: 50, onWithinChange });

    fireEvent.click(screen.getByRole('button', { name: '50 mi' }));
    fireEvent.click(await screen.findByRole('menuitemradio', { name: option }));
    expect(onWithinChange).toHaveBeenCalledWith(expected);
  });

  it('closes the menu once a distance is picked', async () => {
    line();

    fireEvent.click(screen.getByRole('button', { name: '25 mi' }));
    fireEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Within 10 mi' }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument(),
    );
  });
});
