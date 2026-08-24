// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { EmployerSignUpUnavailable } from './-auth.employer.sign-up';
import { JoinUnavailable } from './-auth.join';

import { m } from '@/paraglide/messages';

afterEach(cleanup);

describe('auth entry not-found states', () => {
  it('renders unavailable entry routes as owned empty states', () => {
    render(<JoinUnavailable />);
    const candidateDescription = screen.getByText(
      m.authJoin_notAvailableText(),
    );
    expect(candidateDescription).toHaveAttribute(
      'data-slot',
      'empty-description',
    );
    expect(candidateDescription.closest('[data-slot="empty"]')).not.toBeNull();

    cleanup();
    render(<EmployerSignUpUnavailable />);
    const employerDescription = screen.getByText(
      m.authEmployerSignUp_notAvailableText(),
    );
    expect(employerDescription).toHaveAttribute(
      'data-slot',
      'empty-description',
    );
    expect(employerDescription.closest('[data-slot="empty"]')).not.toBeNull();
  });
});
