// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TalentSearchControls } from './talent-search-controls';

const labels = {
  query: 'Candidate name or headline',
  queryPlaceholder: 'Search candidates…',
  skill: 'Skill',
  skillPlaceholder: 'Filter by skill…',
  search: 'Search',
};

afterEach(cleanup);

describe('TalentSearchControls', () => {
  it('composes the controls from canonical shadcn Card, Field, and InputGroup slots', () => {
    render(<TalentSearchControls labels={labels} onSubmit={vi.fn()} />);

    const form = screen
      .getByRole('searchbox', { name: 'Candidate name or headline' })
      .closest('form');
    if (!form) throw new Error('Expected the talent search form');

    expect(form.querySelector("[data-slot='card']")).not.toBeNull();
    expect(form.querySelectorAll("[data-slot='field']")).toHaveLength(2);
    expect(form.querySelectorAll("[data-slot='input-group']")).toHaveLength(2);
    expect(
      form.querySelectorAll("[data-slot='input-group-control']"),
    ).toHaveLength(2);
  });

  it('submits candidate query and skill together', () => {
    const onSubmit = vi.fn();
    render(
      <TalentSearchControls
        q="designer"
        skill="Figma"
        labels={labels}
        onSubmit={onSubmit}
      />,
    );

    const query = screen.getByRole('searchbox', {
      name: 'Candidate name or headline',
    });
    const skill = screen.getByRole('textbox', { name: 'Skill' });
    expect(query).toHaveValue('designer');
    expect(skill).toHaveValue('Figma');

    fireEvent.change(query, { target: { value: 'researcher' } });
    fireEvent.change(skill, { target: { value: 'Accessibility' } });
    fireEvent.submit(query.closest('form') as HTMLFormElement);

    expect(onSubmit).toHaveBeenCalledWith({
      q: 'researcher',
      skill: 'Accessibility',
    });
  });

  it('restores both URL-backed fields when browser history changes', () => {
    const { rerender } = render(
      <TalentSearchControls
        q="designer"
        skill="Figma"
        labels={labels}
        onSubmit={vi.fn()}
      />,
    );

    rerender(
      <TalentSearchControls
        q="researcher"
        skill="Accessibility"
        labels={labels}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('searchbox', { name: 'Candidate name or headline' }),
    ).toHaveValue('researcher');
    expect(screen.getByRole('textbox', { name: 'Skill' })).toHaveValue(
      'Accessibility',
    );
  });
});
