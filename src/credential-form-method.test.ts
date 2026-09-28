// @vitest-environment jsdom
import { createElement } from 'react';

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InviteMemberDialog } from './components/employer/invite-member-dialog';
import { SettingsEmailCard } from './components/settings-email-card';
import { SettingsPasswordCard } from './components/settings-password-card';
import { Route as PasswordRoute } from './routes/password';

vi.mock('./server/settings', () => ({
  requestEmailChange: vi.fn(),
  requestSetPassword: vi.fn(),
  updatePassword: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouter: () => ({ invalidate: vi.fn(), navigate: vi.fn() }),
}));
vi.mock('./server/board-access', () => ({ verifyBoardPassword: vi.fn() }));
vi.mock('./server/queries', () => ({ getSeoBase: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Native method is observable even when React's submit handler never runs.
// Auth, onboarding, profile, posting and apply fixtures check the same boundary
// while exercising their own flows; this covers otherwise untested forms.
function expectNativePost(selector: string) {
  const inputs = document.querySelectorAll<HTMLInputElement>(selector);
  expect(inputs.length).toBeGreaterThan(0);
  for (const input of inputs) expect(input.form?.method).toBe('post');
}

describe('native submission keeps credentials and personal data out of URLs', () => {
  it('posts the board-access password', () => {
    vi.spyOn(PasswordRoute, 'useSearch').mockReturnValue({});
    const component = PasswordRoute.options.component;
    if (!component) throw new Error('Expected the board password page');
    render(createElement(component));
    expectNativePost('input[type="password"]');
  });

  it('posts current and replacement passwords', () => {
    render(
      createElement(SettingsPasswordCard, {
        hasPassword: true,
        email: 'member@example.test',
      }),
    );
    expectNativePost('input[type="password"]');
  });

  it('posts an account email change', () => {
    render(
      createElement(SettingsEmailCard, { currentEmail: 'member@example.test' }),
    );
    expectNativePost('input[type="email"]');
  });

  it('posts the invited member email from the open dialog', () => {
    render(
      createElement(InviteMemberDialog, {
        slug: 'fixture-company',
        open: true,
        onOpenChange: vi.fn(),
        actions: {
          createCompanyInvite: vi.fn(),
          invalidate: vi.fn(),
          toastError: vi.fn(),
          toastSuccess: vi.fn(),
        },
      }),
    );
    expectNativePost('input[type="email"]');
  });
});
