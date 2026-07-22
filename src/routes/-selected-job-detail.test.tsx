// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// SelectedJobDetail imports these server modules (used only inside apply/save
// callbacks); stub them so the pane can render without the server env.
vi.mock('../server/account', () => ({
  getSessionUser: vi.fn(),
  saveJob: vi.fn(),
}));
vi.mock('../server/applications', () => ({ applyToJob: vi.fn() }));
vi.mock('../server/queries', () => ({ getBoardContext: vi.fn() }));

import { SelectedJobDetail } from './-selected-job-detail';
import type { SelectedJobState } from './-use-selected-job';

import { m } from '@/paraglide/messages';
import type { PublicJob } from '@cavuno/board';

const job = {
  id: 'job-1',
  object: 'public_job',
  slug: 'previous-job',
  title: 'Previous job',
  description: '<p>Previous description.</p>',
  applicationUrl: 'https://apply.example/previous-job',
  company: { slug: 'acme', name: 'Acme', logoUrl: null, website: null },
  officeLocations: [],
  placeHierarchy: [],
  categories: [],
  skills: [],
  remoteOption: 'remote',
  remoteWorldwide: true,
  remoteWorkPermitCountryCodes: [],
  remoteTimezones: [],
  educationRequirements: [],
  experienceMonths: null,
  customFieldValues: {},
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  salaryTimeframe: null,
  seniority: null,
  employmentType: null,
  publishedAt: null,
  links: { public: 'https://jobs.example/companies/acme/jobs/previous-job' },
} as unknown as PublicJob;

const board = {
  language: 'en',
  labels: undefined,
  customFields: [],
  features: { nativeApplications: true },
} as unknown as Parameters<typeof SelectedJobDetail>[0]['board'];

const user = { emailVerified: true } as unknown as Parameters<
  typeof SelectedJobDetail
>[0]['user'];

function renderSelectedJob(status: SelectedJobState['status']) {
  const state: SelectedJobState = {
    status,
    job,
    companyDescription: null,
    alreadyApplied: false,
    retry: vi.fn(),
  };
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <SelectedJobDetail state={state} board={board} user={user} />
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

const applyLabel = m.applyButton_applyLabel();
const saveLabel = m.companyJobDetail_saveJobLabel();

afterEach(cleanup);

describe('SelectedJobDetail — detail assembly', () => {
  it('renders the ready job with operable apply and save controls', async () => {
    const { container } = renderSelectedJob('ready');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Previous job' }),
    ).toBeVisible();
    // Nothing is inert while the selection is ready.
    expect(container.querySelector('[data-inert="true"]')).toBeNull();
    expect(
      screen.getAllByRole('link', { name: applyLabel }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: saveLabel }).length,
    ).toBeGreaterThan(0);
  });

  it('keeps the previous job visible but makes apply and save inert when a transition fails', async () => {
    renderSelectedJob('error');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Previous job' }),
    ).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      m.jobSearch_detailErrorTitle(),
    );

    const applyControls = screen.getAllByRole('link', {
      name: applyLabel,
      hidden: true,
    });
    const saveControls = screen.getAllByRole('button', {
      name: saveLabel,
      hidden: true,
    });
    expect(applyControls.length).toBeGreaterThan(0);
    expect(saveControls.length).toBeGreaterThan(0);
    for (const control of [...applyControls, ...saveControls]) {
      expect(control.closest('[data-inert="true"]')).not.toBeNull();
    }
  });

  it('shows the pending skeleton — not the loaded job — while the next job loads', async () => {
    renderSelectedJob('loading');

    expect(await screen.findByRole('status')).toHaveTextContent(
      m.jobSearch_detailLoadingLabel(),
    );
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Previous job' }),
    ).toBeNull();
    expect(screen.queryByRole('link', { name: applyLabel })).toBeNull();
  });
});
