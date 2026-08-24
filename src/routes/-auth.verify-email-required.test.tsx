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
  invalidate: vi.fn<(options?: { sync?: boolean }) => Promise<void>>(),
  navigate: vi.fn<(options: { href: string }) => Promise<void>>(),
  resendOtp: vi.fn<() => Promise<AuthResult>>(),
  verifyOtpCode:
    vi.fn<(input: { data: { code: string } }) => Promise<AuthResult>>(),
  getSessionUser: vi.fn<
    () => Promise<{
      id?: string;
      emailVerified: boolean;
      role?: string;
    } | null>
  >(),
  getResume: vi.fn<() => Promise<Resume>>(),
  getResumeOnboardingDismissal: vi.fn<() => Promise<string[]>>(),
  updateNotificationPreference: vi.fn(),
  toastActionError: vi.fn(),
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
  getSessionUserStrict: mocks.getSessionUser,
  getResume: mocks.getResume,
  getResumeOnboardingDismissal: mocks.getResumeOnboardingDismissal,
  uploadResume: vi.fn(),
  deleteResume: vi.fn(),
}));

vi.mock('../server/settings', () => ({
  updateNotificationPreference: mocks.updateNotificationPreference,
}));

vi.mock('@/lib/action-toast', () => ({
  toastActionError: mocks.toastActionError,
}));

import { isRedirect, redirect } from '@tanstack/react-router';

import { Route } from './auth.verify-email-required';

import { m } from '@/paraglide/messages';

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
  emailVerified = false,
  role = 'candidate',
  resume = null,
  resumeOnboardingDismissed = false,
  userId = 'candidate-1',
}: {
  returnTo?: string;
  emailVerified?: boolean;
  role?: 'candidate' | 'employer';
  resume?: Resume | null;
  resumeOnboardingDismissed?: boolean;
  userId?: string;
} = {}) {
  vi.spyOn(Route, 'useSearch').mockReturnValue({ returnTo });
  vi.spyOn(Route, 'useLoaderData').mockReturnValue({
    emailVerified,
    role,
    resume,
    resumeOnboardingDismissed,
    userId,
  });
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
      m.candidateAction_errorText(),
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
    fireEvent.click(
      screen.getByRole('button', {
        name: m.authVerifyEmailRequired_resendLabel(),
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.candidateAction_errorText(),
    );
    expect(
      screen.getByRole('button', {
        name: m.authVerifyEmailRequired_resendLabel(),
      }),
    ).toBeEnabled();
  });

  it('announces a resent verification code with the owned alert', async () => {
    mocks.resendOtp.mockResolvedValue({ ok: true });

    renderVerifyPage();
    fireEvent.click(
      screen.getByRole('button', {
        name: m.authVerifyEmailRequired_resendLabel(),
      }),
    );

    const status = await screen.findByRole('status');
    expect(status).toHaveAttribute('data-slot', 'alert');
    expect(status).toHaveTextContent(m.authVerifyEmailRequired_resentText());
  });

  it('composes the verification code control as an owned field', () => {
    const { container } = renderVerifyPage();
    const code = container.querySelector('input[name="code"]');
    expect(code?.closest('[data-slot="field"]')).not.toBeNull();
    expect(
      screen.getByText(m.authVerifyEmailRequired_codeLabel()),
    ).toHaveAttribute('data-slot', 'field-label');
  });

  it('offers no sign-in escape hatch — the gate is verify or resend', () => {
    // The candidate here is already signed in, so returning to sign-in would
    // create a circular exit from the verification gate.
    renderVerifyPage();

    expect(screen.queryByRole('link')).toBeNull();
    expect(
      screen.queryByRole('button', {
        name: m.authVerifyEmailRequired_verifyLabel(),
      }),
    ).toBeNull();
  });
});

