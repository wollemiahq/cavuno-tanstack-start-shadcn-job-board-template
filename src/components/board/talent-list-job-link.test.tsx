// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TalentListJobLink } from './talent-list-job-link';

import { updateTalentList } from '@/server/employers';

vi.mock('@/server/employers', () => ({
  updateTalentList: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.mocked(updateTalentList).mockReset();
});

const jobs = [
  { id: 'job_a', title: 'First role' },
  { id: 'job_b', title: 'Second role' },
];

const list = {
  id: 'list_1',
  object: 'talent_list' as const,
  name: 'Berlin',
  filters: { q: 'engineer' },
  jobId: null as string | null,
  createdBy: 'bu_employer',
  createdAt: 1,
  updatedAt: 1,
};

async function pick(name: string) {
  const option = await screen.findByRole('option', { name });
  fireEvent.pointerDown(option, { pointerType: 'mouse' });
  fireEvent.click(option);
}

describe('TalentListJobLink', () => {
  it('binds a job without rewriting filters', async () => {
    const onUpdated = vi.fn();
    vi.mocked(updateTalentList).mockResolvedValue({
      ok: true,
      data: { ...list, jobId: 'job_b' },
    });

    render(
      <TalentListJobLink
        slug="acme"
        listId="list_1"
        jobId={null}
        jobs={jobs}
        onUpdated={onUpdated}
      />,
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'Link to a job' }));
    await pick('Second role');

    await waitFor(() =>
      expect(updateTalentList).toHaveBeenCalledWith({
        data: { slug: 'acme', listId: 'list_1', job: 'job_b' },
      }),
    );
    expect(onUpdated).toHaveBeenCalledWith({ ...list, jobId: 'job_b' });
  });

  it('unlinks with job null', async () => {
    vi.mocked(updateTalentList).mockResolvedValue({
      ok: true,
      data: { ...list, jobId: null },
    });

    render(
      <TalentListJobLink
        slug="acme"
        listId="list_1"
        jobId="job_a"
        jobs={jobs}
        onUpdated={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'First role' }));
    await pick('Not linked');

    await waitFor(() =>
      expect(updateTalentList).toHaveBeenCalledWith({
        data: { slug: 'acme', listId: 'list_1', job: null },
      }),
    );
  });
});
