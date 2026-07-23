// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JobSearchDetailState } from './job-search-detail-state';

afterEach(cleanup);

// The vm → JobSearchResultDetail assembly (incl. the inert-on-error apply/save
// slots) moved to the route pane; those contracts live in
// `-selected-job-detail.test.tsx` now. This file pins the dumb wrapper: the
// idle / loading / error chrome around a prebuilt `detail`.
describe('JobSearchDetailState', () => {
  it('announces the first detail load without marking the live region busy', () => {
    const { container } = render(
      <JobSearchDetailState
        status="loading"
        loadingLabel="Loading job details…"
        errorTitle="Could not load job"
        retryLabel="Retry"
        onRetry={vi.fn()}
      />,
    );

    // The pending skeleton carries aria-busy on its article; the polite status
    // region itself must not be busy (it would be announced as such otherwise).
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-busy');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading job details…',
    );
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('renders no loading state when there is no selected job', () => {
    const { container } = render(
      <JobSearchDetailState
        status="idle"
        loadingLabel="Loading job details…"
        errorTitle="Could not load job"
        retryLabel="Retry"
        onRetry={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('replaces a preserved detail with the pending skeleton while the next job loads', () => {
    render(
      <JobSearchDetailState
        status="loading"
        detail={
          <article aria-label="Previous job">Previous description.</article>
        }
        loadingLabel="Loading job details…"
        errorTitle="Could not load job"
        retryLabel="Retry"
        onRetry={vi.fn()}
      />,
    );

    expect(screen.queryByRole('article', { name: 'Previous job' })).toBeNull();
    expect(screen.queryByText('Previous description.')).toBeNull();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading job details…',
    );
  });

  it('keeps the preserved detail visible behind an owned retry alert when a transition fails', () => {
    const onRetry = vi.fn();
    render(
      <JobSearchDetailState
        status="error"
        detail={
          <article aria-label="Previous job">
            <h2>Previous job</h2>
            Previous description.
          </article>
        }
        loadingLabel="Loading job details…"
        errorTitle="Could not load job"
        retryLabel="Retry"
        onRetry={onRetry}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Previous job' }),
    ).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load job');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('offers an explicit retry for a recoverable first-load error', () => {
    const onRetry = vi.fn();
    render(
      <JobSearchDetailState
        status="error"
        loadingLabel="Loading job details…"
        errorTitle="Could not load job"
        retryLabel="Retry"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load job');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