describe('/auth/verify-email-required resume offer step', () => {
  it('resumes after the email was verified in another window', () => {
    renderVerifyPage({ emailVerified: true, resume: emptyResume });

    expect(
      screen.getByText(m.authVerifyEmailRequired_resumeTitle()),
    ).toBeInTheDocument();
    expect(document.querySelector('input[name="code"]')).toBeNull();
    expect(mocks.verifyOtpCode).not.toHaveBeenCalled();
  });

  it('continues immediately on refresh when verification and resume onboarding are complete', async () => {
    const returnTo = '/jobs?q=design';

    renderVerifyPage({
      returnTo,
      emailVerified: true,
      resume: storedResume,
    });

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({ href: returnTo });
    });
    expect(
      screen.queryByText(m.authVerifyEmailRequired_resumeTitle()),
    ).toBeNull();
    expect(document.querySelector('input[name="code"]')).toBeNull();
    expect(mocks.verifyOtpCode).not.toHaveBeenCalled();
  });

  it('continues immediately on refresh after the candidate previously skipped the resume offer', async () => {
    const returnTo = '/account';

    renderVerifyPage({
      returnTo,
      emailVerified: true,
      resume: emptyResume,
      resumeOnboardingDismissed: true,
    });

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({ href: returnTo });
    });
    expect(
      screen.queryByText(m.authVerifyEmailRequired_resumeTitle()),
    ).toBeNull();
  });

  it('reconciles a revoked OTP when the email was already verified elsewhere', async () => {
    const returnTo = '/jobs?q=design';
    let loaderData = {
      emailVerified: false,
      role: 'candidate' as const,
      resume: null as Resume | null,
      resumeOnboardingDismissed: false,
      userId: 'candidate-1',
    };
    mocks.verifyOtpCode.mockResolvedValue({
      ok: false,
      message: 'Invalid verification code',
    });
    vi.spyOn(Route, 'useSearch').mockReturnValue({ returnTo });
    vi.spyOn(Route, 'useLoaderData').mockImplementation(() => loaderData);
    const VerifyPage = Route.options.component;
    if (!VerifyPage)
      throw new Error('The verification route needs a component');
    const { container, rerender } = render(<VerifyPage />);

    fireEvent.change(container.querySelector('input[name="code"]')!, {
      target: { value: '123456' },
    });

    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalledOnce());
    loaderData = {
      emailVerified: true,
      role: 'candidate',
      resume: emptyResume,
      resumeOnboardingDismissed: false,
      userId: 'candidate-1',
    };
    rerender(<VerifyPage />);

    expect(
      await screen.findByText(m.authVerifyEmailRequired_resumeTitle()),
    ).toBeInTheDocument();
    expect(screen.queryByText('Invalid verification code')).toBeNull();
  });

  it('sends a verified employer directly to the employer destination', () => {
    const returnTo = '/employers/dashboard';

    renderVerifyPage({ returnTo, emailVerified: true, role: 'employer' });

    expect(
      screen.queryByText(m.authVerifyEmailRequired_resumeTitle()),
    ).toBeNull();
    expect(document.querySelector('input[name="code"]')).toBeNull();
    expect(mocks.navigate).toHaveBeenCalledWith({ href: returnTo });
  });

  it('offers a skippable resume upload after verification', async () => {
    const returnTo = '/jobs?q=design';
    mocks.verifyOtpCode.mockResolvedValue({ ok: true });

    const { container } = renderVerifyPage({ returnTo, resume: emptyResume });
    fireEvent.change(container.querySelector('input[name="code"]')!, {
      target: { value: '123456' },
    });

    expect(
      await screen.findByText(m.authVerifyEmailRequired_resumeTitle()),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-test="resume-upload"]'),
    ).toBeInTheDocument();
    // Offering the step must not navigate away on its own.
    expect(mocks.navigate).not.toHaveBeenCalled();

    expect(
      screen.queryByRole('checkbox', {
        name: m.resumeUpload_keepCopyLabel(),
      }),
    ).toBeNull();
    const recommendations = screen.getByRole('checkbox', {
      name: m.authVerifyEmailRequired_recommendedJobEmailsLabel(),
    });
    expect(recommendations).not.toBeChecked();
    fireEvent.click(recommendations);
    await waitFor(() => {
      expect(mocks.updateNotificationPreference).toHaveBeenCalledWith({
        data: {
          channel: 'recommendedJobEmails',
          subscribed: true,
        },
      });
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: m.authVerifyEmailRequired_resumeSkipLabel(),
      }),
    );
    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({ href: returnTo });
    });
    expect(document.cookie).toContain(
      'cavuno_resume_onboarding_completed_candidate-1=1',
    );
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
    expect(
      screen.queryByText(m.authVerifyEmailRequired_resumeTitle()),
    ).toBeNull();
  });

  it('keeps the onboarding opt-in unchecked when the immediate save fails', async () => {
    mocks.verifyOtpCode.mockResolvedValue({ ok: true });
    mocks.updateNotificationPreference.mockRejectedValue(
      new Error('network unavailable'),
    );
    const { container } = renderVerifyPage({ resume: emptyResume });
    fireEvent.change(container.querySelector('input[name="code"]')!, {
      target: { value: '123456' },
    });
    const checkbox = await screen.findByRole('checkbox', {
      name: m.authVerifyEmailRequired_recommendedJobEmailsLabel(),
    });
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(mocks.toastActionError).toHaveBeenCalled();
    });
    expect(checkbox).not.toBeChecked();
  });
});

