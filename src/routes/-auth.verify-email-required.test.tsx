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

vi.mock('../server/queries', () => ({ getSeoBase: vi.fn() }));

import type { Resume } from '@cavuno/board';

type AuthResult = { ok: true } | { ok: false; message: string };

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn<() => Promise<void>>(),
  navigate: vi.fn<(options: { href: string }) => Promise<void>>(),
  resendOtp: vi.fn<() => Promise<AuthResult>>(),
  verifyOtpCode:
    vi.fn<(input: { data: { code: string } }) => Promise<AuthResult>>(),
  getResume: vi.fn<() => Promise<Resume>>(),
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

vi.mock('../server/account', () => ({
  getResume: mocks.getResume,
  uploadResume: vi.fn(),
  deleteResume: vi.fn(),
}));

import { isRedirect, redirect } from '@tanstack/react-router';

import { Route } from './auth.verify-email-required';

const emptyResume: Resume = {
  object: 'resume',
  parseStatus: null,
  parseFailureReason: null,
  parsedAt: null,
  keepResumeOnFile: false,
  hasResumeOnFile: false,
  file: null,
};

const storedResume: Resume = {
  ...emptyResume,
  parseStatus: 'parsed',
  hasResumeOnFile: true,
  file: {
    url: 'https://files.example/resume.pdf',
    contentType: 'application/pdf',
    sizeBytes: 12_345,
  },
};

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

function renderVerifyPage({
  returnTo = '/account',
  resume = null,
}: {
  returnTo?: string;
  resume?: Resume | null;
} = {}) {
  vi.spyOn(Route, 'useSearch').mockReturnValue({ returnTo });
  vi.spyOn(Route, 'useLoaderData').mockReturnValue({ resume });
  const VerifyPage = Route.options.component;
  if (!VerifyPage) throw new Error('The verification route needs a component');
  return render(<VerifyPage />);
}

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
    // With no resume state available, the post-verify step has nothing to
    // offer and continues straight to the destination.
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    mocks.verifyOtpCode.mockResolvedValue({ ok: true });

    const { container } = renderVerifyPage({ returnTo, resume: null });
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
    mocks.verifyOtpCode.mockRejectedValue(new Error('network unavailable'));

    const { container } = renderVerifyPage();
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
    mocks.resendOtp.mockRejectedValue(new Error('network unavailable'));

    renderVerifyPage();
    fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Try again.',
    );
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeEnabled();
  });

  it('announces a resent verification code with the owned alert', async () => {
    mocks.resendOtp.mockResolvedValue({ ok: true });

    renderVerifyPage();
    fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));

    const status = await screen.findByRole('status');
    expect(status).toHaveAttribute('data-slot', 'alert');
    expect(status).toHaveTextContent('A fresh code is on its way.');
  });

  it('composes the verification code control as an owned field', () => {
    const { container } = renderVerifyPage();
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
    renderVerifyPage();

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Verify email' })).toBeNull();
  });
});

describe('/auth/verify-email-required resume offer step', () => {
  it('offers a skippable resume upload after verification', async () => {
    const returnTo = '/jobs?q=design';
    mocks.verifyOtpCode.mockResolvedValue({ ok: true });

    const { container } = renderVerifyPage({ returnTo, resume: emptyResume });
    fireEvent.change(container.querySelector('input[name="code"]')!, {
      target: { value: '123456' },
    });

    expect(await screen.findByText('Add your resume')).toBeInTheDocument();
    expect(
      document.querySelector('[data-test="resume-upload"]'),
    ).toBeInTheDocument();
    // Offering the step must not navigate away on its own.
    expect(mocks.navigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({ href: returnTo });
    });
  });

  it('skips the offer when a resume is already on file', async () => {
    const returnTo = '/account';
    mocks.verifyOtpCode.mockResolvedValue({ ok: true });

    const { container } = renderVerifyPage({
      returnTo,
      resume: storedResume,
    });
    fireEvent.change(container.querySelector('input[name="code"]')!, {
      target: { value: '123456' },
    });

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({ href: returnTo });
    });
    expect(screen.queryByText('Add your resume')).toBeNull();
  });
});

describe('/auth/verify-email-required resume loader', () => {
  function routeLoader() {
    const loader = Route.options.loader;
    if (typeof loader !== 'function') {
      throw new Error('The verification gate needs a resume loader');
    }
    return loader as unknown as () => Promise<{ resume: Resume | null }>;
  }

  it('loads the resume state for the post-verify step', async () => {
    mocks.getResume.mockResolvedValue(emptyResume);
    await expect(routeLoader()()).resolves.toEqual({ resume: emptyResume });
  });

  it('degrades to no resume state while the candidate is unverified', async () => {
    mocks.getResume.mockRejectedValue(new Error('EMAIL_UNVERIFIED'));
    await expect(routeLoader()()).resolves.toEqual({ resume: null });
  });

  it('re-throws board-access redirects instead of swallowing them', async () => {
    mocks.getResume.mockRejectedValue(redirect({ to: '/password' }));
    await expect(routeLoader()()).rejects.toSatisfy((error) =>
      isRedirect(error),
    );
  });
});
