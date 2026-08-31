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

import {
  TalentSaveToJob,
  type TalentSaveToJobDependencies,
} from './talent-save-to-job';

afterEach(() => {
  cleanup();
});

const jobs = [
  { id: 'job_a', title: 'First role' },
  { id: 'job_b', title: 'Second role' },
];

function renderSaveToJob(
  props: {
    jobs?: Array<{ id: string; title: string }>;
    boundJobId?: string;
    alreadySaved?: boolean;
  } = {},
  saveSourcedCandidate = vi.fn(),
) {
  const dependencies: TalentSaveToJobDependencies = { saveSourcedCandidate };
  return {
    saveSourcedCandidate,
    ...render(
      <TalentSaveToJob
        slug="acme"
        jobs={jobs}
        candidateBoardUserId="bu_ada"
        dependencies={dependencies}
        {...props}
      />,
    ),
  };
}

describe('TalentSaveToJob', () => {
  it('asks which job when the directory is unbound', async () => {
    const saveSourcedCandidate = vi.fn().mockResolvedValueOnce({
      ok: true,
      data: { id: 'src_1', object: 'sourced_candidate', created: true },
    });

    renderSaveToJob({}, saveSourcedCandidate);

    fireEvent.click(screen.getByRole('button', { name: 'Save to job' }));
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Second role' }),
    );

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
    const { saveSourcedCandidate } = renderSaveToJob({
      jobs: [{ id: 'job_a', title: 'First role' }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save to job' }));
    expect(
      screen.getByRole('menuitem', { name: 'First role' }),
    ).toBeInTheDocument();
    expect(saveSourcedCandidate).not.toHaveBeenCalled();
  });

  it('saves in one click on a bound list and can start already saved', () => {
    renderSaveToJob({ boundJobId: 'job_b', alreadySaved: true });

    expect(screen.queryByRole('menuitem')).toBeNull();
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled();
  });

  it('posts sourced membership for the bound job', async () => {
    const saveSourcedCandidate = vi.fn().mockResolvedValueOnce({
      ok: true,
      data: { id: 'src_1', object: 'sourced_candidate', created: true },
    });

    renderSaveToJob({ boundJobId: 'job_b' }, saveSourcedCandidate);

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
