// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  EmbedJobsView,
  embedJobsViewDependencies,
  type EmbedJobsViewDependencies,
} from './embed.jobs';

import { m } from '@/paraglide/messages';
import type { PublicJobCard } from '@cavuno/board';

afterEach(cleanup);

const job = {
  id: 'job-1',
  object: 'job_card',
  slug: 'product-designer',
  title: 'Product Designer',
  description: '<p>Build useful tools.</p>',
  publishedAt: null,
  employmentType: 'full_time',
  remoteOption: 'hybrid',
  remoteLocationLabel: null,
  remoteWorldwide: false,
  remoteWorkPermitCountryCodes: [],
  locationLabel: 'Sydney',
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  salaryTimeframe: null,
  isFeatured: false,
  isSponsored: false,
  summary: 'Build useful tools.',
  company: { slug: 'acme', name: 'Acme', logoUrl: null },
  categories: [],
  skills: [],
  links: {
    public: 'https://jobs.example/companies/acme/jobs/product-designer',
  },
} satisfies PublicJobCard;

const dependencies: EmbedJobsViewDependencies = {
  ...embedJobsViewDependencies,
  renderCtaLink: (cta) => <a href="/jobs">{cta.label}</a>,
  renderHeader: ({ boardName, initialSearch }) => (
    <div
      data-test="embed-jobs-header"
      data-initial-search={JSON.stringify(initialSearch)}
    >
      {boardName}
    </div>
  ),
  renderJobCard: ({ openInNewTab }) => (
    <article
      data-test="embed-job-card"
      data-open-in-new-tab={String(openInNewTab)}
    />
  ),
};

describe('embed jobs view', () => {
  it('renders the header above results and opens job cards in a new tab', async () => {
    render(
      <EmbedJobsView
        page={{ data: [job], count: 1 }}
        showCavunoBranding={false}
        boardName="Acme Board"
        logoUrl={null}
        search={{}}
        dependencies={dependencies}
      />,
    );

    expect(await screen.findByText('Acme Board')).toBeTruthy();
    expect(
      document.querySelector('[data-test="embed-jobs-list"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-open-in-new-tab="true"]'),
    ).not.toBeNull();
  });

  it('renders the header above the empty state', async () => {
    render(
      <EmbedJobsView
        page={{ data: [], count: 0 }}
        showCavunoBranding={false}
        boardName="Acme Board"
        logoUrl={null}
        search={{}}
        dependencies={dependencies}
      />,
    );

    expect(await screen.findByText('Acme Board')).toBeTruthy();
    expect(screen.getByText(m.embedJobs_noJobsMatchText())).toBeTruthy();
    expect(document.querySelector('[data-test="embed-jobs-list"]')).toBeNull();
  });

  it("hands the widget's own params to the header", async () => {
    render(
      <EmbedJobsView
        page={{ data: [job], count: 40 }}
        showCavunoBranding={false}
        boardName="Acme Board"
        logoUrl={null}
        search={{ q: 'nurse', location: 'london', remoteOption: 'remote' }}
        dependencies={dependencies}
      />,
    );

    // Without this the header renders empty controls over a filtered list and
    // its Search opens the unfiltered board.
    await screen.findByText('Acme Board');
    const header = document.querySelector('[data-test="embed-jobs-header"]');
    expect(
      JSON.parse(header?.getAttribute('data-initial-search') ?? '{}'),
    ).toMatchObject({
      q: 'nurse',
      location: 'london',
      remoteOption: 'remote',
    });
  });
});
