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

import {
  SelectedJobDetail,
  type SelectedJobDetailDependencies,
} from './-selected-job-detail';

import type { SelectedJobState } from './-use-selected-job';
import { m } from '@/paraglide/messages';
import type { PublicJob } from '@cavuno/board';

const job = {
  id: 'job-1',
  object: 'public_job',
  slug: 'previous-job',
  title: 'Previous job',
  status: 'published',
  companyId: 'company-1',
  description: '<p>Previous description.</p>',
  applicationUrl: 'https://apply.example/previous-job',
  company: {
    id: 'company-1',
    slug: 'acme',
    name: 'Acme',
    logoUrl: null,
    website: null,
  },
  officeLocations: [],
  placeHierarchy: [],
  categories: [],
  skills: [],
  remoteOption: 'remote',
  remoteWorldwide: true,
  remoteWorkPermitCountryCodes: [],
  remoteWorkPermitSubdivisionCodes: [],
  remotePermits: [],
  remoteAllowedTzOffsets: [],
  remoteSponsorship: 'unknown',
  remoteTimezones: [],
  educationRequirements: [],
  experienceMonths: null,
  experienceInPlaceOfEducation: null,
  inOfficePeriod: null,
  inOfficeFrequency: null,
  customFieldValues: {},
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  salaryTimeframe: null,
  isFeatured: false,
  isSponsored: false,
  applyAction: 'external_direct',
  seniority: null,
  employmentType: null,
  publishedAt: null,
  expiresAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  links: { public: 'https://jobs.example/companies/acme/jobs/previous-job' },
} satisfies PublicJob;

const board = {
  object: 'public_board',
  id: 'board-1',
  slug: 'acme-jobs',
  name: 'Acme Jobs',
  language: 'en',
  logoUrl: null,
  icons: {
    ico: null,
    svg: null,
    appleTouch: null,
    icon192: null,
    icon512: null,
    iconMaskable512: null,
  },
  primaryDomain: 'jobs.example',
  showCavunoBranding: false,
  customFields: { job: [] },
  features: {
    jobAlerts: true,
    jobRecommendationsEnabled: true,
    recommendedTalentEnabled: false,
    candidates: true,
    employers: true,
    blog: true,
    talentDirectory: 'public',
    registrationWall: false,
    passwordProtected: false,
    publicJobSubmission: false,
    candidatePaywall: false,
    impressum: false,
    nativeApplications: true,
    messaging: true,
  },
  analytics: {
    ga4MeasurementId: null,
    gtmId: null,
    metaPixelId: null,
    linkedInPartnerId: null,
    cookieConsentRequired: false,
  },
  contact: {
    email: null,
    websiteUrl: null,
    xUrl: null,
    facebookUrl: null,
    linkedinUrl: null,
  },
  footer: {
    contactEmail: null,
    websiteUrl: null,
    xUrl: null,
    facebookUrl: null,
    linkedinUrl: null,
  },
  talentDirectoryVisibility: 'public',
} satisfies Parameters<typeof SelectedJobDetail>[0]['board'];

const user = {
  id: 'user-1',
  object: 'board_user',
  email: 'candidate@example.com',
  displayName: 'Candidate',
  role: 'candidate',
  emailVerified: true,
  hasPassword: true,
} satisfies NonNullable<Parameters<typeof SelectedJobDetail>[0]['user']>;

const dependencies: SelectedJobDetailDependencies = {
  applyToJob: vi.fn(),
  prepareApplyToJob: vi.fn(),
  saveJob: vi.fn(),
};

function renderSelectedJob(status: SelectedJobState['status']) {
  const state: SelectedJobState = {
    status,
    job,
    companySummary: null,
    applicationState: 'not-applied',
    retry: vi.fn(),
  };
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <SelectedJobDetail
        state={state}
        board={board}
        user={user}
        dependencies={dependencies}
      />
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
