// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { KeywordCombobox } from './keyword-combobox';

import { m } from '@/paraglide/messages';

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
    // Category-vs-skill is an internal taxonomy split; the jobs scope shows
    // the term ALONE. Asserting the whole row rather than the absence of two
    // particular words, so a badge re-added with any other text still fails.
    const option = screen.getByRole('option', { name: /Robotics/ });
    expect(option.textContent).toBe('Robotics');
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

  it('badges post and tag suggestions so the blog scope stays legible', () => {
    render(
      <KeywordCombobox
        value="rel"
        placeholder="Search the blog…"
        suggestions={[
          {
            id: 'post-release-notes',
            type: 'post' as const,
            slug: 'release-notes',
            name: 'Release notes',
          },
          {
            id: 'tag-releases',
            type: 'tag' as const,
            slug: 'releases',
            name: 'Releases',
          },
        ]}
        loading={false}
        onQueryChange={() => {}}
        onValueChange={() => {}}
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );

    fireEvent.focus(screen.getByRole('combobox', { name: /keyword/i }));

    // Posts and tags are genuinely different things in one list, so each row
    // keeps its kind badge — unlike the jobs scope above.
    expect(screen.getByText(m.searchSuggestion_postBadge())).toBeTruthy();
    expect(screen.getByText(m.searchSuggestion_tagBadge())).toBeTruthy();
  });
});
