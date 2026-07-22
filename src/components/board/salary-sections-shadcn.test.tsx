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

// Fixture values are NOT formatter-shaped (formatted output is pinned by
// the SDK goldens); assertions reference these fields symbolically.
const overall: OverallSalaryVM = {
  headlineLabel: 'Average salary',
  headlineValue: 'headline value',
  perYearSuffix: '/ yr',
  stats: [
    { label: '25th percentile', value: 'p25 value' },
    { label: 'Median', value: 'median value', emphasis: true },
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
      avg: 'senior avg range',
      baseline: 'senior baseline range',
      diff: { text: '+6%', positive: true },
    },
    {
      key: 'principal',
      level: 'Principal',
      avg: 'principal avg range',
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
      range: 'range a',
      jobCountLabel: '7 jobs',
      logoPath: null,
    },
    {
      name: 'Long Range Labs',
      href: '/companies/long-range-labs/salaries',
      range: 'range b',
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

    expect(screen.getByText(overall.headlineLabel)).toBeVisible();
    expect(screen.getByText(overall.headlineValue)).toBeVisible();
    expect(screen.getByText(overall.perYearSuffix)).toBeVisible();
    expect(screen.getByText(overall.stats[0].label)).toBeVisible();
    expect(screen.getByText(overall.stats[0].value)).toBeVisible();
    expect(screen.getByText(overall.stats[1].label)).toBeVisible();
    expect(screen.getByText(overall.stats[1].value)).toBeVisible();
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
    expect(principalRow).toHaveTextContent(seniority.rows[1].avg);
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
    expect(screen.getByText(rail.items[0].range)).toBeVisible();
    expect(screen.getByText('7 jobs')).toBeVisible();
    expect(screen.getByText('Long Range Labs')).toBeVisible();
    expect(screen.getByText(rail.items[1].range)).toBeVisible();
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
