// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TalentFilterControls } from './talent-filter-controls';

const labels = {
  query: 'Candidate name or headline',
  queryPlaceholder: 'Search candidates…',
  skill: 'Skill',
  skillPlaceholder: 'Filter by skill…',
  search: 'Search',
};

afterEach(cleanup);

describe('TalentFilterControls', () => {
  it('keeps the URL query in the header and renders only the compact skill filter', () => {
    render(<TalentFilterControls labels={labels} onSubmit={vi.fn()} />);

    const form = screen.getByRole('textbox', { name: 'Skill' }).closest('form');
    if (!form) throw new Error('Expected the talent filter form');

    expect(form).toHaveAttribute('data-slot', 'talent-filter-bar');
    expect(form.querySelector("[data-slot='card']")).toBeNull();
    expect(form.querySelectorAll("[data-slot='field']")).toHaveLength(1);
    expect(form.querySelectorAll("[data-slot='input-group']")).toHaveLength(1);
    expect(
      form.querySelectorAll("[data-slot='input-group-control']"),
    ).toHaveLength(1);
    expect(
      screen.queryByRole('searchbox', { name: 'Candidate name or headline' }),
    ).toBeNull();
  });

  it('preserves the header query while applying the skill filter', () => {
    const onSubmit = vi.fn();
    render(
      <TalentFilterControls
        q="designer"
        skill="Figma"
        labels={labels}
        onSubmit={onSubmit}
      />,
    );

    const skill = screen.getByRole('textbox', { name: 'Skill' });
    expect(skill).toHaveValue('Figma');

    fireEvent.change(skill, { target: { value: 'Accessibility' } });
    fireEvent.submit(skill.closest('form') as HTMLFormElement);

    expect(onSubmit).toHaveBeenCalledWith({
      q: 'designer',
      skill: 'Accessibility',
    });
  });

  it('restores the URL-backed skill when browser history changes', () => {
    const { rerender } = render(
      <TalentFilterControls
        q="designer"
        skill="Figma"
        labels={labels}
        onSubmit={vi.fn()}
      />,
    );

    rerender(
      <TalentFilterControls
        q="researcher"
        skill="Accessibility"
        labels={labels}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole('textbox', { name: 'Skill' })).toHaveValue(
      'Accessibility',
    );
  });
});
