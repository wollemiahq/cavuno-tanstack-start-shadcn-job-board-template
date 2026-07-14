// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JobSearchResult } from './job-search-result';

import type { JobCardVM } from '@/board/job-view-model';

const vm: JobCardVM = {
  id: 'job-1',
  title: 'Product designer',
  companySlug: 'acme',
  jobSlug: 'product-designer',
  detailHref: '/companies/acme/jobs/product-designer',
  hasDetailLink: true,
  companyName: 'Acme',
  companyLogoUrl: null,
  companyAvatarName: 'Acme',
  sector: 'Design',
  compLine: '$140k–$170k · Sydney',
  summary: 'Own discovery and the product design system.',
  isFeatured: true,
  featuredLabel: 'Featured',
  postedAtLabel: '2d ago',
  tags: [
    { key: 'category-design', name: 'Design', href: '/jobs/categories/design' },
    { key: 'skill-figma', name: 'Figma', href: '/jobs/skills/figma' },
  ],
};

afterEach(cleanup);

describe('JobSearchResult', () => {
  it('uses an owned Card with a canonical title anchor and independent Badge tags', () => {
    const onActivate = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) =>
      event.preventDefault(),
    );
    const { container } = render(
      <JobSearchResult vm={vm} selected onActivate={onActivate} />,
    );

    const link = screen.getByRole('link', { name: /Product designer/i });
    expect(link).toHaveAttribute(
      'href',
      '/companies/acme/jobs/product-designer',
    );
    expect(
      container.querySelector("[data-slot='search-result-card']"),
    ).toHaveAttribute('data-selected', 'true');
    expect(
      container
        .querySelector("[data-slot='search-result-card']")
        ?.querySelector("[data-slot='card']"),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole('link', { name: 'Design' })
        .closest('[data-slot="badge"]'),
    ).not.toBeNull();
    expect(
      screen
        .getByRole('link', { name: 'Figma' })
        .closest('[data-slot="badge"]'),
    ).not.toBeNull();
    expect(container.querySelector('a a')).toBeNull();

    fireEvent.click(link);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('renders honest compact metadata and a transparent paid-placement label', () => {
    render(<JobSearchResult vm={vm} />);

    expect(screen.getByText('Acme')).toBeVisible();
    expect(screen.getByText('$140k–$170k · Sydney')).toBeVisible();
    expect(
      screen.getByText('Own discovery and the product design system.'),
    ).toBeVisible();
    expect(screen.getByText('2d ago')).toBeVisible();
    expect(screen.getByText('Featured')).toBeVisible();
  });

  it('omits optional metadata and placement labels when the API omitted them', () => {
    render(
      <JobSearchResult
        vm={{
          ...vm,
          companyName: null,
          compLine: null,
          summary: null,
          postedAtLabel: null,
          isFeatured: false,
        }}
      />,
    );

    expect(screen.queryByText('Acme')).toBeNull();
    expect(screen.queryByText('$140k–$170k · Sydney')).toBeNull();
    expect(screen.queryByText('Featured')).toBeNull();
  });
});
