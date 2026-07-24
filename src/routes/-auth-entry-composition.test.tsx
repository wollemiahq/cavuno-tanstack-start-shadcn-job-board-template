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

import { m } from '@/paraglide/messages';

afterEach(cleanup);

function renderNotFound(route: typeof JoinRoute | typeof EmployerSignUpRoute) {
  const NotFound = route.options.notFoundComponent;
  if (!NotFound)
    throw new Error('The auth entry route needs a not-found component');
  render(<NotFound isNotFound routeId={route.id} />);
}

describe('auth entry not-found states', () => {
  it('renders unavailable entry routes as owned empty states', () => {
    renderNotFound(JoinRoute);
    const candidateDescription = screen.getByText(
      m.authJoin_notAvailableText(),
    );
    expect(candidateDescription).toHaveAttribute(
      'data-slot',
      'empty-description',
    );
    expect(candidateDescription.closest('[data-slot="empty"]')).not.toBeNull();

    cleanup();
    renderNotFound(EmployerSignUpRoute);
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
