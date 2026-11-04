// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { EducationSection } from './education-section';

import { m } from '@/paraglide/messages';
import { updateEducation } from '@/server/account';
import type { CandidateEducation } from '@cavuno/board';

vi.mock('@/server/account', () => ({
  createEducation: vi.fn(),
  updateEducation: vi.fn(),
  deleteEducation: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const school: CandidateEducation = {
  id: 'edu1',
  object: 'candidate_education',
  institutionName: 'Example University',
  institutionUrl: 'https://www.example.edu',
  degree: null,
  fieldOfStudy: null,
  grade: null,
  activitiesAndSocieties: null,
  startDate: null,
  endDate: null,
  description: null,
  sortOrder: 0,
};

async function mount(items: CandidateEducation[]) {
  const root = createRootRoute({
    component: () => <EducationSection items={items} language="en" />,
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  vi.spyOn(router, 'invalidate').mockResolvedValue(undefined);
  await act(async () => {
    render(<RouterProvider router={router} />);
    await router.load();
  });
}

it('reads the website back on the row and in the editor, and saves it with https', async () => {
  vi.mocked(updateEducation).mockResolvedValue(school);
  await mount([school]);

  expect(screen.getByText('example.edu')).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: m.educationSection_editLabel() }),
  );
  const website = await screen.findByLabelText(
    m.educationSection_websiteLabel(),
  );
  expect(website).toHaveValue('www.example.edu');

  // A pasted URL keeps only what follows the shown https:// prefix.
  fireEvent.change(website, { target: { value: 'https://cs.example.edu' } });
  expect(website).toHaveValue('cs.example.edu');
  fireEvent.click(
    screen.getByRole('button', { name: m.educationSection_saveLabel() }),
  );
  await waitFor(() => expect(updateEducation).toHaveBeenCalledOnce());
  expect(vi.mocked(updateEducation).mock.calls[0]![0].data.body).toMatchObject({
    institutionUrl: 'https://cs.example.edu',
  });
});

it('clears the website on an edit', async () => {
  vi.mocked(updateEducation).mockResolvedValue(school);
  await mount([school]);

  fireEvent.click(
    screen.getByRole('button', { name: m.educationSection_editLabel() }),
  );
  fireEvent.change(
    await screen.findByLabelText(m.educationSection_websiteLabel()),
    { target: { value: '' } },
  );
  fireEvent.click(
    screen.getByRole('button', { name: m.educationSection_saveLabel() }),
  );
  await waitFor(() => expect(updateEducation).toHaveBeenCalledOnce());
  expect(vi.mocked(updateEducation).mock.calls[0]![0].data.body).toMatchObject({
    institutionUrl: '',
  });
});
