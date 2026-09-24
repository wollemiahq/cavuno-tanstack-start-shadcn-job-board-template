// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JobAlertFloatingPromptView } from './job-alert-floating-prompt-view';

import { m } from '@/paraglide/messages';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderPrompt() {
  render(
    <JobAlertFloatingPromptView
      defaults={{ filters: {}, context: { source: 'jobs_list' } }}
      language="en"
      subscribe={vi.fn()}
    />,
  );
}

describe('JobAlertFloatingPrompt', () => {
  it('offers job alerts without duplicating the signup form', async () => {
    renderPrompt();

    await screen.findByRole('heading', {
      name: m.jobAlertFloatingPrompt_defaultTitle(),
    });
    expect(
      screen.getByRole('textbox', { name: m.alerts_emailAriaLabel() }),
    ).toHaveAttribute('type', 'email');
  });

  it('shows and dismisses the prompt when the browser has no localStorage', async () => {
    // Android WebViews without DOM storage expose `localStorage` as null.
    vi.stubGlobal('localStorage', null);
    renderPrompt();

    await screen.findByRole('heading', {
      name: m.jobAlertFloatingPrompt_defaultTitle(),
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: m.jobAlertFloatingPrompt_dismissAriaLabel(),
      }),
    );
    expect(
      screen.queryByRole('heading', {
        name: m.jobAlertFloatingPrompt_defaultTitle(),
      }),
    ).not.toBeInTheDocument();
  });
});
