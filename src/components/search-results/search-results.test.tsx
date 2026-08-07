// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdRail,
  SearchResultCard,
  SearchResultDetail,
  SearchResultDetailHeader,
  SearchResultsLayout,
  SearchResultsList,
} from './search-results';

// Condensed-header updates are rAF-scheduled; run them sync in tests.
beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Search results composition', () => {
  it('replaces the expanded hero with one compact header at its boundary', () => {
    const { container } = render(
      <SearchResultDetail label="Selected job">
        <SearchResultDetailHeader
          expanded={<h2>Expanded product designer</h2>}
          compact={<p>Compact product designer</p>}
        />
      </SearchResultDetail>,
    );

    const detail = screen.getByRole('region', { name: 'Selected job' });
    const expanded = screen.getByRole('heading', {
      name: 'Expanded product designer',
    }).parentElement;
    const boundary = container.querySelector<HTMLElement>(
      '[data-slot="detail-hero-boundary"]',
    );
    const compactAnchor = container.querySelector<HTMLElement>(
      '[data-slot="detail-compact-header-anchor"]',
    );
    if (!expanded || !boundary) throw new Error('Detail hero was not rendered');
    if (!compactAnchor)
      throw new Error('Compact header anchor was not rendered');

    expect(compactAnchor.parentElement).toBe(detail);

    Object.defineProperty(boundary, 'offsetTop', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(detail, 'scrollTop', {
      configurable: true,
      value: 199,
      writable: true,
    });
    fireEvent.scroll(detail);

    expect(expanded).not.toHaveAttribute('aria-hidden');
    expect(screen.queryByText('Compact product designer')).toBeNull();

    detail.scrollTop = 200;
    fireEvent.scroll(detail);

    expect(expanded).toHaveAttribute('aria-hidden', 'true');
    expect(expanded).toHaveAttribute('inert');
    expect(screen.getByText('Compact product designer')).toBeVisible();

    detail.scrollTop = 0;
    fireEvent.scroll(detail);

    expect(expanded).not.toHaveAttribute('aria-hidden');
    expect(screen.queryByText('Compact product designer')).toBeNull();
  });

  it('does not oscillate from layout changes or one-pixel scroll noise at the boundary', () => {
    const { container } = render(
      <SearchResultDetail label="Selected company">
        <SearchResultDetailHeader
          expanded={<h2>Expanded company</h2>}
          compact={<p>Compact company</p>}
        />
      </SearchResultDetail>,
    );

    const detail = screen.getByRole('region', { name: 'Selected company' });
    const boundary = container.querySelector<HTMLElement>(
      '[data-slot="detail-hero-boundary"]',
    );
    if (!boundary) throw new Error('Detail hero boundary was not rendered');

    Object.defineProperty(boundary, 'offsetTop', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(detail, 'scrollTop', {
      configurable: true,
      value: 201,
      writable: true,
    });
    detail.getBoundingClientRect = () => ({ top: 100 }) as DOMRect;

    let rectTop = 99;
    boundary.getBoundingClientRect = () => ({ top: rectTop }) as DOMRect;
    fireEvent.scroll(detail);

    expect(detail).toHaveAttribute('data-condensed', 'true');
    expect(screen.getByText('Compact company')).toBeVisible();

    rectTop = 101;
    fireEvent.scroll(detail);
    fireEvent.scroll(detail);

    expect(detail).toHaveAttribute('data-condensed', 'true');
    expect(screen.getByText('Compact company')).toBeVisible();

    detail.scrollTop = 199;
    fireEvent.scroll(detail);

    expect(detail).toHaveAttribute('data-condensed', 'true');

    detail.scrollTop = 191;
    fireEvent.scroll(detail);

    expect(detail).toHaveAttribute('data-condensed', 'false');
    expect(screen.queryByText('Compact company')).toBeNull();
  });

  it('keeps the result list and selected detail as independently named regions', () => {
    render(
      <SearchResultsLayout
        list={
          <SearchResultsList
            label="Job results"
            scrollRestorationId="jobs-list"
          >
            <SearchResultCard selected>
              <a href="/companies/acme/jobs/designer">Product designer</a>
            </SearchResultCard>
          </SearchResultsList>
        }
        detail={
          <SearchResultDetail
            label="Selected job"
            scrollRestorationId="job-detail"
          >
            <h2>Product designer</h2>
            <div data-slot="detail-hero-boundary" />
          </SearchResultDetail>
        }
      />,
    );

    const list = screen.getByRole('region', { name: 'Job results' });
    const detail = screen.getByRole('region', { name: 'Selected job' });

    expect(list).toHaveAttribute('data-scroll-restoration-id', 'jobs-list');
    expect(detail).toHaveAttribute('data-scroll-restoration-id', 'job-detail');
    expect(
      within(list).getByRole('link', { name: 'Product designer' }),
    ).toHaveAttribute('href', '/companies/acme/jobs/designer');
    expect(within(list).getByRole('article')).toHaveAttribute(
      'data-selected',
      'true',
    );

    const heroBoundary = detail.querySelector(
      '[data-slot="detail-hero-boundary"]',
    );
    if (!(heroBoundary instanceof HTMLElement)) {
      throw new Error('Detail hero boundary was not rendered');
    }
    Object.defineProperty(heroBoundary, 'offsetTop', {
      configurable: true,
      value: 500,
    });

    Object.defineProperty(detail, 'scrollTop', {
      configurable: true,
      value: 499,
      writable: true,
    });
    fireEvent.scroll(detail);
    expect(detail).toHaveAttribute('data-condensed', 'false');

    detail.scrollTop = 500;
    fireEvent.scroll(detail);
    expect(detail).toHaveAttribute('data-condensed', 'true');

    detail.scrollTop = 501;
    fireEvent.scroll(detail);
    expect(detail).toHaveAttribute('data-condensed', 'true');

    detail.scrollTop = 0;
    fireEvent.scroll(detail);
    expect(detail).toHaveAttribute('data-condensed', 'false');
  });

  it('renders only supplied advertising regions with explicit labels and sides', () => {
    const { container, rerender } = render(
      <SearchResultsLayout
        startAd={
          <AdRail label="Advertisement from Example">Start creative</AdRail>
        }
        list={<SearchResultsList label="Results">Results</SearchResultsList>}
        detail={<SearchResultDetail label="Detail">Detail</SearchResultDetail>}
      />,
    );

    const startRail = screen.getByRole('complementary', {
      name: 'Advertisement from Example',
    });
    expect(startRail).toHaveAttribute('data-side', 'start');
    expect(container.querySelector('[data-side="end"]')).toBeNull();

    rerender(
      <SearchResultsLayout
        endAd={<AdRail label="Advertisement">End creative</AdRail>}
        list={<SearchResultsList label="Results">Results</SearchResultsList>}
        detail={<SearchResultDetail label="Detail">Detail</SearchResultDetail>}
      />,
    );

    expect(
      screen.getByRole('complementary', { name: 'Advertisement' }),
    ).toHaveAttribute('data-side', 'end');
    expect(container.querySelector('[data-side="start"]')).toBeNull();
  });
});
