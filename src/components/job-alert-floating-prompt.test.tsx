// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JobAlertFloatingPromptView } from './job-alert-floating-prompt-view';

import { m } from '@/paraglide/messages';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('JobAlertFloatingPrompt', () => {
  it('offers job alerts without duplicating the signup form', async () => {
    render(
      <JobAlertFloatingPromptView
        defaults={{ filters: {}, context: { source: 'jobs_list' } }}
        language="en"
        subscribe={vi.fn()}
      />,
    );

    await screen.findByRole('heading', {
      name: m.jobAlertFloatingPrompt_defaultTitle(),
    });
    expect(
      screen.getByRole('textbox', { name: m.alerts_emailAriaLabel() }),
    ).toHaveAttribute('type', 'email');
  });
});
