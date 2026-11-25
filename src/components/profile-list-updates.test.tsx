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

it('keeps the committed skill list while refresh is pending and uses it for the next edit', async () => {
  vi.mocked(replaceSkills).mockResolvedValue({ ok: true });
  const { invalidate, finishRefresh } = await mountWithPendingRefresh(
    <SkillsSection skills={['Alpha', 'Beta']} />,
  );
  const edit = screen.getByRole('button', {
    name: m.skillsSection_editLabel(),
  });
  fireEvent.click(edit);
  fireEvent.click(
    await screen.findByRole('button', {
      name: m.skillsSection_removeSkillAriaLabel({ skill: 'Alpha' }),
    }),
  );
  fireEvent.click(
    screen.getByRole('button', { name: m.skillsSection_saveLabel() }),
  );
  await waitFor(() => expect(invalidate).toHaveBeenCalledOnce());
  expect(replaceSkills).toHaveBeenCalledExactlyOnceWith({
    data: { skills: ['Beta'] },
  });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  expect(edit).toBeDisabled();
  await act(async () => finishRefresh());
  expect(edit).toBeEnabled();
  fireEvent.click(edit);
  fireEvent.click(
    await screen.findByRole('button', {
      name: m.skillsSection_removeSkillAriaLabel({ skill: 'Beta' }),
    }),
  );
  fireEvent.click(
    screen.getByRole('button', { name: m.skillsSection_saveLabel() }),
  );
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

function saveButton() {
  return screen.getByRole('button', { name: m.skillsSection_saveLabel() });
}

/** Mounts the roles card and opens its dialog. */
async function openRoles(roles: string[]) {
  const { invalidate } = await mountWithPendingRefresh(
    <InterestedRolesSection roles={roles} />,
  );
  invalidate.mockResolvedValue();
  fireEvent.click(
    screen.getByRole('button', {
      name:
        roles.length > 0
          ? m.skillsSection_editLabel()
          : m.interestedRolesSection_addLabel(),
    }),
  );
  await screen.findByRole('dialog');
}

it('shows read-only chips on the card and an Add button when empty', async () => {
  await mountWithPendingRefresh(<InterestedRolesSection roles={['Pilot']} />);
  expect(screen.getByText('Pilot')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', {
      name: m.interestedRolesSection_removeRoleAriaLabel({ role: 'Pilot' }),
    }),
  ).toBeNull();
  expect(screen.queryByRole('combobox')).toBeNull();
  cleanup();
  await openRoles([]);
  expect(screen.getByRole('dialog')).toHaveTextContent(
    m.interestedRolesSection_heading(),
  );
  await waitFor(() => expect(rolesInput()).toHaveFocus());
});

it('adds chips on Enter, a comma or a paste, skipping blanks and repeats, then saves once', async () => {
  vi.mocked(replaceInterestedRoles).mockResolvedValue({ ok: true });
  await openRoles(['Pilot']);
  fireEvent.change(rolesInput(), { target: { value: 'Charter Pilot' } });
  fireEvent.keyDown(rolesInput(), { key: 'Enter' });
  expect(rolesInput()).toHaveValue('');
  fireEvent.change(rolesInput(), { target: { value: 'PILOT' } });
  fireEvent.keyDown(rolesInput(), { key: ',' });
  fireEvent.paste(rolesInput(), {
    clipboardData: {
      getData: () =>
        'Flight Instructor, , charter pilot, Air Traffic Controller',
    },
  });
  expect(replaceInterestedRoles).not.toHaveBeenCalled();
  fireEvent.click(saveButton());
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(replaceInterestedRoles).toHaveBeenCalledExactlyOnceWith({
    data: {
      roles: [
        'Pilot',
        'Charter Pilot',
        'Flight Instructor',
        'Air Traffic Controller',
      ],
    },
  });
});

it('saves text typed but not yet entered', async () => {
  vi.mocked(replaceInterestedRoles).mockResolvedValue({ ok: true });
  await openRoles(['Pilot']);
  fireEvent.change(rolesInput(), { target: { value: 'Charter Pilot' } });
  fireEvent.click(saveButton());
  await waitFor(() =>
    expect(replaceInterestedRoles).toHaveBeenCalledExactlyOnceWith({
      data: { roles: ['Pilot', 'Charter Pilot'] },
    }),
  );
});

