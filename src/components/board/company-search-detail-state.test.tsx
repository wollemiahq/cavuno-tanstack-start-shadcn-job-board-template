// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CompanySearchDetailState } from './company-search-detail-state';

afterEach(cleanup);

describe('CompanySearchDetailState', () => {
  it('announces the first company detail load', () => {
    render(
      <CompanySearchDetailState
        status="loading"
        loadingLabel="Loading company details…"
        errorTitle="Could not load company"
        retryLabel="Retry"
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading company details…',
    );
  });

  it('replaces preserved detail with a loading state during a transition', () => {
    render(
      <CompanySearchDetailState
        status="loading"
        detail={
          <article aria-label="Previous company">
            Previous company details
          </article>
        }
        loadingLabel="Loading company details…"
        errorTitle="Could not load company"
        retryLabel="Retry"
        onRetry={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('article', { name: 'Previous company' }),
    ).toBeNull();
    expect(screen.queryByText('Previous company details')).toBeNull();
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading company details…',
    );
  });

  it('offers an explicit retry for a recoverable first-load error', () => {
    const onRetry = vi.fn();
    render(
      <CompanySearchDetailState
        status="error"
        loadingLabel="Loading company details…"
        errorTitle="Could not load company"
        retryLabel="Retry"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load company',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps the preserved read-only detail visible when a transition fails', () => {
    const onRetry = vi.fn();
    render(
      <CompanySearchDetailState
        status="error"
        detail={
          <article aria-label="Previous company">
            Previous company details
          </article>
        }
        loadingLabel="Loading company details…"
        errorTitle="Could not load company"
        retryLabel="Retry"
        onRetry={onRetry}
      />,
    );

    expect(
      screen.getByRole('article', { name: 'Previous company' }),
    ).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load company',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders no detail state when the desktop pane has no selection', () => {
    const { container } = render(
      <CompanySearchDetailState
        status="idle"
        loadingLabel="Loading company details…"
        errorTitle="Could not load company"
        retryLabel="Retry"
        onRetry={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
