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
import type { PreviewToolbarDependencies } from './preview-toolbar';

const mocks = {
  switchPersona: vi.fn<PreviewToolbarDependencies['switchPersona']>(),
  updateSandboxFlags: vi.fn<PreviewToolbarDependencies['updateSandboxFlags']>(),
  reseedSandbox: vi.fn<PreviewToolbarDependencies['reseedSandbox']>(),
  exitPreview: vi.fn<PreviewToolbarDependencies['exitPreview']>(),
  listSandboxEmails: vi.fn<PreviewToolbarDependencies['listSandboxEmails']>(),
  invalidate: vi.fn<PreviewToolbarDependencies['invalidate']>(),
};

import { PreviewToolbarView } from './preview-toolbar';

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
  jobRecommendationsEnabled: true,
  candidatesEnabled: true,
  employersEnabled: true,
  nativeApplicationsEnabled: true,
  applicantMessagingEnabled: true,
  registrationWallEnabled: false,
};

interface RenderToolbarOptions {
  capability?: PreviewCapability;
  viewer?: PreviewViewer | null;
  activePersonaId?: string | null;
  personasOverride?: PreviewPersona[];
  demoConfigured?: boolean;
  demoBoardPrivate?: boolean;
  dataSource?: 'board' | 'demo';
}

function renderToolbar({
  capability = capable,
  viewer = null,
  activePersonaId = null,
  personasOverride = personas,
  demoConfigured = false,
  demoBoardPrivate = false,
  dataSource = 'board',
}: RenderToolbarOptions = {}) {
  return render(
    <PreviewToolbarView
      capability={capability}
      personas={personasOverride}
      activePersonaId={activePersonaId}
      viewer={viewer}
      config={config}
      demoConfigured={demoConfigured}
      demoBoardPrivate={demoBoardPrivate}
      dataSource={dataSource}
      dependencies={{
        switchPersona: mocks.switchPersona,
        updateSandboxFlags: mocks.updateSandboxFlags,
        reseedSandbox: mocks.reseedSandbox,
        exitPreview: mocks.exitPreview,
        listSandboxEmails: mocks.listSandboxEmails,
        invalidate: mocks.invalidate,
      }}
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

function getPreviewActions() {
  const actions = document.querySelector<HTMLElement>(
    '[data-test="preview-actions"]',
  );
  if (!actions) throw new Error('Expected the preview actions to be visible');
  return actions;
}

// jsdom cannot navigate; the toolbar full-reloads after identity-changing
// actions (switch/reseed/exit) so every viewer-scoped client surface resets.
const reloadMock = vi.fn();
/** Captures every `document.cookie = …` write (data-source preference). */
const cookieWrites: string[] = [];
beforeEach(() => {
  // The footer's Emails action mounts the (lazy) emails sheet, which reads
  // this on open — resolve empty so it never throws in unrelated tests.
  mocks.listSandboxEmails.mockResolvedValue([]);
  cookieWrites.length = 0;
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => cookieWrites[cookieWrites.length - 1] ?? '',
    set: (value: string) => {
      cookieWrites.push(value);
    },
  });
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
    const actions = getPreviewActions();
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
    const panel = document.querySelector<HTMLElement>(
      '[data-test="preview-board-settings-panel"]',
    );
    if (!panel) throw new Error('Expected the board settings panel to open');
    expect(
      within(panel).getByRole('switch', { name: 'Candidate paywall' }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('combobox', { name: 'Talent directory' }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('switch', { name: 'Job recommendations' }),
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

  it('tracks overlapping flag writes independently and reconciles once after both settle', async () => {
    let resolveBlog!: (value: { ok: true }) => void;
    let resolveAlerts!: (value: { ok: true }) => void;
    const blogWrite = new Promise<{ ok: true }>((resolve) => {
      resolveBlog = resolve;
    });
    const alertsWrite = new Promise<{ ok: true }>((resolve) => {
      resolveAlerts = resolve;
    });
    mocks.updateSandboxFlags.mockImplementation(({ data }) =>
      'blogEnabled' in data.config ? blogWrite : alertsWrite,
    );
    mocks.invalidate.mockResolvedValue(undefined);
    renderToolbar();
    openBoardSettings();

    const blog = screen.getByRole('switch', { name: 'Blog' });
    const alerts = screen.getByRole('switch', { name: 'Job alerts' });
    fireEvent.click(blog);
    fireEvent.click(alerts);

    expect(blog).toHaveAttribute('aria-disabled', 'true');
    expect(alerts).toHaveAttribute('aria-disabled', 'true');
    expect(blog).not.toBeChecked();
    expect(alerts).not.toBeChecked();

    resolveAlerts({ ok: true });
    await waitFor(() => expect(alerts).not.toHaveAttribute('aria-disabled'));
    expect(blog).toHaveAttribute('aria-disabled', 'true');
    expect(mocks.invalidate).not.toHaveBeenCalled();

    resolveBlog({ ok: true });
    await waitFor(() => expect(blog).not.toHaveAttribute('aria-disabled'));
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalledOnce());
    // Static test props deliberately remain stale; committed selections must
    // not snap back while the sheet stays open.
    expect(blog).not.toBeChecked();
    expect(alerts).not.toBeChecked();
  });

  it('reports reconciliation failure separately after a flag write commits', async () => {
    mocks.updateSandboxFlags.mockResolvedValue({ ok: true });
    mocks.invalidate.mockRejectedValue(new Error('refresh unavailable'));
    renderToolbar();
    openBoardSettings();

    const blog = screen.getByRole('switch', { name: 'Blog' });
    fireEvent.click(blog);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /setting was updated.*couldn't refresh/i,
      ),
    );
    expect(blog).not.toBeChecked();
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      /couldn't update board settings/i,
    );
  });

  it('clears a settled optimistic flag after the sheet closes mid-write', async () => {
    let resolveWrite!: (value: { ok: true }) => void;
    mocks.updateSandboxFlags.mockReturnValue(
      new Promise<{ ok: true }>((resolve) => {
        resolveWrite = resolve;
      }),
    );
    mocks.invalidate.mockResolvedValue(undefined);
    renderToolbar();
    openBoardSettings();

    const blog = screen.getByRole('switch', { name: 'Blog' });
    expect(blog).toBeChecked();
    fireEvent.click(blog);
    expect(blog).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() =>
      expect(
        document.querySelector('[data-test="preview-board-settings-panel"]'),
      ).toBeNull(),
    );
    resolveWrite({ ok: true });
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalledOnce());

    openBoardSettings();
    expect(screen.getByRole('switch', { name: 'Blog' })).toBeChecked();
  }, 10_000);

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

  it.each([
    [
      'typed failure',
      () =>
        Promise.resolve({
          ok: false,
          code: 'unknown',
          message: 'nope',
        } as const),
    ],
    ['thrown failure', () => Promise.reject(new Error('network'))],
  ])('keeps reseed recoverable after a %s', async (_label, resultFactory) => {
    mocks.reseedSandbox.mockReturnValue(resultFactory());
    renderToolbar();
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Reseed' }));
    const confirm = screen.getByRole('alertdialog');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Reseed' }));

    await waitFor(() =>
      expect(within(confirm).getByRole('alert')).toHaveTextContent(
        /couldn't reseed.*try again/i,
      ),
    );
    expect(confirm).toBeVisible();
    expect(reloadMock).not.toHaveBeenCalled();
    expect(
      within(confirm).getByRole('button', { name: 'Reseed' }),
    ).not.toBeDisabled();
  });

  it.each([
    [
      'unexpected result',
      () =>
        Promise.resolve({
          ok: false,
          code: 'unknown',
          message: 'unknown',
        } as const),
    ],
    ['rejected request', () => Promise.reject(new Error('network'))],
  ])(
    'shows feedback and preserves state for an %s persona switch',
    async (_label, resultFactory) => {
      mocks.switchPersona.mockReturnValue(resultFactory());
      renderToolbar({ demoConfigured: true, dataSource: 'board' });
      openMenu();
      fireEvent.click(screen.getByText('Nadia New'));

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(
          /couldn't switch persona.*session is unchanged/i,
        ),
      );
      expect(cookieWrites).toHaveLength(0);
      expect(reloadMock).not.toHaveBeenCalled();
    },
  );

  it('marks exactly the stable active persona when display names collide', () => {
    const duplicateNames: PreviewPersona[] = personas.map((persona) => ({
      ...persona,
      displayName: 'Same Name',
    }));
    renderToolbar({
      personasOverride: duplicateNames,
      activePersonaId: 'employer-admin',
      viewer: {
        displayName: 'Same Name',
        email: 'employer@example.com',
        role: 'employer',
      },
    });
    openMenu();

    const rows = screen.getAllByRole('button', { name: /Same Name,/ });
    expect(rows).toHaveLength(2);
    expect(rows[0]).not.toHaveAttribute('aria-current');
    expect(rows[1]).toHaveAttribute('aria-current', 'true');
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
    const actions = getPreviewActions();
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
    let actions = getPreviewActions();
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
    actions = getPreviewActions();
    expect(
      within(actions).getByRole('button', { name: 'Board settings' }),
    ).toBeInTheDocument();
    expect(
      within(actions).getByRole('button', { name: 'Reseed' }),
    ).toBeInTheDocument();
  });
});

