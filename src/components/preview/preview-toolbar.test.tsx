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
  invalidate: vi.fn<() => unknown>(),
}));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: mocks.invalidate }),
}));

vi.mock('../../server/preview', () => ({
  switchPersona: mocks.switchPersona,
  updateSandboxFlags: mocks.updateSandboxFlags,
  reseedSandbox: mocks.reseedSandbox,
  exitPreview: mocks.exitPreview,
}));

import { PreviewToolbar } from './preview-toolbar';

const capable: PreviewCapability = { canPreview: true, reason: 'sandbox' };

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
  registrationWallEnabled: false,
};

function renderToolbar({
  capability = capable,
  viewer = null as PreviewViewer | null,
} = {}) {
  return render(
    <PreviewToolbar
      capability={capability}
      personas={personas}
      viewer={viewer}
      config={config}
    />,
  );
}

// jsdom cannot navigate; the toolbar full-reloads after identity-changing
// actions (switch/reseed/exit) so every viewer-scoped client surface resets.
const reloadMock = vi.fn();
beforeEach(() => {
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

  it('renders the roster grouped by role in the panel', () => {
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: /Viewing as/ }));

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
    fireEvent.click(screen.getByRole('button', { name: /Viewing as/ }));
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
    fireEvent.click(screen.getByRole('button', { name: /Viewing as/ }));
    fireEvent.click(screen.getByText('Nadia New'));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /reseeded.*re-switch/i,
      ),
    );
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });

  it('toggles a boolean flag by its board-config key through updateSandboxFlags', async () => {
    mocks.updateSandboxFlags.mockResolvedValue({ ok: true });
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: /Viewing as/ }));

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
    fireEvent.click(screen.getByRole('button', { name: /Viewing as/ }));

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
    fireEvent.click(screen.getByRole('button', { name: /Viewing as/ }));

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

  it('reseeds after confirming in the owned alert dialog', async () => {
    mocks.reseedSandbox.mockResolvedValue({ ok: true });
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: /Viewing as/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reseed' }));

    // The confirm action lives in the alert dialog.
    const confirm = screen.getByRole('alertdialog');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Reseed' }));

    await waitFor(() => expect(mocks.reseedSandbox).toHaveBeenCalled());
    // Reseed purges the viewer's own board user — reload to the honest state.
    await waitFor(() => expect(reloadMock).toHaveBeenCalled());
  });
});
