// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server/queries', () => ({
  subscribeJobAlert: vi.fn(),
}));

import { JobAlertFloatingPrompt } from './job-alert-floating-prompt';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('JobAlertFloatingPrompt', () => {
  it('offers job alerts without duplicating the signup form', async () => {
    render(
      <JobAlertFloatingPrompt
        defaults={{ filters: {}, context: { source: 'jobs_list' } }}
        language="en"
      />,
    );

    await screen.findByRole('heading', { name: 'Never miss a job' });
    await waitFor(() =>
      expect(
        screen.getByText('Get new matching jobs in your inbox.'),
      ).toBeVisible(),
    );
    expect(screen.getByRole('textbox', { name: 'email' })).toHaveAttribute(
      'type',
      'email',
    );
  });
});
