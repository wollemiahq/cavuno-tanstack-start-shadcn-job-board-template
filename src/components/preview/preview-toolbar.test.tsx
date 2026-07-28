// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  PreviewBoardConfig,
  PreviewCapability,
  PreviewPersona,
  PreviewViewer,
} from '../../lib/preview';

const mocks = vi.hoisted(() => ({
  switchPersona: vi.fn<() => unknown>(),
  updateSandboxFlags: vi.fn<() => unknown>(),
  reseedSandbox: vi.fn<() => unknown>(),
  exitPreview: vi.fn<() => unknown>(),
  listSandboxEmails: vi.fn<() => unknown>(),
  invalidate: vi.fn<() => unknown>(),
}));

// The persona menu and the board-settings sheet both consume `useRouter`
// (the flag optimistic path invalidates on success); one mock covers both.
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: mocks.invalidate }),
}));

vi.mock('../../server/preview', () => ({
  switchPersona: mocks.switchPersona,
  updateSandboxFlags: mocks.updateSandboxFlags,
  reseedSandbox: mocks.reseedSandbox,
  exitPreview: mocks.exitPreview,
  listSandboxEmails: mocks.listSandboxEmails,
}));

import { PreviewToolbar } from './preview-toolbar';

const capable: PreviewCapability = { canPreview: true, reason: 'sandbox' };

// The trigger is a plain pill visually ("Viewing as: …") but carries a static
// aria-label so assistive tech announces the control's purpose (a11y gate).
const PANEL_LABEL = 'Preview toolbar — switch persona and board settings';

const personas: PreviewPersona[] = [
  {
    id: 'candidate-new',
    role: 'candidate',
    displayName: 'Nadia New',
    description: 'Verified, empty everything',
    states: ['empty-profile'],
  },
  {
    id: 'employer-admin',
    role: 'employer',
    displayName: 'Adam Admin',
    description: 'Approved admin with applicants',
    states: ['applicant-pipeline'],
  },
];

const config: PreviewBoardConfig = {
  jobAccessPaywallEnabled: false,
  talentDirectoryVisibility: 'public',
  blogEnabled: true,
  jobAlertsEnabled: true,
  candidatesEnabled: true,
  employersEnabled: true,
  nativeApplicationsEnabled: true,
  applicantMessagingEnabled: true,
  registrationWallEnabled: false,
};

function renderToolbar({
  capability = capable,
  viewer = null as PreviewViewer | null,
  demoConfigured = false,
  demoBoardPrivate = false,
  dataSource = 'board' as 'board' | 'demo',
} = {}) {
  return render(
    <PreviewToolbar
      capability={capability}
      personas={personas}
      viewer={viewer}
      config={config}
      demoConfigured={demoConfigured}
      demoBoardPrivate={demoBoardPrivate}
      dataSource={dataSource}
    />,
  );
}

// Open the persona menu via its stable, labelled floating trigger.
function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: PANEL_LABEL }));
}

// Board settings now live behind their own footer affordance: open the menu,
// then the gear. Opening it dismisses the menu (a separate focused surface).
function openBoardSettings() {
  openMenu();
  fireEvent.click(screen.getByRole('button', { name: 'Board settings' }));
}

