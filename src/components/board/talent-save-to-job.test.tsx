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

import { TalentSaveToJob } from './talent-save-to-job';

import { saveSourcedCandidate } from '@/server/employers';

vi.mock('@/server/employers', () => ({
  saveSourcedCandidate: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const jobs = [
  { id: 'job_a', title: 'First role' },
  { id: 'job_b', title: 'Second role' },
];

describe('TalentSaveToJob', () => {
  it('asks which job when the directory is unbound', async () => {
    vi.mocked(saveSourcedCandidate).mockResolvedValueOnce({
      ok: true,
      data: { id: 'src_1', object: 'sourced_candidate', created: true },
    });

    render(
      <TalentSaveToJob slug="acme" jobs={jobs} candidateBoardUserId="bu_ada" />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save to job' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Second role' }));

    await waitFor(() =>
      expect(saveSourcedCandidate).toHaveBeenCalledWith({
        data: {
          slug: 'acme',
          job: 'job_b',
          candidateBoardUserId: 'bu_ada',
        },
      }),
    );
    expect(await screen.findByRole('button', { name: 'Saved' })).toBeDisabled();
  });

  it('asks which job when the company has only one published job', () => {
    render(
      <TalentSaveToJob
        slug="acme"
        jobs={[{ id: 'job_a', title: 'First role' }]}
        candidateBoardUserId="bu_ada"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save to job' }));
    expect(
      screen.getByRole('menuitem', { name: 'First role' }),
    ).toBeInTheDocument();
    expect(saveSourcedCandidate).not.toHaveBeenCalled();
  });

  it('saves in one click on a bound list and can start already saved', () => {
    render(
      <TalentSaveToJob
        slug="acme"
        jobs={jobs}
        candidateBoardUserId="bu_ada"
        boundJobId="job_b"
        alreadySaved
      />,
    );

    expect(screen.queryByRole('menuitem')).toBeNull();
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled();
  });

  it('posts sourced membership for the bound job', async () => {
    vi.mocked(saveSourcedCandidate).mockResolvedValueOnce({
      ok: true,
      data: { id: 'src_1', object: 'sourced_candidate', created: true },
    });

    render(
      <TalentSaveToJob
        slug="acme"
        jobs={jobs}
        candidateBoardUserId="bu_ada"
        boundJobId="job_b"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save to job' }));

    await waitFor(() =>
      expect(saveSourcedCandidate).toHaveBeenCalledWith({
        data: {
          slug: 'acme',
          job: 'job_b',
          candidateBoardUserId: 'bu_ada',
        },
      }),
    );
    expect(await screen.findByRole('button', { name: 'Saved' })).toBeDisabled();
  });
});
