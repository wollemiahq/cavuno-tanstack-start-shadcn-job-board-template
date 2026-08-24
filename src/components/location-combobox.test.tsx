import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocationCombobox } from './location-combobox';

// @vitest-environment jsdom
/**
 * LocationCombobox behavior contract.
 *
 * The field is load-bearing for the /jobs listing: a debounced
 * `places.list({ q })` typeahead whose selection writes the
 * `/jobs/locations/$location` URL. The owned shadcn composition must preserve
 * the request shape, 200ms debounce, minimum-query gate, and
 * onSelect/onClear callbacks.
 */
const suggestion = (
  over: Partial<{
    id: string;
    name: string;
    slug: string;
    contextLabel: string | null;
  }>,
) => ({
  countryCode: null,
  regionCode: null,
  id: over.id ?? 'p1',
  slug: over.slug === undefined ? 'london' : over.slug,
  name: over.name ?? 'London',
  contextLabel:
    over.contextLabel === undefined ? 'United Kingdom' : over.contextLabel,
});

afterEach(() => {
  cleanup();
});

const locationInput = () => screen.getByLabelText<HTMLInputElement>('location');

const type = (value: string) => {
  const input = locationInput();
  fireEvent.input(input, { target: { value }, inputType: 'insertText' });
  return input;
};

const locationSearchProps = {
  suggestions: [suggestion({})],
  loading: false,
  onQueryChange: vi.fn(),
};

describe('LocationCombobox — resolved suggestion presentation', () => {
  it('renders each suggestion name with disambiguating country context and no job count', () => {
    render(
      <LocationCombobox
        {...locationSearchProps}
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );
    type('Lon');
    expect(screen.getByText('London')).toBeTruthy();
    // The view model supplies country context without leaking an API job count.
    expect(screen.getByText(/United Kingdom/)).toBeTruthy();
    expect(screen.queryByText('42')).toBeNull();
  });

  it('anchors the suggestion popup to the full location field', () => {
    const { container } = render(
      <LocationCombobox
        {...locationSearchProps}
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );

    type('Lon');

    expect(container.querySelector('[data-combobox-anchor]')).not.toBeNull();
    expect(
      document
        .querySelector('[data-slot="combobox-content"]')
        ?.getAttribute('data-chips'),
    ).toBe('true');
  });
});

describe('LocationCombobox — selection and clear write the URL semantics', () => {
  it('selecting a suggestion calls onSelect with its slug and name', () => {
    const onSelect = vi.fn();
    render(
      <LocationCombobox
        {...locationSearchProps}
        onSelect={onSelect}
        onClear={() => {}}
      />,
    );
    type('Lon');
    fireEvent.click(screen.getByText('London'));
    expect(onSelect).toHaveBeenCalledWith({ slug: 'london', name: 'London' });
  });

  it('selects the keyboard-active suggestion with Enter', () => {
    const onSelect = vi.fn();
    render(
      <LocationCombobox
        {...locationSearchProps}
        onSelect={onSelect}
        onClear={() => {}}
      />,
    );

    const input = type('Lon');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith({ slug: 'london', name: 'London' });
  });

  it('clearing calls onClear and empties the field', async () => {
    const onClear = vi.fn();
    render(
      <LocationCombobox
        {...locationSearchProps}
        value="berlin"
        valueLabel="Berlin"
        onSelect={() => {}}
        onClear={onClear}
      />,
    );
    const clear = screen.getByLabelText('clear location');
    fireEvent.click(clear);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(locationInput().value).toBe('');
    expect(document.activeElement).toBe(locationInput());
  });

  it('cold-loads the active slug label into the input', () => {
    render(
      <LocationCombobox
        {...locationSearchProps}
        value="berlin"
        valueLabel="Berlin"
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );
    expect(locationInput().value).toBe('Berlin');
  });

  it('restores the visible label when history changes the canonical location', () => {
    const { rerender } = render(
      <LocationCombobox
        {...locationSearchProps}
        value="sydney"
        valueLabel="Sydney"
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );

    rerender(
      <LocationCombobox
        {...locationSearchProps}
        value="melbourne"
        valueLabel="Melbourne"
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );
    expect(locationInput().value).toBe('Melbourne');

    rerender(
      <LocationCombobox
        {...locationSearchProps}
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );
    expect(locationInput().value).toBe('');
  });

  it('invalidates the selected place when its visible label is edited', () => {
    const onClear = vi.fn();
    render(
      <LocationCombobox
        {...locationSearchProps}
        value="sydney"
        valueLabel="Sydney"
        onSelect={() => {}}
        onClear={onClear}
      />,
    );

    fireEvent.input(locationInput(), {
      target: { value: 'Melbourne' },
      inputType: 'insertText',
    });

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('keeps the keystroke that invalidated the place, once the caller clears', () => {
    // The real parent reacts to onClear by dropping its value, which used to
    // bounce back through the sync effect and blank the field mid-word —
    // swallowing the very keystroke that triggered it.
    const { rerender } = render(
      <LocationCombobox
        {...locationSearchProps}
        value="sydney"
        valueLabel="Sydney"
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );

    fireEvent.input(locationInput(), {
      target: { value: 'Melb' },
      inputType: 'insertText',
    });

    rerender(
      <LocationCombobox
        {...locationSearchProps}
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );

    expect(locationInput().value).toBe('Melb');
  });

  it('still blanks on a later external clear, having swallowed only its own echo', () => {
    const { rerender } = render(
      <LocationCombobox
        {...locationSearchProps}
        value="sydney"
        valueLabel="Sydney"
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );

    fireEvent.input(locationInput(), {
      target: { value: 'Melb' },
      inputType: 'insertText',
    });
    rerender(
      <LocationCombobox
        {...locationSearchProps}
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );

    // A place resolves again, then history navigates away from it.
    rerender(
      <LocationCombobox
        {...locationSearchProps}
        value="melbourne"
        valueLabel="Melbourne"
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );
    expect(locationInput().value).toBe('Melbourne');

    rerender(
      <LocationCombobox
        {...locationSearchProps}
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );
    expect(locationInput().value).toBe('');
  });
});

describe('LocationCombobox — accessible autocomplete semantics', () => {
  it('delegates typed search terms to the caller', () => {
    const onQueryChange = vi.fn();
    render(
      <LocationCombobox
        suggestions={locationSearchProps.suggestions}
        loading={false}
        onQueryChange={onQueryChange}
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );

    type('Lon');

    expect(onQueryChange).toHaveBeenCalledWith('Lon');
  });

  it('announces the suggestion popup and its keyboard-active option', async () => {
    render(
      <LocationCombobox
        {...locationSearchProps}
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );

    const input = locationInput();
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');

    fireEvent.change(input, { target: { value: 'Lon' } });

    const listbox = screen.getByRole('listbox');
    const option = screen.getByRole('option', { name: /London/ });
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe(listbox.id);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() =>
      expect(input.getAttribute('aria-activedescendant')).toBe(option.id),
    );
    expect(option.getAttribute('data-highlighted')).not.toBeNull();
  });
});
