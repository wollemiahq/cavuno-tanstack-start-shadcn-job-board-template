// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JobSearchResult } from './job-search-result';

import { makeJobCardVM } from '@/test/fixtures';

// Fixture values are NOT formatter-shaped (see src/test/fixtures.ts);
// assertions reference the VM fields symbolically.
const vm = makeJobCardVM({
  id: 'job-1',
  title: 'Product designer',
  companySlug: 'acme',
  jobSlug: 'product-designer',
  detailHref: '/companies/acme/jobs/product-designer',
  hasDetailLink: true,
  sector: 'Design',
  isFeatured: true,
  postedAtLabel: 'posted label',
  tags: [
    { key: 'category-design', name: 'Design', href: '/jobs/categories/design' },
    { key: 'skill-figma', name: 'Figma', href: '/jobs/skills/figma' },
  ],
});

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

    expect(screen.getByText(vm.companyName!)).toBeVisible();
    expect(screen.getByText(vm.locationLabel)).toBeVisible();
    expect(screen.getByText(vm.salaryLabel!)).toBeVisible();
    expect(screen.getByText(vm.summary!)).toBeVisible();
    expect(screen.getByText(vm.postedAtLabel!)).toBeVisible();
    expect(screen.getByText(vm.featuredLabel)).toBeVisible();
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

    expect(screen.queryByText(vm.companyName!)).toBeNull();
    expect(screen.getByText(vm.locationLabel)).toBeVisible();
    expect(screen.queryByText(vm.salaryLabel!)).toBeNull();
    expect(screen.queryByText(vm.featuredLabel)).toBeNull();
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
