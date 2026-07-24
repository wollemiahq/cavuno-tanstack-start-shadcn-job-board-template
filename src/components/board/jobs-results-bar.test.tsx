// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JobsResultsBar } from './jobs-results-bar';

import { m } from '@/paraglide/messages';

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
      m.jobSearch_contextualResultsHeading({
        count: '12',
        heading: 'Engineering jobs',
      }),
    );
    expect(
      screen.getByText(
        m.jobSearch_resultsShowingRange({
          from: '1',
          to: '12',
          count: '12',
        }),
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole('combobox', {
        name: m.jobSearch_sortPlaceholder(),
      }),
    ).toBeNull();
  });
});