describe('/auth/verify-email-required resume loader', () => {
  function routeLoader() {
    const loader = Route.options.loader;
    if (typeof loader !== 'function') {
      throw new Error('The verification gate needs a resume loader');
    }
    return loader as unknown as () => Promise<{
      emailVerified: boolean;
      role: 'candidate' | 'employer';
      resume: Resume | null;
      resumeOnboardingDismissed: boolean;
    }>;
  }

  it('redirects signed-out visitors to sign-in with the final destination preserved', async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    mocks.getResume.mockRejectedValue(new Error('UNAUTHENTICATED'));

    let result: unknown;
    try {
      await routeLoader()();
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.to).toBe('/auth/sign-in');
    expect(result.options.search).toEqual({
      returnTo: '/account',
    });
  });

  it('surfaces a failed session probe instead of treating it as signed out', async () => {
    mocks.getSessionUser.mockRejectedValue(new Error('profile unavailable'));

    await expect(routeLoader()()).rejects.toThrow('profile unavailable');
    expect(mocks.getResume).not.toHaveBeenCalled();
  });

  it('loads the resume state for the post-verify step', async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: 'candidate-1',
      emailVerified: true,
      role: 'candidate',
    });
    mocks.getResumeOnboardingDismissal.mockResolvedValue(['candidate-1']);
    mocks.getResume.mockResolvedValue(emptyResume);
    await expect(routeLoader()()).resolves.toMatchObject({
      emailVerified: true,
      role: 'candidate',
      resume: emptyResume,
      resumeOnboardingDismissed: true,
    });
  });

  it('degrades to no resume state while the candidate is unverified', async () => {
    mocks.getSessionUser.mockResolvedValue({
      emailVerified: false,
      role: 'candidate',
    });
    mocks.getResume.mockRejectedValue(new Error('EMAIL_UNVERIFIED'));
    await expect(routeLoader()()).resolves.toMatchObject({
      emailVerified: false,
      role: 'candidate',
      resume: null,
    });
  });

  it('does not load candidate resume state for an unverified employer', async () => {
    mocks.getSessionUser.mockResolvedValue({
      emailVerified: false,
      role: 'employer',
    });

    await expect(routeLoader()()).resolves.toMatchObject({
      emailVerified: false,
      role: 'employer',
      resume: null,
    });
    expect(mocks.getResume).not.toHaveBeenCalled();
  });

  it('re-throws board-access redirects instead of swallowing them', async () => {
    mocks.getSessionUser.mockResolvedValue({
      emailVerified: false,
      role: 'candidate',
    });
    mocks.getResume.mockRejectedValue(redirect({ to: '/password' }));
    await expect(routeLoader()()).rejects.toSatisfy((error) =>
      isRedirect(error),
    );
  });
});
