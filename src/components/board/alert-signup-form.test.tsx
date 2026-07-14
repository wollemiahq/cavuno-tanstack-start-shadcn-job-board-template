// @vitest-environment jsdom
/** AlertSignupForm shadcn Card and form-composition contract. */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AlertSignupForm } from './alert-signup-form';

afterEach(cleanup);

function renderPanel() {
  const { container } = render(
    <AlertSignupForm
      language="en"
      onSubscribe={async () => ({ status: 'created' as const })}
    />,
  );
  const section = container.querySelector('section');
  if (!section) throw new Error('AlertSignupForm did not render a <section>');
  const card = section.querySelector("[data-slot='card']");
  if (!card) throw new Error('AlertSignupForm did not render an owned Card');
  return { card, section };
}

describe('AlertSignupForm theme composition', () => {
  it('uses the canonical primary tint instead of a parallel brand token system', () => {
    const { card } = renderPanel();
    expect(card.classList.contains('bg-primary/5')).toBe(true);
    expect(card.className).not.toMatch(/bg-brand/);
  });

  it('keeps the primary border so the callout still reads as emphasized', () => {
    const { card } = renderPanel();
    expect(card.classList.contains('border-primary')).toBe(true);
  });

  it('composes the email capture from the owned form families', () => {
    const { section } = renderPanel();

    expect(section.querySelector("[data-slot='field']")).toBeInTheDocument();
    expect(
      section.querySelector("[data-slot='input-group']"),
    ).toBeInTheDocument();
    expect(
      section.querySelector("[data-slot='button-group']"),
    ).toBeInTheDocument();
    expect(
      section.querySelector("[data-slot='input-group-control']"),
    ).toHaveAttribute('type', 'email');
  });
});

describe('AlertSignupForm submission', () => {
  it('keeps the exact subscription payload visible as pending with an owned spinner', () => {
    const onSubscribe = vi.fn(
      () => new Promise<{ status: 'created' | 'duplicate' }>(() => {}),
    );
    const { container } = render(
      <AlertSignupForm
        language="en"
        filters={{ jobFunctions: ['Design'] }}
        context={{ source: 'jobs_list' }}
        onSubscribe={onSubscribe}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'email' }), {
      target: { value: 'designer@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'get job alerts' }));

    expect(onSubscribe).toHaveBeenCalledWith({
      email: 'designer@example.com',
      consent: true,
      frequency: 'weekly',
      filters: { jobFunctions: ['Design'] },
      context: { source: 'jobs_list' },
    });
    expect(
      screen.getByRole('button', { name: 'get job alerts' }),
    ).toBeDisabled();
    expect(
      container.querySelector("[data-slot='spinner']"),
    ).toBeInTheDocument();
    expect(screen.getByText('Subscribing…')).toBeVisible();
  });

  it('announces a rejected subscription through the owned field error without clearing the email', async () => {
    render(
      <AlertSignupForm
        language="en"
        onSubscribe={vi.fn().mockRejectedValue(new Error('Unavailable'))}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'email' });
    fireEvent.change(input, { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'get job alerts' }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveAttribute('data-slot', 'field-error');
    expect(error).toHaveTextContent('Something went wrong. Please try again.');
    expect(input).toHaveValue('person@example.com');
  });
});