it('discards the dialog edits on Cancel', async () => {
  await openRoles(['Pilot']);
  fireEvent.change(rolesInput(), { target: { value: 'Charter Pilot' } });
  fireEvent.keyDown(rolesInput(), { key: 'Enter' });
  fireEvent.click(
    screen.getByRole('button', { name: m.skillsSection_cancelLabel() }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(replaceInterestedRoles).not.toHaveBeenCalled();
  expect(screen.queryByText('Charter Pilot')).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: m.skillsSection_editLabel() }),
  );
  await screen.findByRole('dialog');
  expect(screen.queryByText('Charter Pilot')).toBeNull();
});

it('shows a refusal in the dialog and keeps it open with the edits', async () => {
  vi.mocked(replaceInterestedRoles).mockResolvedValue({
    ok: false,
    code: 'validation_bad_request',
    message: 'Request validation failed',
  });
  await openRoles(['Pilot']);
  fireEvent.change(rolesInput(), { target: { value: 'Charter Pilot' } });
  fireEvent.keyDown(rolesInput(), { key: 'Enter' });
  fireEvent.click(saveButton());
  expect(
    await screen.findByText(m.boardError_validationText()),
  ).toBeInTheDocument();
  expect(screen.getByRole('dialog')).toHaveTextContent('Charter Pilot');
  expect(rolesInput()).toHaveAttribute('aria-invalid', 'true');
  expect(saveButton()).toBeEnabled();
});

it('blocks Save with a message while the list has more roles than the API allows', async () => {
  const fifty = Array.from({ length: 50 }, (_, i) => `Role ${i + 1}`);
  await openRoles(fifty);
  const tooMany = m.interestedRolesSection_tooManyError({ max: 50 });
  expect(screen.queryByText(tooMany)).toBeNull();
  expect(saveButton()).toBeEnabled();
  fireEvent.change(rolesInput(), { target: { value: 'Charter Pilot' } });
  expect(screen.getByText(tooMany)).toBeInTheDocument();
  expect(saveButton()).toBeDisabled();
  fireEvent.keyDown(rolesInput(), { key: 'Enter' });
  expect(screen.getByText(tooMany)).toBeInTheDocument();
  fireEvent.submit(saveButton().closest('form')!);
  expect(replaceInterestedRoles).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole('button', {
      name: m.interestedRolesSection_removeRoleAriaLabel({ role: 'Role 1' }),
    }),
  );
  await waitFor(() => expect(screen.queryByText(tooMany)).toBeNull());
  expect(saveButton()).toBeEnabled();
});

it('blocks Save with a message while a role is longer than the API allows', async () => {
  await openRoles(['Pilot']);
  const tooLong = m.interestedRolesSection_tooLongError({ max: 100 });
  fireEvent.change(rolesInput(), { target: { value: 'x'.repeat(101) } });
  expect(screen.getByText(tooLong)).toBeInTheDocument();
  expect(saveButton()).toBeDisabled();
  expect(rolesInput()).toHaveAttribute('aria-invalid', 'true');
  fireEvent.change(rolesInput(), { target: { value: 'x'.repeat(100) } });
  expect(screen.queryByText(tooLong)).toBeNull();
  expect(saveButton()).toBeEnabled();
});

it('uses the skills limit and wording for Skills', async () => {
  const skills = Array.from({ length: 200 }, (_, i) => `Skill ${i + 1}`);
  await mountWithPendingRefresh(<SkillsSection skills={skills} />);
  fireEvent.click(
    screen.getByRole('button', { name: m.skillsSection_editLabel() }),
  );
  const input = await screen.findByRole('combobox', {
    name: m.skillsSection_heading(),
  });
  fireEvent.change(input, { target: { value: 'x'.repeat(150) } });
  expect(
    screen.getByText(m.skillsSection_tooManyError({ max: 200 })),
  ).toBeInTheDocument();
  expect(saveButton()).toBeDisabled();
});
