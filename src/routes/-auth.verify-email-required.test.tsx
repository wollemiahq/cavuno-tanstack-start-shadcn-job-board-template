// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

type AuthResult = { ok: true } | { ok: false; message: string };

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn<() => Promise<void>>(),
  navigate: vi.fn<(options: { href: string }) => Promise<void>>(),
  resendOtp: vi.fn<() => Promise<AuthResult>>(),
  verifyOtpCode:
    vi.fn<(input: { data: { code: string } }) => Promise<AuthResult>>(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useRouter: () => ({
      invalidate: mocks.invalidate,
      navigate: mocks.navigate,
    }),
  };
});

vi.mock('../server/auth', () => ({
  resendOtp: mocks.resendOtp,
  verifyOtpCode: mocks.verifyOtpCode,
}));

import { Route } from './auth.verify-email-required';

const OriginalResizeObserver = globalThis.ResizeObserver;

beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterAll(() => {
  globalThis.ResizeObserver = OriginalResizeObserver;
});

afterEach(async () => {
  // input-otp synchronizes selection through 0/10/50 ms callbacks; let them
  // settle before JSDOM removes window so verification tests cannot leak work.
  await act(() => new Promise((resolve) => setTimeout(resolve, 60)));
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('/auth/verify-email-required search contract', () => {
  it('validates a complete internal candidate destination', () => {
    const validate = Route.options.validateSearch;
    if (typeof validate !== 'function') {
      throw new Error(
        'The verification gate must validate its search parameters',
      );
    }

    expect(
      validate({ returnTo: '/jobs?q=design&selectedJob=product-designer' }),
    ).toEqual({
      returnTo: '/jobs?q=design&selectedJob=product-designer',
    });
  });

  it('returns a verified candidate to the validated destination', async () => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    vi.spyOn(Route, 'useSearch').mockReturnValue({ returnTo });
    mocks.verifyOtpCode.mockResolvedValue({ ok: true });
    const VerifyPage = Route.options.component;
    if (!VerifyPage)
      throw new Error('The verification route needs a component');

    const { container } = render(<VerifyPage />);
    // Typing the sixth digit IS the submit — no Verify button exists.
    fireEvent.change(container.querySelector('input[name="code"]')!, {
      target: { value: '123456' },
    });

    await waitFor(() => {
      expect(mocks.verifyOtpCode).toHaveBeenCalledWith({
        data: { code: '123456' },
      });
      expect(mocks.invalidate).toHaveBeenCalledOnce();
      expect(mocks.navigate).toHaveBeenCalledWith({ href: returnTo });
    });
  });

  it('recovers when email verification rejects unexpectedly', async () => {
    vi.spyOn(Route, 'useSearch').mockReturnValue({ returnTo: '/account' });
    mocks.verifyOtpCode.mockRejectedValue(new Error('network unavailable'));
    const VerifyPage = Route.options.component;
    if (!VerifyPage)
      throw new Error('The verification route needs a component');

    const { container } = render(<VerifyPage />);
    const code = container.querySelector('input[name="code"]')!;
    fireEvent.change(code, { target: { value: '123456' } });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Try again.',
    );
    expect(screen.getByRole('alert')).toHaveAttribute(
      'data-slot',
      'field-error',
    );
    // The input re-enables so the candidate can correct the code and retry.
    expect(code).toBeEnabled();
  });

  it('recovers when resending the verification code rejects unexpectedly', async () => {
    vi.spyOn(Route, 'useSearch').mockReturnValue({ returnTo: '/account' });
    mocks.resendOtp.mockRejectedValue(new Error('network unavailable'));
    const VerifyPage = Route.options.component;
    if (!VerifyPage)
      throw new Error('The verification route needs a component');

    render(<VerifyPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Try again.',
    );
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeEnabled();
  });

  it('announces a resent verification code with the owned alert', async () => {
    vi.spyOn(Route, 'useSearch').mockReturnValue({ returnTo: '/account' });
    mocks.resendOtp.mockResolvedValue({ ok: true });
    const VerifyPage = Route.options.component;
    if (!VerifyPage)
      throw new Error('The verification route needs a component');

    render(<VerifyPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));

    const status = await screen.findByRole('status');
    expect(status).toHaveAttribute('data-slot', 'alert');
    expect(status).toHaveTextContent('A fresh code is on its way.');
  });

  it('composes the verification code control as an owned field', () => {
    vi.spyOn(Route, 'useSearch').mockReturnValue({ returnTo: '/account' });
    const VerifyPage = Route.options.component;
    if (!VerifyPage)
      throw new Error('The verification route needs a component');

    const { container } = render(<VerifyPage />);
    const code = container.querySelector('input[name="code"]');
    expect(code?.closest('[data-slot="field"]')).not.toBeNull();
    expect(screen.getByText('6-digit code')).toHaveAttribute(
      'data-slot',
      'field-label',
    );
  });

  it('offers no sign-in escape hatch — the gate is verify or resend', () => {
    // The candidate here is already signed in; a "back to sign in" link was
    // a circular exit and was removed deliberately (CAV session decision).
    vi.spyOn(Route, 'useSearch').mockReturnValue({ returnTo: '/account' });
    const VerifyPage = Route.options.component;
    if (!VerifyPage)
      throw new Error('The verification route needs a component');

    render(<VerifyPage />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Verify email' }),
    ).toBeNull();
  });
});
