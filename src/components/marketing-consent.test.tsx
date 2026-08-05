// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn(),
  setMarketingConsent: vi.fn().mockResolvedValue({}),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useRouter: () => ({ invalidate: mocks.invalidate }),
  };
});

vi.mock('../server/settings', () => ({
  setMarketingConsent: mocks.setMarketingConsent,
}));

import { MarketingConsentSettings } from './marketing-consent-settings';
import { RegistrationPage } from './registration-page';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const COPY = {
  nameLabel: 'Name',
  emailLabel: 'Email',
  passwordLabel: 'Password',
  submitLabel: 'Create account',
  pendingLabel: 'Creating…',
  successTitle: 'Check your email',
  successText: 'We sent a link.',
  successActionLabel: 'Go to account',
};

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'Ada' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'ada@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'password-123' },
  });
}

describe('sign-up marketing checkbox', () => {
  it('renders nothing and sends no flag when the surface is off', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true });
    render(
      <RegistrationPage
        title="Sign up"
        supportingText="Welcome"
        copy={COPY}
        successHref="/account"
        onSubmit={onSubmit}
      />,
    );

    expect(
      document.querySelector('[data-test="sign-up-marketing-consent"]'),
    ).toBeNull();

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByText('Check your email');

    // No rendered checkbox → the submission carries no flag at all, so an
    // unconfigured form can never write a consent record.
    expect(onSubmit).toHaveBeenCalledWith({
      displayName: 'Ada',
      email: 'ada@example.test',
      password: 'password-123',
    });
  });

  it('defaults unticked and submits marketingConsent: false untouched', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true });
    render(
      <RegistrationPage
        title="Sign up"
        supportingText="Welcome"
        copy={COPY}
        successHref="/account"
        onSubmit={onSubmit}
        marketingConsent={{ disclosure: 'Email me things.' }}
      />,
    );

    const checkbox = document.querySelector(
      '[data-test="sign-up-marketing-consent"]',
    );
    expect(checkbox).not.toBeNull();
    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByText('Check your email');

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ marketingConsent: false }),
    );
  });

  it('submits marketingConsent: true after an affirmative tick', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true });
    render(
      <RegistrationPage
        title="Sign up"
        supportingText="Welcome"
        copy={COPY}
        successHref="/account"
        onSubmit={onSubmit}
        marketingConsent={{
          disclosure: 'Email me things.',
          privacyPolicyUrl: 'https://example.test/privacy',
          privacyLinkLabel: 'Privacy Policy',
        }}
      />,
    );

    const link = screen.getByRole('link', { name: 'Privacy Policy' });
    expect(link).toHaveAttribute('href', 'https://example.test/privacy');

    fireEvent.click(
      document.querySelector('[data-test="sign-up-marketing-consent"]')!,
    );
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByText('Check your email');

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ marketingConsent: true }),
    );
  });
});

describe('settings marketing consent row', () => {
  it('renders unticked for null (never decided) and withdrawn alike', () => {
    const { unmount } = render(<MarketingConsentSettings consent={null} />);
    expect(
      document.querySelector('[data-test="marketing-consent-toggle"]'),
    ).toHaveAttribute('aria-checked', 'false');
    unmount();

    render(
      <MarketingConsentSettings
        consent={{
          id: 'boardUsers_1',
          object: 'marketing_consent',
          status: 'withdrawn',
          source: 'notification_preferences',
          reason: 'person_request',
          grantedAt: '2026-08-01T00:00:00.000Z',
          withdrawnAt: '2026-08-02T00:00:00.000Z',
          revision: 2,
        }}
      />,
    );
    expect(
      document.querySelector('[data-test="marketing-consent-toggle"]'),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('grants on tick and withdraws on untick', async () => {
    const { unmount } = render(<MarketingConsentSettings consent={null} />);
    fireEvent.click(
      document.querySelector('[data-test="marketing-consent-toggle"]')!,
    );
    await vi.waitFor(() =>
      expect(mocks.setMarketingConsent).toHaveBeenCalledWith({
        data: { granted: true },
      }),
    );
    unmount();
    mocks.setMarketingConsent.mockClear();

    render(
      <MarketingConsentSettings
        consent={{
          id: 'boardUsers_1',
          object: 'marketing_consent',
          status: 'granted',
          source: 'candidate_sign_up',
          reason: null,
          grantedAt: '2026-08-01T00:00:00.000Z',
          withdrawnAt: null,
          revision: 1,
        }}
      />,
    );
    const toggle = document.querySelector(
      '[data-test="marketing-consent-toggle"]',
    )!;
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    await vi.waitFor(() =>
      expect(mocks.setMarketingConsent).toHaveBeenCalledWith({
        data: { granted: false },
      }),
    );
  });
});
