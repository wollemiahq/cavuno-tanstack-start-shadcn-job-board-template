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
  companyName: 'Acme',
  companyLogoUrl: null,
  companyAvatarName: 'Acme',
  compLine: '$140k–$170k · Sydney, NSW (On-site)',
  salaryLabel: '$140k–$170k',
  locationLabel: 'Sydney, NSW (On-site)',
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
  it('uses an owned Card with a canonical title anchor and no taxonomy clutter', () => {
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
    expect(screen.queryByRole('link', { name: 'Design' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Figma' })).toBeNull();
    expect(container.querySelector('a a')).toBeNull();
    fireEvent.click(link);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('renders honest compact metadata and a transparent paid-placement label', () => {
    render(<JobSearchResult vm={vm} />);

    expect(screen.getByText('Acme')).toBeVisible();
    expect(screen.getByText('Sydney, NSW (On-site)')).toBeVisible();
    expect(screen.getByText('$140k–$170k')).toBeVisible();
    expect(
      screen.getByText('Own discovery and the product design system.'),
    ).toBeVisible();
    expect(screen.getByText('2d ago')).toBeVisible();
    expect(screen.getByText('Featured')).toBeVisible();
  });

  it('keeps essential location while omitting unavailable optional metadata', () => {
    render(
      <JobSearchResult
        vm={{
          ...vm,
          companyName: null,
          compLine: null,
          salaryLabel: null,
          summary: null,
          postedAtLabel: null,
          isFeatured: false,
        }}
      />,
    );

    expect(screen.queryByText('Acme')).toBeNull();
    expect(screen.getByText('Sydney, NSW (On-site)')).toBeVisible();
    expect(screen.queryByText('$140k–$170k')).toBeNull();
    expect(screen.queryByText('Featured')).toBeNull();
  });

  it('keeps a trailing Save control above the card link without activating the job', () => {
    const onActivate = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) =>
      event.preventDefault(),
    );
    const onSave = vi.fn();
    render(
      <JobSearchResult
        vm={vm}
        onActivate={onActivate}
        saveSlot={
          <button type="button" aria-label="Save job" onClick={onSave}>
            Save
          </button>
        }
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save job' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onActivate).not.toHaveBeenCalled();
  });
});
