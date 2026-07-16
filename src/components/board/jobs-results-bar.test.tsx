// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JobsResultsBar } from './jobs-results-bar';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

afterEach(cleanup);

describe('JobsResultsBar', () => {
  it('promotes the contextual count to the single results heading', () => {
    render(
      <JobsResultsBar
        count={12}
        page={1}
        pageSize={20}
        heading="Engineering jobs"
        language="en"
      />,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '12 Engineering jobs',
    );
    expect(screen.getByText('Showing 1–12 of 12 jobs')).toBeVisible();
    expect(screen.queryByRole('combobox', { name: 'Sort' })).toBeNull();
  });
});
