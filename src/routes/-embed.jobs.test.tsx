// @vitest-environment jsdom
import type { ReactNode } from 'react';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server/queries', () => ({
  embedJobs: vi.fn(),
  getBoardContext: vi.fn(),
}));

vi.mock('@/components/board/embed-jobs-header', () => ({
  EmbedJobsHeader: ({ boardName }: { boardName: string }) => (
    <div data-test="embed-jobs-header">{boardName}</div>
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
  it('renders the header above results and opens job cards in a new tab', () => {
    render(
      <EmbedJobsView
        page={{ data: [job], count: 1 }}
        showCavunoBranding={false}
        boardName="Acme Board"
        logoUrl={null}
        search={{}}
      />,
    );

    expect(screen.getByText('Acme Board')).toBeTruthy();
    expect(
      document.querySelector('[data-test="embed-jobs-header"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-test="embed-jobs-list"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-open-in-new-tab="true"]'),
    ).not.toBeNull();
  });

  it('renders the header above the empty state', () => {
    render(
      <EmbedJobsView
        page={{ data: [], count: 0 }}
        showCavunoBranding={false}
        boardName="Acme Board"
        logoUrl={null}
        search={{}}
      />,
    );

    expect(
      document.querySelector('[data-test="embed-jobs-header"]'),
    ).not.toBeNull();
    expect(screen.getByText(m.embedJobs_noJobsMatchText())).toBeTruthy();
    expect(document.querySelector('[data-test="embed-jobs-list"]')).toBeNull();
  });
});
