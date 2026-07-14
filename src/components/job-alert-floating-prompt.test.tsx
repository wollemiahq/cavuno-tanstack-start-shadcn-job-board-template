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
  it('uses the signup Card as its only surface while keeping the corner placement', async () => {
    const { container } = render(
      <JobAlertFloatingPrompt
        defaults={{ filters: {}, context: { source: 'jobs_list' } }}
        language="en"
      />,
    );

    await screen.findByRole('heading', { name: 'Never miss a job' });
    const prompt = container.querySelector(
      '[data-test="job-alert-floating-prompt"]',
    );
    await waitFor(() => expect(prompt).not.toBeNull());
    if (!prompt) throw new Error('Expected the floating job-alert prompt');

    expect(prompt.querySelector("[data-slot='card']")).toBeInTheDocument();
    expect(prompt).toHaveClass('fixed', 'right-4', 'bottom-4');
    expect(prompt).not.toHaveClass(
      'rounded-2xl',
      'bg-card',
      'shadow-lg',
      'ring-1',
    );
    expect(prompt).toHaveTextContent('Get new matching jobs in your inbox.');
  });
});