// jsdom cannot navigate; the toolbar full-reloads after identity-changing
// actions (switch/reseed/exit) so every viewer-scoped client surface resets.
const reloadMock = vi.fn();
beforeEach(() => {
  // The footer's Emails action mounts the (lazy) emails sheet, which reads
  // this on open — resolve empty so it never throws in unrelated tests.
  mocks.listSandboxEmails.mockResolvedValue([]);
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload: reloadMock },
    writable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PreviewToolbar', () => {
  it('renders nothing when the context is not capable', () => {
    const { container } = renderToolbar({
      capability: { canPreview: false, reason: 'not-sandbox' },
    });
    expect(container.querySelector('[data-test="preview-toolbar"]')).toBeNull();
  });

  it('shows "Anonymous" in the pill when signed out', () => {
    renderToolbar();
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
  });

  it('names the current viewer in the pill', () => {
    renderToolbar({
      viewer: {
        displayName: 'Casey Complete',
        email: 'c@x.com',
        role: 'candidate',
      },
    });
    expect(screen.getByText('Casey Complete')).toBeInTheDocument();
  });

  it('gives the trigger and each persona row an accessible name', () => {
    renderToolbar();
    // The floating trigger is reachable by an explicit, stable label.
    fireEvent.click(screen.getByRole('button', { name: PANEL_LABEL }));

    // Each persona button announces "<displayName>, <description>" so it is
    // self-describing out of the visual group context.
    expect(
      screen.getByRole('button', {
        name: 'Nadia New, Verified, empty everything',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Adam Admin, Approved admin with applicants',
      }),
    ).toBeInTheDocument();
  });

  it('renders the roster grouped by role in the panel', () => {
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: PANEL_LABEL }));

    expect(screen.getByText('Candidates')).toBeInTheDocument();
    expect(screen.getByText('Employers')).toBeInTheDocument();
    expect(screen.getByText('Nadia New')).toBeInTheDocument();
    expect(screen.getByText('Verified, empty everything')).toBeInTheDocument();
    expect(screen.getByText('Adam Admin')).toBeInTheDocument();
  });

  it('switches by persona id (credentials never leave the server)', async () => {
    mocks.switchPersona.mockResolvedValue({
      ok: true,
      viewer: { displayName: 'Nadia New', email: 'n@x.com', role: 'candidate' },
    });
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: PANEL_LABEL }));
    fireEvent.click(screen.getByText('Nadia New'));

    await waitFor(() =>
      expect(mocks.switchPersona).toHaveBeenCalledWith({
        data: { personaId: 'candidate-new' },
      }),
    );
    // Identity changed: full reload (resets dock/thread/loader state), never
    // a mere invalidate.
    await waitFor(() => expect(reloadMock).toHaveBeenCalled());
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });

  it('surfaces the reseed affordance when a switch hits a stale persona', async () => {
    mocks.switchPersona.mockResolvedValue({
      ok: false,
      code: 'persona-unavailable',
      message: 'reseeded',
    });
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: PANEL_LABEL }));
    fireEvent.click(screen.getByText('Nadia New'));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /reseeded.*re-switch/i,
      ),
    );
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });

  it('keeps the persona menu focused — footer actions, no flag switches', () => {
    renderToolbar();
    openMenu();

    // The primary surface does ONE job (switch persona) plus a footer action
    // row; the flag controls have moved out to their own surface.
    const actions = document.querySelector(
      '[data-test="preview-actions"]',
    ) as HTMLElement;
    expect(
      within(actions).getByRole('button', { name: 'Board settings' }),
    ).toBeInTheDocument();
    expect(
      within(actions).getByRole('button', { name: 'Emails' }),
    ).toBeInTheDocument();
    expect(
      within(actions).getByRole('button', { name: 'Reseed' }),
    ).toBeInTheDocument();
    expect(
      within(actions).getByRole('button', { name: 'Exit preview' }),
    ).toBeInTheDocument();

    // No flag switch/select is present in the persona menu anymore.
    expect(screen.queryByRole('switch')).toBeNull();
    expect(
      screen.queryByRole('combobox', { name: 'Talent directory' }),
    ).toBeNull();
  });

  it('reveals the flag controls only after opening Board settings', () => {
    renderToolbar();
    openBoardSettings();

    // The focused surface carries its own title + the whitelisted controls.
    const panel = document.querySelector(
      '[data-test="preview-board-settings-panel"]',
    ) as HTMLElement;
    expect(panel).not.toBeNull();
    expect(
      within(panel).getByRole('switch', { name: 'Candidate paywall' }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('combobox', { name: 'Talent directory' }),
    ).toBeInTheDocument();
  });

  it('toggles a boolean flag by its board-config key through updateSandboxFlags', async () => {
    mocks.updateSandboxFlags.mockResolvedValue({ ok: true });
    renderToolbar();
    openBoardSettings();

    fireEvent.click(screen.getByRole('switch', { name: 'Candidate paywall' }));

    await waitFor(() =>
      expect(mocks.updateSandboxFlags).toHaveBeenCalledWith({
        data: { config: { jobAccessPaywallEnabled: true } },
      }),
    );
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
  });

  it('sets the tri-state talent directory via the enum config key', async () => {
    mocks.updateSandboxFlags.mockResolvedValue({ ok: true });
    renderToolbar();
    openBoardSettings();

    fireEvent.change(
      screen.getByRole('combobox', { name: 'Talent directory' }),
      { target: { value: 'employers_only' } },
    );

    await waitFor(() =>
      expect(mocks.updateSandboxFlags).toHaveBeenCalledWith({
        data: { config: { talentDirectoryVisibility: 'employers_only' } },
      }),
    );
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
  });

  it('surfaces an error and does not invalidate when a toggle rejects', async () => {
    mocks.updateSandboxFlags.mockRejectedValueOnce(new Error('400'));
    renderToolbar();
    openBoardSettings();

    fireEvent.click(screen.getByRole('switch', { name: 'Blog' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /couldn't update board settings/i,
      ),
    );
    // Control reverts: no router invalidation on failure, so the switch stays
    // bound to the current (unchanged) config prop.
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });

  it('opens the Emails sheet from the footer envelope', async () => {
    mocks.listSandboxEmails.mockResolvedValue([]);
    renderToolbar();
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Emails' }));

    // The Emails sheet mounts and lazily loads its captures on open.
    await waitFor(() =>
      expect(
        document.querySelector('[data-test="preview-emails-panel"]'),
      ).not.toBeNull(),
    );
    await waitFor(() => expect(mocks.listSandboxEmails).toHaveBeenCalled());
  });

  it('reseeds after confirming in the footer-opened alert dialog', async () => {
    mocks.reseedSandbox.mockResolvedValue({ ok: true });
    renderToolbar();
    openMenu();
    // The footer's Reseed action opens the confirm dialog.
    fireEvent.click(screen.getByRole('button', { name: 'Reseed' }));

    // The confirm action lives in the alert dialog.
    const confirm = screen.getByRole('alertdialog');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Reseed' }));

    await waitFor(() => expect(mocks.reseedSandbox).toHaveBeenCalled());
    // Reseed purges the viewer's own board user — reload to the honest state.
    await waitFor(() => expect(reloadMock).toHaveBeenCalled());
  });
});

