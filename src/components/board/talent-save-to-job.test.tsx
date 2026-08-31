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
  vi.mocked(saveSourcedCandidate).mockReset();
});

const jobs = [
  { id: 'job_a', title: 'First role' },
  { id: 'job_b', title: 'Second role' },
];

const lists = [
  { id: 'tl_a', name: 'Backend list', jobId: 'job_a' },
  { id: 'tl_b', name: 'Frontend list', jobId: 'job_b' },
];

function saveTrigger(name: 'Shortlist' | 'Shortlisted' = 'Shortlist') {
  return screen.getByRole('combobox', { name });
}

async function openSavePicker(name: 'Shortlist' | 'Shortlisted' = 'Shortlist') {
  const trigger = saveTrigger(name);
  fireEvent.mouseDown(trigger);
  fireEvent.click(trigger);
}

async function pickOption(name: string) {
  const option = await screen.findByRole('option', { name });
  fireEvent.pointerDown(option, { pointerType: 'mouse' });
  fireEvent.click(option);
}

describe('TalentSaveToJob', () => {
  it('keeps the Shortlist button and lets you pick more than one saved search', async () => {
    vi.mocked(saveSourcedCandidate).mockResolvedValue({
      ok: true,
      data: { id: 'src_1', object: 'sourced_candidate', created: true },
    });

    render(
      <TalentSaveToJob
        slug="acme"
        jobs={jobs}
        lists={lists}
        candidateBoardUserId="bu_ada"
      />,
    );

    expect(screen.queryByText('Shortlist for')).toBeNull();
    await openSavePicker();
    await pickOption('Backend');
    await pickOption('Frontend');

    await waitFor(() =>
      expect(saveSourcedCandidate).toHaveBeenCalledWith({
        data: {
          slug: 'acme',
          job: 'job_a',
          candidateBoardUserId: 'bu_ada',
        },
      }),
    );
    expect(saveSourcedCandidate).toHaveBeenCalledWith({
      data: {
        slug: 'acme',
        job: 'job_b',
        candidateBoardUserId: 'bu_ada',
      },
    });
    expect(saveTrigger('Shortlisted')).not.toBeDisabled();
  });

  it('asks which destination when the company has only one published job', async () => {
    render(
      <TalentSaveToJob
        slug="acme"
        jobs={[{ id: 'job_a', title: 'First role' }]}
        candidateBoardUserId="bu_ada"
      />,
    );

    await openSavePicker();
    expect(await screen.findByRole('option', { name: 'First role' })).toBeInTheDocument();
    expect(saveSourcedCandidate).not.toHaveBeenCalled();
  });

  it('shows Shortlisted when already saved without locking the picker', () => {
    render(
      <TalentSaveToJob
        slug="acme"
        jobs={jobs}
        lists={lists}
        candidateBoardUserId="bu_ada"
        boundJobId="job_b"
        alreadySaved
      />,
    );

    expect(saveTrigger('Shortlisted')).not.toBeDisabled();
    expect(saveSourcedCandidate).not.toHaveBeenCalled();
  });

  it('does not one-click save on a bound list', async () => {
    vi.mocked(saveSourcedCandidate).mockResolvedValue({
      ok: true,
      data: { id: 'src_1', object: 'sourced_candidate', created: true },
    });

    render(
      <TalentSaveToJob
        slug="acme"
        jobs={jobs}
        lists={lists}
        candidateBoardUserId="bu_ada"
        boundJobId="job_b"
      />,
    );

    await openSavePicker();
    expect(saveSourcedCandidate).not.toHaveBeenCalled();
    await pickOption('Frontend');

    await waitFor(() =>
      expect(saveSourcedCandidate).toHaveBeenCalledWith({
        data: {
          slug: 'acme',
          job: 'job_b',
          candidateBoardUserId: 'bu_ada',
        },
      }),
    );
  });
});
