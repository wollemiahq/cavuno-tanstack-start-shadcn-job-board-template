// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  companyId: undefined as string | undefined,
  navigate: vi.fn(),
  invalidate: vi.fn(),
  refresh: vi.fn(),
  gate: vi.fn(),
  grant: vi.fn(),
  unlock: vi.fn(),
  upgrade: vi.fn(),
  start: vi.fn(),
}));
vi.mock('@tanstack/react-router', async (original) => {
  const actual = await original<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    createFileRoute: () => (options: object) => ({
      options,
      useLoaderData: () => ({ profile }),
      useParams: () => ({ handle: 'candidate-1' }),
      useSearch: () => ({ companyId: state.companyId }),
      useNavigate: () => state.navigate,
    }),
    getRouteApi: () => ({
      useLoaderData: () => ({ board: { features: { messaging: true } } }),
    }),
    useRouter: () => ({ invalidate: state.invalidate }),
    useLocation: () => ({ href: '/p/candidate-1' }),
  };
});
vi.mock('@/components/root-session', () => ({
  useRootSession: () => ({
    user: { role: 'employer' },
    ready: true,
    refreshSession: state.refresh,
    talentAccess: grant,
    employerCompanies: [
      { status: 'approved', company: { id: 'company-a', name: 'Company A' } },
      { status: 'approved', company: { id: 'company-b', name: 'Company B' } },
      {
        status: 'pending',
        company: { id: 'company-pending', name: 'Pending company' },
      },
    ],
  }),
}));
vi.mock('@/server/talent-access', () => ({
  getTalentCandidateAccess: state.gate,
  getTalentAccessGrant: state.grant,
  unlockTalentProfile: state.unlock,
  upgradeTalentAccess: state.upgrade,
}));
vi.mock('@/server/messaging', () => ({ startConversation: state.start }));
vi.mock('@/server/queries', () => ({ listPlans: async () => ({ data: [] }) }));
vi.mock('@/server/talent-pages', () => ({
  getTalentProfilePage: vi.fn(),
  getTalentIndexPage: vi.fn(),
  getTalentLocationPage: vi.fn(),
  getTalentLocationsIndexPage: vi.fn(),
}));
vi.mock('./-talent-profile-view', () => ({
  TalentProfilePageView: ({
    companySelector,
  }: {
    companySelector: React.ReactNode;
  }) => (
    <main>
      {companySelector}
      <p data-testid="unlocked-profile">{profile.displayName}</p>
    </main>
  ),
}));
import { TalentProfilePage } from './p.$handle';

import { m } from '@/paraglide/messages';
import { renderRouted } from '@/test/render-routed';
import type {
  TalentAccess,
  TalentCandidateAccess,
  TalentProfile,
} from '@cavuno/board';
const profile = {
  id: 'candidate-1',
  handle: 'person',
  displayName: 'Candidate',
  headline: 'Engineer',
  object: 'talent_profile',
  lastActive: null,
  location: null,
  avatarUrl: null,
  bio: null,
  jobSearchStatus: null,
  experiences: [],
  education: [],
  skills: [],
  languages: [],
  customFieldValues: {},
  objectReferences: [],
} satisfies TalentProfile;
const grant = {
  object: 'talent_access',
  isEmployer: true,
  paywallActive: true,
  hasTalentAccess: true,
  hasUnlimitedUnlocks: false,
  hasUnlimitedMessages: false,
  accessModel: 'paid_unlocks_and_messaging',
  companyId: null,
  unlockCreditsRemaining: 24,
  messageCreditsRemaining: 10,
} satisfies TalentAccess;
function access(companyId: string, unlocked = true): TalentCandidateAccess {
  return {
    object: 'talent_candidate_access',
    candidateId: profile.id,
    companyId,
    alreadyUnlocked: unlocked,
    unlockCreditsRemaining: 24,
    messageCreditsRemaining: 10,
    hasUnlimitedUnlocks: false,
    hasUnlimitedMessages: false,
    hasActiveTalentSubscription: true,
  };
}
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  state.companyId = undefined;
  state.gate.mockImplementation(async ({ data }) => access(data.companyId));
  state.grant.mockImplementation(async ({ data }) => ({
    ...grant,
    companyId: data.companyId,
  }));
  state.unlock.mockResolvedValue({ ok: true, data: { alreadyUnlocked: true } });
});
describe('candidate profile company context', () => {
  it('requires an explicit approved company when several memberships exist', async () => {
    await renderRouted(<TalentProfilePage />);
    expect(
      screen.getByRole('combobox', { name: m.talentUnlock_companyLabel() }),
    ).toHaveValue('');
    expect(
      screen.queryByRole('option', { name: 'Pending company' }),
    ).not.toBeInTheDocument();
    expect(state.gate).not.toHaveBeenCalled();
    expect(screen.queryByTestId('unlocked-profile')).not.toBeInTheDocument();
    fireEvent.change(
      screen.getByRole('combobox', { name: m.talentUnlock_companyLabel() }),
      { target: { value: 'company-b' } },
    );
    expect(state.navigate).toHaveBeenCalledWith({
      search: { companyId: 'company-b' },
      resetScroll: false,
    });
  });
  it('reads the selected second company and never uses the aggregate company for unlock', async () => {
    state.companyId = 'company-b';
    state.gate.mockResolvedValue(access('company-b', false));
    await renderRouted(<TalentProfilePage />);
    await screen.findByRole('button', { name: m.talentUnlock_confirmAction() });
    expect(state.gate).toHaveBeenCalledWith({
      data: { candidateId: profile.id, companyId: 'company-b' },
    });
    expect(state.grant).toHaveBeenCalledWith({
      data: { companyId: 'company-b' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: m.talentUnlock_confirmAction() }),
    );
    const dialog = await screen.findByRole('alertdialog');
    const { within } = await import('@testing-library/react');
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: m.talentUnlock_confirmAction(),
      }),
    );
    await waitFor(() =>
      expect(state.unlock).toHaveBeenCalledWith({
        data: { candidateId: profile.id, companyId: 'company-b' },
      }),
    );
  });
  it('hides prior-company access immediately and ignores a delayed reply after switching', async () => {
    let release!: (value: TalentCandidateAccess) => void;
    state.companyId = 'company-a';
    state.gate.mockImplementationOnce(
      () => new Promise<TalentCandidateAccess>((r) => (release = r)),
    );
    const view = await renderRouted(<TalentProfilePage />);
    await waitFor(() => expect(state.gate).toHaveBeenCalledOnce());
    state.companyId = 'company-b';
    view.rerender(<TalentProfilePage />);
    await screen.findByTestId('unlocked-profile');
    expect(
      screen.getByRole('combobox', { name: m.talentUnlock_companyLabel() }),
    ).toHaveValue('company-b');
    await act(async () => release(access('company-a', false)));
    expect(screen.getByTestId('unlocked-profile')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: m.talentUnlock_confirmAction() }),
    ).not.toBeInTheDocument();
  });
  it('does not substitute an approved company for an unauthorized query selection', async () => {
    state.companyId = 'company-pending';
    await renderRouted(<TalentProfilePage />);
    expect(state.gate).not.toHaveBeenCalled();
    expect(screen.queryByTestId('unlocked-profile')).not.toBeInTheDocument();
  });
});
