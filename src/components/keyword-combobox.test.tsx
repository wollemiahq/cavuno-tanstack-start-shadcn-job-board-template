// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { KeywordCombobox } from './keyword-combobox';

afterEach(cleanup);

const suggestions = [
  {
    id: 'category-engineering',
    type: 'category' as const,
    slug: 'engineering',
    name: 'Engineering',
  },
  {
    id: 'skill-robotics',
    type: 'skill' as const,
    slug: 'robotics',
    name: 'Robotics',
  },
];

describe('KeywordCombobox', () => {
  it('anchors category and skill suggestions to the complete keyword field', () => {
    const { container } = render(
      <KeywordCombobox
        value="rob"
        placeholder="Search jobs…"
        suggestions={suggestions}
        loading={false}
        onQueryChange={() => {}}
        onValueChange={() => {}}
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );

    fireEvent.focus(screen.getByRole('combobox', { name: /keyword/i }));

    expect(container.querySelector('[data-combobox-anchor]')).not.toBeNull();
    expect(
      document
        .querySelector('[data-slot="combobox-content"]')
        ?.getAttribute('data-chips'),
    ).toBe('true');
    expect(screen.getByRole('option', { name: /Robotics/ })).toBeTruthy();
    expect(screen.getByText('Skills')).toBeTruthy();
  });

  it('keeps free text editable and reports a picked canonical term', () => {
    const onValueChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <KeywordCombobox
        value="rob"
        placeholder="Search jobs…"
        suggestions={suggestions}
        loading={false}
        onQueryChange={() => {}}
        onValueChange={onValueChange}
        onSelect={onSelect}
        onClear={() => {}}
      />,
    );

    const input = screen.getByRole('combobox', { name: /keyword/i });
    fireEvent.input(input, {
      target: { value: 'robo' },
      inputType: 'insertText',
    });
    expect(onValueChange).toHaveBeenCalledWith('robo');

    fireEvent.click(screen.getByRole('option', { name: /Robotics/ }));
    expect(onSelect).toHaveBeenCalledWith(suggestions[1]);
  });
});