describe('PreviewToolbar dual-source switcher (T5)', () => {
  it('renders "Your board (real data)" only when a demo key is configured', () => {
    const { unmount } = renderToolbar({ demoConfigured: false });
    openMenu();
    expect(
      screen.queryByRole('button', { name: /Your board \(real data\)/i }),
    ).toBeNull();
    unmount();

    renderToolbar({ demoConfigured: true, dataSource: 'board' });
    openMenu();
    expect(
      screen.getByRole('button', { name: /Your board \(real data\)/i }),
    ).toBeInTheDocument();
  });

  it('hides board-settings + reseed when demo is shared (private unset)', () => {
    renderToolbar({
      demoConfigured: true,
      demoBoardPrivate: false,
      dataSource: 'demo',
    });
    openMenu();
    const actions = document.querySelector(
      '[data-test="preview-actions"]',
    ) as HTMLElement;
    expect(
      within(actions).queryByRole('button', { name: 'Board settings' }),
    ).toBeNull();
    expect(
      within(actions).queryByRole('button', { name: 'Reseed' }),
    ).toBeNull();
    // Emails + Exit remain — shared-tenant tools that do not mutate config.
    expect(
      within(actions).getByRole('button', { name: 'Emails' }),
    ).toBeInTheDocument();
  });

  it('shows board-settings + reseed only in demo mode when PRIVATE is "1"', () => {
    // Dual-source private shadow: controls are demo-mode-only (never while
    // viewing "Your board" — that would PATCH the demo from primary config).
    const { unmount } = renderToolbar({
      demoConfigured: true,
      demoBoardPrivate: true,
      dataSource: 'board',
    });
    openMenu();
    let actions = document.querySelector(
      '[data-test="preview-actions"]',
    ) as HTMLElement;
    expect(
      within(actions).queryByRole('button', { name: 'Board settings' }),
    ).toBeNull();
    expect(
      within(actions).queryByRole('button', { name: 'Reseed' }),
    ).toBeNull();
    unmount();

    renderToolbar({
      demoConfigured: true,
      demoBoardPrivate: true,
      dataSource: 'demo',
    });
    openMenu();
    actions = document.querySelector(
      '[data-test="preview-actions"]',
    ) as HTMLElement;
    expect(
      within(actions).getByRole('button', { name: 'Board settings' }),
    ).toBeInTheDocument();
    expect(
      within(actions).getByRole('button', { name: 'Reseed' }),
    ).toBeInTheDocument();
  });
});
