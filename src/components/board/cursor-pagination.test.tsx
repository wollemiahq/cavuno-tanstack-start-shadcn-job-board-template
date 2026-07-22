// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CursorPagination } from './cursor-pagination';

import { m } from '@/paraglide/messages';

afterEach(cleanup);

describe('CursorPagination — cursor-only Previous/Next pager', () => {
  it('renders nothing when there is neither a previous nor a next page', () => {
    const { container } = render(
      <CursorPagination hasPrevious={false} hasNext={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a crawlable next anchor and never numbered page links', () => {
    render(
      <CursorPagination
        hasPrevious={false}
        hasNext
        nextHref="/talent?cursor=abc"
      />,
    );

    const next = screen.getByRole('link', {
      name: m.pagination_nextPageLabel(),
    });
    expect(next).toHaveAttribute('href', '/talent?cursor=abc');
    // Previous exists but is inert on the first page.
    expect(
      screen.getByRole('link', { name: m.pagination_previousPageLabel() }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.queryByRole('link', { name: `${m.pagination_ariaLabel()} 2` }),
    ).toBeNull();
  });

  it('invokes the handlers only for the enabled direction', () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(
      <CursorPagination
        hasPrevious
        hasNext={false}
        onPrevious={onPrevious}
        onNext={onNext}
      />,
    );

    fireEvent.click(
      screen.getByRole('link', { name: m.pagination_previousPageLabel() }),
    );
    expect(onPrevious).toHaveBeenCalledTimes(1);

    // Next is disabled (no cursor) — clicking it must not navigate.
    fireEvent.click(
      screen.getByRole('link', { name: m.pagination_nextPageLabel() }),
    );
    expect(onNext).not.toHaveBeenCalled();
  });
});