describe('PreviewToolbar data-source cookie + escape hatch (R1/R2/R4)', () => {
  it('failed switchPersona leaves the data-source cookie unchanged', async () => {
    mocks.switchPersona.mockResolvedValue({
      ok: false,
      code: 'persona-unavailable',
      message: 'reseeded',
    });
    renderToolbar({ demoConfigured: true, dataSource: 'board' });
    openMenu();
    fireEvent.click(screen.getByText('Nadia New'));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /reseeded.*re-switch/i,
      ),
    );
    // No cookie write, no reload — chrome and data source stay aligned.
    expect(
      cookieWrites.some((w) => w.includes('cavuno_data_source=demo')),
    ).toBe(false);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('successful switch writes demo cookie then reloads', async () => {
    mocks.switchPersona.mockResolvedValue({
      ok: true,
      viewer: {
        displayName: 'Nadia New',
        email: 'n@x.com',
        role: 'candidate',
      },
    });
    renderToolbar({ demoConfigured: true, dataSource: 'board' });
    openMenu();
    fireEvent.click(screen.getByText('Nadia New'));

    await waitFor(() => expect(mocks.switchPersona).toHaveBeenCalled());
    await waitFor(() => expect(reloadMock).toHaveBeenCalled());
    expect(
      cookieWrites.some((w) => w.includes('cavuno_data_source=demo')),
    ).toBe(true);
  });

  it('with canPreview=false + demoConfigured=true the Your board switcher still renders', () => {
    renderToolbar({
      capability: { canPreview: false, reason: 'not-sandbox' },
      demoConfigured: true,
      dataSource: 'demo',
    });
    // Escape hatch visible even when the preview RPC is down.
    expect(
      document.querySelector('[data-test="preview-toolbar"]'),
    ).not.toBeNull();
    openMenu();
    expect(
      screen.getByRole('button', { name: /Your board \(real data\)/i }),
    ).toBeInTheDocument();
    // Persona machinery + secondary tools stay hidden off-capability.
    expect(screen.queryByText('Nadia New')).toBeNull();
    expect(document.querySelector('[data-test="preview-actions"]')).toBeNull();
  });
});
