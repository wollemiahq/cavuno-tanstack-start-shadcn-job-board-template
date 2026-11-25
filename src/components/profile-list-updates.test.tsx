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
import { InterestedRolesSection, SkillsSection } from './skills-section';

import { toastActionError } from '@/lib/action-toast';
import { m } from '@/paraglide/messages';
import {
  replaceInterestedRoles,
  replaceLanguages,
  replaceSkills,
} from '@/server/account';

vi.mock('@/server/account', () => ({
  replaceSkills: vi.fn(),
  replaceInterestedRoles: vi.fn(),
  replaceLanguages: vi.fn(),
}));

vi.mock('@/lib/action-toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/action-toast')>()),
  toastActionError: vi.fn(),
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
  vi.mocked(replaceSkills).mockResolvedValue({ ok: true });
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
  expect(removeBeta).toHaveAttribute('aria-disabled', 'true');
  await act(async () => finishRefresh());
  expect(removeBeta).not.toHaveAttribute('aria-disabled', 'true');
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

function rolesInput() {
  return screen.getByRole('combobox', {
    name: m.interestedRolesSection_heading(),
  });
}

async function mountRoles(roles: string[]) {
  const { invalidate } = await mountWithPendingRefresh(
    <InterestedRolesSection roles={roles} />,
  );
  invalidate.mockResolvedValue();
}

it('adds what is typed as a chip on Enter or a comma, and clears the input', async () => {
  vi.mocked(replaceInterestedRoles).mockResolvedValue({ ok: true });
  await mountRoles(['Pilot']);
  fireEvent.change(rolesInput(), { target: { value: 'Charter Pilot' } });
  fireEvent.keyDown(rolesInput(), { key: 'Enter' });
  await waitFor(() =>
    expect(replaceInterestedRoles).toHaveBeenLastCalledWith({
      data: { roles: ['Pilot', 'Charter Pilot'] },
    }),
  );
  await waitFor(() => expect(rolesInput()).toHaveValue(''));
  expect(screen.getByText('Charter Pilot')).toBeInTheDocument();

  fireEvent.change(rolesInput(), { target: { value: 'Flight Instructor' } });
  fireEvent.keyDown(rolesInput(), { key: ',' });
  await waitFor(() =>
    expect(replaceInterestedRoles).toHaveBeenLastCalledWith({
      data: { roles: ['Pilot', 'Charter Pilot', 'Flight Instructor'] },
    }),
  );
});

it('adds each entry of a comma-separated paste with one save, skipping blanks and repeats', async () => {
  vi.mocked(replaceInterestedRoles).mockResolvedValue({ ok: true });
  await mountRoles(['Pilot']);
  fireEvent.paste(rolesInput(), {
    clipboardData: {
      getData: () =>
        'pilot, Flight Instructor, , Charter Pilot, flight instructor',
    },
  });
  await waitFor(() =>
    expect(replaceInterestedRoles).toHaveBeenCalledExactlyOnceWith({
      data: { roles: ['Pilot', 'Flight Instructor', 'Charter Pilot'] },
    }),
  );
});

it('ignores a blank entry or a case-insensitive repeat without saving', async () => {
  await mountRoles(['Pilot']);
  fireEvent.change(rolesInput(), { target: { value: '   ' } });
  fireEvent.keyDown(rolesInput(), { key: 'Enter' });
  fireEvent.change(rolesInput(), { target: { value: 'PILOT' } });
  fireEvent.keyDown(rolesInput(), { key: 'Enter' });
  await waitFor(() => expect(rolesInput()).toHaveValue(''));
  expect(replaceInterestedRoles).not.toHaveBeenCalled();
  expect(screen.getAllByText('Pilot')).toHaveLength(1);
});

it('shows the refusal and keeps the typed text when a save fails', async () => {
  vi.mocked(replaceInterestedRoles).mockResolvedValue({
    ok: false,
    code: 'validation_bad_request',
    message: 'interestedRoles: at most 50 roles',
  });
  await mountRoles(['Pilot']);
  fireEvent.change(rolesInput(), { target: { value: 'Charter Pilot' } });
  fireEvent.keyDown(rolesInput(), { key: 'Enter' });
  await waitFor(() =>
    expect(toastActionError).toHaveBeenCalledWith(
      m.boardError_validationText(),
    ),
  );
  expect(rolesInput()).toHaveValue('Charter Pilot');
  expect(
    screen.queryByText('Charter Pilot', {
      selector: '[data-slot="combobox-chip"]',
    }),
  ).toBeNull();
});
