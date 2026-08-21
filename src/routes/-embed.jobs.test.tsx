// @vitest-environment jsdom
import type { ReactNode } from 'react';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server/queries', () => ({
  embedJobs: vi.fn(),
  getBoardContext: vi.fn(),
}));

vi.mock('@/components/board/embed-jobs-header', () => ({
  EmbedJobsHeader: ({
    boardName,
    initialSearch,
  }: {
    boardName: string;
    initialSearch: Record<string, unknown>;
  }) => (
    <div
      data-test="embed-jobs-header"
      data-initial-search={JSON.stringify(initialSearch)}
    >
      {boardName}
    </div>
  ),
}));

vi.mock('@/components/board/job-card', () => ({
  JobCard: ({ openInNewTab }: { openInNewTab?: boolean }) => (
    <article
      data-test="embed-job-card"
      data-open-in-new-tab={String(Boolean(openInNewTab))}
    />
  ),
}));

vi.mock('@/board/job-view-model', () => ({
  toJobCardVM: (job: { id: string }) => ({ id: job.id }),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    Link: ({
      children,
      ...props
    }: {
      children: ReactNode;
      to?: string;
      search?: unknown;
      target?: string;
      className?: string;
    }) => <a {...props}>{children}</a>,
  };
});

import { EmbedJobsView } from './embed.jobs';

import { m } from '@/paraglide/messages';
import type { PublicJobCard } from '@cavuno/board';

afterEach(cleanup);

const job = { id: 'job-1' } as PublicJobCard;

describe('embed jobs view', () => {
  it('renders the header above results and opens job cards in a new tab', async () => {
    render(
      <EmbedJobsView
        page={{ data: [job], count: 1 }}
        showCavunoBranding={false}
        boardName="Acme Board"
        logoUrl={null}
        search={{}}
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
