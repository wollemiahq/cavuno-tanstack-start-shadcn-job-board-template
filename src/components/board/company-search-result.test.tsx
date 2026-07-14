// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CompanySearchResult } from './company-search-result';

import type { CompanyCardVM } from '@/board/company-view-model';

const vm: CompanyCardVM = {
  id: 'company-1',
  name: 'Acme Research',
  logoUrl: 'https://cdn.example/acme.svg',
  avatarName: 'Acme Research',
  descriptionText: 'Research tools for ambitious engineering teams.',
  detailHref: '/companies/acme-research',
  publishedJobCount: 3,
  openJobsLabel: '3 open jobs',
};

afterEach(cleanup);

describe('CompanySearchResult', () => {
  it('uses one canonical anchor with visible selected state and real company facts', () => {
    const onActivate = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) =>
      event.preventDefault(),
    );
    const { container } = render(
      <CompanySearchResult vm={vm} selected onActivate={onActivate} />,
    );

    const link = screen.getByRole('link', { name: /Acme Research/i });
    expect(link).toHaveAttribute('href', '/companies/acme-research');
    expect(link).toHaveAttribute('aria-current', 'true');
    expect(
      container.querySelector("[data-slot='search-result-card']"),
    ).toHaveAttribute('data-selected', 'true');
    expect(
      screen.getByText('Research tools for ambitious engineering teams.'),
    ).toBeVisible();
    expect(screen.getByText('3 open jobs')).toBeVisible();
    expect(screen.getByRole('img', { name: 'Acme Research' })).toHaveAttribute(
      'src',
      'https://cdn.example/acme.svg',
    );

    fireEvent.click(link);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('falls back to initials and omits missing description and zero-job noise', () => {
    render(
      <CompanySearchResult
        vm={{
          ...vm,
          logoUrl: null,
          descriptionText: null,
          publishedJobCount: 0,
          openJobsLabel: null,
        }}
      />,
    );

    expect(screen.getByText('AR')).toBeVisible();
    expect(
      screen.queryByText('Research tools for ambitious engineering teams.'),
    ).toBeNull();
    expect(screen.queryByText(/open jobs/i)).toBeNull();
  });
});
