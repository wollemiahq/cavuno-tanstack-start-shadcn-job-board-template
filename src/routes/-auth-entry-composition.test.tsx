// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server/auth', () => ({ signUpEmployer: vi.fn<() => void>() }));
vi.mock('../server/queries', () => ({
  getBoardContext: vi.fn<() => void>(),
  getSeoBase: vi.fn<() => void>(),
}));
// The already-authed guard on these entry pages reads the account layer.
vi.mock('../server/account', () => ({ getSessionUser: vi.fn() }));

import { Route as EmployerSignUpRoute } from './auth.employer.sign-up';
import { Route as JoinRoute } from './auth.join';

afterEach(cleanup);

function renderNotFound(route: typeof JoinRoute | typeof EmployerSignUpRoute) {
  const NotFound = route.options.notFoundComponent;
  if (!NotFound)
    throw new Error('The auth entry route needs a not-found component');
  render(<NotFound isNotFound routeId={route.id} />);
}

describe('auth entry not-found states', () => {
  it('renders unavailable join as the owned empty state', () => {
    renderNotFound(JoinRoute);

    expect(
      screen.getByText('Sign-up is not available on this board.'),
    ).toHaveAttribute('data-slot', 'empty-description');
    expect(
      screen
        .getByText('Sign-up is not available on this board.')
        .closest('[data-slot="empty"]'),
    ).not.toBeNull();
  });

  it('renders unavailable employer sign-up as the owned empty state', () => {
    renderNotFound(EmployerSignUpRoute);

    expect(
      screen.getByText('Employer sign-up is not available on this board.'),
    ).toHaveAttribute('data-slot', 'empty-description');
    expect(
      screen
        .getByText('Employer sign-up is not available on this board.')
        .closest('[data-slot="empty"]'),
    ).not.toBeNull();
  });
});
