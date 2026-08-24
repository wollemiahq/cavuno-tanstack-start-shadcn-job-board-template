// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn(),
  signUpEmployer: vi.fn(),
  getBoardContext: vi.fn(),
  getSessionUser: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    Link: ({
      to,
      search,
      children,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      to: string;
      search?: Record<string, string | undefined>;
    }) => (
      <a
        href={`${to}${
          search
            ? `?${new URLSearchParams(
                Object.entries(search).filter(
                  (entry): entry is [string, string] => entry[1] !== undefined,
                ),
              )}`
            : ''
        }`}
        {...props}
      >
        {children}
      </a>
    ),
    useRouter: () => ({ invalidate: mocks.invalidate }),
  };
});

vi.mock('../server/auth', () => ({
  signUpEmployer: mocks.signUpEmployer,
}));
vi.mock('../server/queries', () => ({
  getBoardContext: mocks.getBoardContext,
}));
vi.mock('../server/account', () => ({
  getSessionUser: mocks.getSessionUser,
}));

import { isRedirect } from '@tanstack/react-router';

import { Route } from './auth.employer.sign-up';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('/auth/employer/sign-up continuation', () => {
  it('sends successful employer signup to the verification gate for the dashboard', async () => {
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({
      boardName: 'Cavuno Jobs',
    });
    mocks.signUpEmployer.mockResolvedValue({ ok: true });
    const SignUpPage = Route.options.component;
    if (!SignUpPage)
      throw new Error('The employer sign-up route needs a component');

    render(<SignUpPage />);
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Ada Employer' },
    });
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'ada@company.example' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Create employer account' }),
    );

    const action = await screen.findByRole('link', {
      name: 'Go to employer dashboard',
    });
    const url = new URL(action.getAttribute('href')!, 'https://board.example');
    expect(url.pathname).toBe('/auth/verify-email-required');
    expect(url.searchParams.get('returnTo')).toBe('/employers/dashboard');
  });

  it('re-enters the verification gate for an existing unverified employer session', async () => {
    mocks.getSessionUser.mockResolvedValue({
      role: 'employer',
      emailVerified: false,
    });
    mocks.getBoardContext.mockResolvedValue({
      name: 'Cavuno Jobs',
      features: { employers: true },
    });
    const loader = Route.options.loader;
    if (typeof loader !== 'function')
      throw new Error('The employer sign-up route needs a loader');

    let result: unknown;
    try {
      await loader({} as never);
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe(
      '/auth/verify-email-required?returnTo=%2Femployers%2Fdashboard',
    );
  });

  it('sends an existing verified employer session to the employer dashboard', async () => {
    mocks.getSessionUser.mockResolvedValue({
      role: 'employer',
      emailVerified: true,
    });
    mocks.getBoardContext.mockResolvedValue({
      name: 'Cavuno Jobs',
      features: { employers: true },
    });
    const loader = Route.options.loader;
    if (typeof loader !== 'function')
      throw new Error('The employer sign-up route needs a loader');

    let result: unknown;
    try {
      await loader({} as never);
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe('/employers/dashboard');
  });
});
