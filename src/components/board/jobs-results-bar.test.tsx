// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JobsResultsBar } from './jobs-results-bar';
// Stub only the messages whose arguments the assertions inspect; every other
// key stays the real generated message, so the component can use any catalog
// key without the test crashing on a missing stub.
vi.mock('@/paraglide/messages', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/paraglide/messages')>();
  return {
    ...actual,
    m: {
      ...actual.m,
      count_jobs: ({ count }: { count: number }) => `total:${count}`,
      jobSearch_contextualResultsHeading: ({
        count,
        heading,
      }: {
        count: string;
        heading: string;
      }) => `context:${heading};total:${count}`,
      jobSearch_resultsShowingRange: ({
        from,
        to,
        count,
      }: {
        from: string;
        to: string;
        count: number;
      }) => `range:${from}:${to};total:${count}`,
      jobSearch_resultsShowingCount: ({ count }: { count: number }) =>
        `single;total:${count}`,
      jobSearch_resultsShowingLast: ({
        to,
        count,
      }: {
        to: string;
        count: number;
      }) => `last:${to};total:${count}`,
    },
  };
});
afterEach(cleanup);
describe('JobsResultsBar data', () => {
  it('counts a single result instead of a 1–1 range', () => {
    render(
      <JobsResultsBar visibleCount={1} page={1} pageSize={20} language="en" />,
    );
    expect(screen.getByText('total:1')).toBeVisible();
    expect(screen.getByText('single;total:1')).toBeVisible();
  });
  it('gives the position of a last page holding one result', () => {
    render(
      <JobsResultsBar visibleCount={21} page={2} pageSize={20} language="en" />,
    );
    expect(screen.getByText('last:21;total:21')).toBeVisible();
  });
  it('includes supplied context without fixing its heading placement', () => {
    render(
      <JobsResultsBar
        visibleCount={12}
        page={1}
        pageSize={20}
        heading="Fixture discipline"
        language="en"
      />,
    );
    expect(
      screen.getByText('context:Fixture discipline;total:12'),
    ).toBeVisible();
    expect(screen.getByText('range:1:12;total:12')).toBeVisible();
  });
  it('includes withheld jobs in the total while bounding the range by visible jobs', () => {
    render(
      <JobsResultsBar
        visibleCount={30}
        gatedCount={357}
        page={2}
        pageSize={20}
        language="en"
      />,
    );
    expect(screen.getByText('total:387')).toBeVisible();
    expect(screen.getByText('range:21:30;total:387')).toBeVisible();
  });
  it('does not publish an invalid range beyond the preview', () => {
    render(
      <JobsResultsBar
        visibleCount={30}
        gatedCount={357}
        page={3}
        pageSize={20}
        language="en"
      />,
    );
    expect(screen.getByText('total:387')).toBeVisible();
    expect(screen.queryByText(/^range:/)).toBeNull();
  });
});
