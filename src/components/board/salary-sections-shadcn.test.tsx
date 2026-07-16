// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  OverallSalaryCard,
  SalaryEmptyState,
  SalaryFaq,
  SalaryRail,
  SenioritySalaryTable,
} from './salary-sections';

import type {
  OverallSalaryVM,
  SalaryFaqVM,
  SalaryRailVM,
  SeniorityTableVM,
} from '@/board/salary-view-model';

afterEach(cleanup);

const overall: OverallSalaryVM = {
  headlineLabel: 'Average salary',
  headlineValue: '$120,000–$160,000',
  perYearSuffix: '/ yr',
  stats: [
    { label: '25th percentile', value: '$110,000' },
    { label: 'Median', value: '$140,000', emphasis: true },
    { label: 'Based on', value: '12 jobs' },
  ],
};

const seniority: SeniorityTableVM = {
  headers: {
    level: 'Experience level',
    avg: 'Average',
    baseline: 'Board average',
    diff: 'vs board',
  },
  rows: [
    {
      key: 'senior',
      level: 'Senior',
      avg: '$150,000–$180,000',
      baseline: '$140,000–$170,000',
      diff: { text: '+6%', positive: true },
    },
    {
      key: 'principal',
      level: 'Principal',
      avg: '$175,000–$205,000',
      baseline: '—',
      diff: null,
    },
  ],
};

const rail: SalaryRailVM = {
  title: 'Top companies',
  items: [
    {
      name: 'Acme Robotics',
      href: '/companies/acme-robotics/salaries',
      range: '$130,000–$175,000',
      jobCountLabel: '7 jobs',
      logoPath: null,
    },
    {
      name: 'Long Range Labs',
      href: '/companies/long-range-labs/salaries',
      range: '$125,000–$168,000',
      jobCountLabel: '3 jobs',
      logoPath: 'https://cdn.example/long-range-labs.png',
    },
  ],
};

const faq: SalaryFaqVM = {
  heading: 'Frequently asked questions',
  items: [
    {
      q: 'What affects the salary range?',
      a: 'Experience, location, and role scope all contribute.',
    },
  ],
};

describe('salary sections', () => {
  it('renders every resolved salary metric', () => {
    render(<OverallSalaryCard vm={overall} />);

    expect(screen.getByText('Average salary')).toBeVisible();
    expect(screen.getByText('$120,000–$160,000')).toBeVisible();
    expect(screen.getByText('/ yr')).toBeVisible();
    expect(screen.getByText('25th percentile')).toBeVisible();
    expect(screen.getByText('$110,000')).toBeVisible();
    expect(screen.getByText('Median')).toBeVisible();
    expect(screen.getByText('$140,000')).toBeVisible();
    expect(screen.getByText('Based on')).toBeVisible();
    expect(screen.getByText('12 jobs')).toBeVisible();
  });

  it('uses a semantic table while preserving honest missing comparisons', () => {
    render(<SenioritySalaryTable vm={seniority} />);

    const table = screen.getByRole('table');
    expect(
      within(table).getByRole('columnheader', {
        name: 'Experience level',
      }),
    ).toBeVisible();
    const principalRow = within(table).getByRole('row', {
      name: /Principal/,
    });
    expect(principalRow).toHaveTextContent('$175,000–$205,000');
    expect(principalRow).toHaveTextContent('—');
  });

  it('keeps every salary rail item a real crawlable anchor', () => {
    render(<SalaryRail vm={rail} />);

    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/companies/acme-robotics/salaries',
      '/companies/long-range-labs/salaries',
    ]);
    expect(screen.getByText('Acme Robotics')).toBeVisible();
    expect(screen.getByText('$130,000–$175,000')).toBeVisible();
    expect(screen.getByText('7 jobs')).toBeVisible();
    expect(screen.getByText('Long Range Labs')).toBeVisible();
    expect(screen.getByText('$125,000–$168,000')).toBeVisible();
    expect(screen.getByText('3 jobs')).toBeVisible();
    expect(screen.getByText('AR')).toBeVisible();
  });

  it('renders FAQs as semantic question-answer pairs', () => {
    render(<SalaryFaq vm={faq} />);

    const question = screen.getByText('What affects the salary range?');
    expect(question.tagName).toBe('DT');
    expect(
      screen.getByText('Experience, location, and role scope all contribute.')
        .tagName,
    ).toBe('DD');
  });

  it('explains missing salary data without inventing a value', () => {
    render(
      <SalaryEmptyState
        title="No salary data yet"
        description="Salary figures appear after matching jobs are published."
      />,
    );

    expect(screen.getByText('No salary data yet')).toBeVisible();
    expect(
      screen.getByText(
        'Salary figures appear after matching jobs are published.',
      ),
    ).toBeVisible();
    expect(document.body).not.toHaveTextContent('$0');
  });
});
