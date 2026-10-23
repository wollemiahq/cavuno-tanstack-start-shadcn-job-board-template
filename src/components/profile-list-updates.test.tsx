// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';

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

import { LanguagesSection } from './languages-section';
import { SkillsSection } from './skills-section';

import { m } from '@/paraglide/messages';
import { replaceLanguages, replaceSkills } from '@/server/account';

vi.mock('@/server/account', () => ({
  replaceSkills: vi.fn(),
  replaceLanguages: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

async function mountWithPendingRefresh(node: ReactElement) {
  const root = createRootRoute({ component: () => node });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  await act(async () => {
    render(<RouterProvider router={router} />);
    await router.load();
  });
  let finishRefresh = () => {};
  const refresh = new Promise<void>((resolve) => {
    finishRefresh = resolve;
  });
  const invalidate = vi
    .spyOn(router, 'invalidate')
    .mockImplementation(() => refresh);
  return { invalidate, finishRefresh };
}

it('keeps the committed skill list while refresh is pending and uses it for the next removal', async () => {
  vi.mocked(replaceSkills).mockResolvedValue({
    object: 'list',
    url: '/fixture',
    hasMore: false,
    nextCursor: null,
    data: [],
  });
  const { invalidate, finishRefresh } = await mountWithPendingRefresh(
    <SkillsSection skills={['Alpha', 'Beta']} />,
  );
  fireEvent.click(
    screen.getByRole('button', {
      name: m.skillsSection_removeSkillAriaLabel({ skill: 'Alpha' }),
    }),
  );
  await waitFor(() => expect(invalidate).toHaveBeenCalledOnce());
  expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  const removeBeta = screen.getByRole('button', {
    name: m.skillsSection_removeSkillAriaLabel({ skill: 'Beta' }),
  });
  expect(removeBeta).toBeDisabled();
  expect(
    screen.getByRole('button', { name: m.skillsSection_addLabel() }),
  ).toBeDisabled();
  await act(async () => finishRefresh());
  expect(removeBeta).toBeEnabled();
  fireEvent.click(removeBeta);
  await waitFor(() =>
    expect(replaceSkills).toHaveBeenLastCalledWith({ data: { skills: [] } }),
  );
});

it('keeps the committed language list until refreshed props arrive', async () => {
  vi.mocked(replaceLanguages).mockResolvedValue({
    object: 'list',
    url: '/fixture',
    hasMore: false,
    nextCursor: null,
    data: [],
  });
  const { invalidate, finishRefresh } = await mountWithPendingRefresh(
    <LanguagesSection
      languages={[
        { name: 'Alpha', proficiency: 'Fluent' },
        { name: 'Beta', proficiency: 'Fluent' },
      ]}
    />,
  );
  // SAFETY: the fixture renders two language rows; this chooses the first.
  fireEvent.click(
    screen.getAllByRole('button', {
      name: m.languagesSection_removeLanguageAriaLabel(),
    })[0]!,
  );
  await waitFor(() => expect(invalidate).toHaveBeenCalledOnce());
  expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  const removeBeta = screen.getByRole('button', {
    name: m.languagesSection_removeLanguageAriaLabel(),
  });
  expect(removeBeta).toBeDisabled();
  await act(async () => finishRefresh());
  fireEvent.click(removeBeta);
  await waitFor(() =>
    expect(replaceLanguages).toHaveBeenLastCalledWith({
      data: { languages: [] },
    }),
  );
});
