// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';

import { BoardApiError } from '@cavuno/board';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  isNotFound as isRouteNotFound,
  isRedirect,
} from '@tanstack/react-router';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicantPipelineBoard } from '../components/employer/applicant-pipeline-board';
import { handleEmployerLoaderErrorUsing } from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import {
  ApplicantsPageView,
  createApplicantsLoader,
  type ApplicantsLoaderDependencies,
} from './-employers.applicants';
import {
  CompanyJobsPageView,
  createCompanyJobsLoader,
  type CompanyJobsLoaderDependencies,
  type CompanyJobsViewActions,
  type CompanyJobsViewData,
} from './-employers.company-jobs';
import {
  CompanyMembersPageView,
  type CompanyMembersViewActions,
  type CompanyMembersViewData,
} from './-employers.company-members';
import {
  CompanyProfilePageView,
  type CompanyProfileLoaderData,
  type CompanyProfileViewData,
  type CompanyProfileViewActions,
} from './-employers.company-profile';
import { Route as JobsRoute } from './employers.companies.$slug.index';
import { Route as ApplicantsRoute } from './employers.companies.$slug.jobs.$jobId.applicants';
import { Route as MembersRoute } from './employers.companies.$slug.members';
import { Route as ProfileRoute } from './employers.companies.$slug.profile';

import type { PipelineBoardVM } from '../board/pipeline-view-model';
import type { PipelineActions } from '../components/employer/applicant-pipeline-board';

const pipelineActions = {
  moveApplicant: vi.fn<PipelineActions['moveApplicant']>(),
  bulkRejectApplicants: vi.fn<PipelineActions['bulkRejectApplicants']>(),
  addApplicantNote: vi.fn<PipelineActions['addApplicantNote']>(),
  createStage: vi.fn<PipelineActions['createStage']>(),
  renameStage: vi.fn<PipelineActions['renameStage']>(),
  removeStage: vi.fn<PipelineActions['removeStage']>(),
  invalidate: vi.fn(),
  toastError: vi.fn(),
} satisfies PipelineActions;

const refreshSession = vi.fn<() => Promise<{ ok: boolean }>>();
const jobsLoaderDependencies = {
  getCompanyWorkspace:
    vi.fn<CompanyJobsLoaderDependencies['getCompanyWorkspace']>(),
  getEmployerJobStats:
    vi.fn<CompanyJobsLoaderDependencies['getEmployerJobStats']>(),
  getEmployerJobStatsTimeseries:
    vi.fn<CompanyJobsLoaderDependencies['getEmployerJobStatsTimeseries']>(),
  getSeoBase: vi.fn<CompanyJobsLoaderDependencies['getSeoBase']>(),
  handleEmployerLoaderError: vi.fn((error, returnTo, options) =>
    handleEmployerLoaderErrorUsing(refreshSession, error, returnTo, options),
  ),
} satisfies CompanyJobsLoaderDependencies;
const applicantsLoaderDependencies = {
  getBoardContext: vi.fn<ApplicantsLoaderDependencies['getBoardContext']>(),
  getPipeline: vi.fn<ApplicantsLoaderDependencies['getPipeline']>(),
  getSeoBase: vi.fn<ApplicantsLoaderDependencies['getSeoBase']>(),
  handleEmployerLoaderError: vi.fn((error, returnTo, options) =>
    handleEmployerLoaderErrorUsing(refreshSession, error, returnTo, options),
  ),
} satisfies ApplicantsLoaderDependencies;
const jobsActions = {
  deleteJob: vi.fn<CompanyJobsViewActions['deleteJob']>(),
  publishJob: vi.fn<CompanyJobsViewActions['publishJob']>(),
  unpublishJob: vi.fn<CompanyJobsViewActions['unpublishJob']>(),
  invalidate: vi.fn(),
  navigateToEdit: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
} satisfies CompanyJobsViewActions;
const membersActions = {
  createCompanyInvite:
    vi.fn<CompanyMembersViewActions['createCompanyInvite']>(),
  leaveCompany: vi.fn<CompanyMembersViewActions['leaveCompany']>(),
  removeCompanyMember:
    vi.fn<CompanyMembersViewActions['removeCompanyMember']>(),
  revokeCompanyInvite:
    vi.fn<CompanyMembersViewActions['revokeCompanyInvite']>(),
  updateCompanyMemberRole:
    vi.fn<CompanyMembersViewActions['updateCompanyMemberRole']>(),
  invalidate: vi.fn(),
  navigateToDashboard: vi.fn(),
  navigateToMembers: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
} satisfies CompanyMembersViewActions;
const profileActions = {
  updateCompany: vi.fn<CompanyProfileViewActions['updateCompany']>(),
  uploadCompanyLogo: vi.fn<CompanyProfileViewActions['uploadCompanyLogo']>(),
  deleteCompany: vi.fn<CompanyProfileViewActions['deleteCompany']>(),
  invalidate: vi.fn(),
  navigateToDashboard: vi.fn(),
  toastSuccess: vi.fn(),
} satisfies CompanyProfileViewActions;

const draftJob = {
  id: 'job-1',
  object: 'employer_job',
  title: 'Senior Product Designer',
  slug: 'senior-product-designer',
  status: 'draft',
  companyId: 'company-1',
  employmentType: 'full_time',
  remoteOption: 'hybrid',
  seniority: 'senior',
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  salaryTimeframe: null,
  isFeatured: false,
  publishedAt: null,
  expiresAt: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  links: { public: null },
} as const;

const company = {
  id: 'company-1',
  object: 'public_company',
  name: 'Northstar Labs',
  slug: 'northstar-labs',
  website: 'https://northstar.example',
  logoUrl: null,
  description: '<p>Building better hiring tools.</p>',
  jobCount: 1,
  publishedJobCount: 1,
  markets: [{ id: 'market-1', name: 'Hiring', slug: 'hiring' }],
  links: { public: 'https://jobs.example/companies/northstar-labs' },
};

// The editable `board.me.companies.retrieve` shape — unlike the public company,
// it carries the write-side fields the form prefills (summary + social URLs).
const employerCompany = {
  id: 'company-1',
  object: 'employer_company',
  name: 'Northstar Labs',
  slug: 'northstar-labs',
  website: 'https://northstar.example',
  description: '<p>Building better hiring tools.</p>',
  summary: 'Hiring, humanely.',
  xUrl: null,
  linkedinUrl: 'https://linkedin.com/company/northstar',
  facebookUrl: null,
  logoUrl: null,
} satisfies CompanyProfileLoaderData['employerCompany'];

const profileLoaderData = {
  workspace: {
    slug: 'northstar-labs',
    membership: { role: 'admin' },
  },
  company,
  employerCompany,
  members: { data: [] },
} satisfies CompanyProfileViewData;

function renderProfile(data: CompanyProfileViewData = profileLoaderData) {
  render(<CompanyProfilePageView data={data} actions={profileActions} />);
}

type EmployerJobStat = {
  object: 'employer_job_stat';
  jobId: string;
  views: number;
  applyClicks: number;
  applications: number | null;
};
type EmployerJobStatsPoint = {
  object: 'employer_job_stats_point';
  date: string;
  views: number;
  applyClicks: number;
};
type EmployerJob = CompanyJobsViewData['jobs']['data'][number];

function jobsLoaderContext(search: { reauth?: string }) {
  return {
    params: { slug: 'northstar-labs' },
    location: { search },
  } satisfies Parameters<ReturnType<typeof createCompanyJobsLoader>>[0];
}

function applicantsLoaderContext() {
  return {
    params: { slug: 'northstar-labs', jobId: 'job-1' },
    location: { search: {} },
  } satisfies Parameters<ReturnType<typeof createApplicantsLoader>>[0];
}

async function renderWithRouter(element: ReactNode) {
  const rootRoute = createRootRoute();
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => element,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([pageRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
}

// The jobs page defers its stats via <Await> (per-row stat cells + the chart),
// so the render must flush the resolved promises inside an async act — a bare
// sync render would leave suspense pending and trip the strict console guard.
async function renderJobs(
  jobs: EmployerJob[],
  deferred: {
    stats?: EmployerJobStat[];
    timeseries?: EmployerJobStatsPoint[];
  } = {},
) {
  const statsIndex = Promise.resolve(
    new Map((deferred.stats ?? []).map((stat) => [stat.jobId, stat])),
  );
  const timeseries = Promise.resolve(deferred.timeseries ?? []);
  const data = {
    slug: 'northstar-labs',
    membership: { company: { name: 'Northstar Labs' } },
    jobs: { data: jobs },
    statsIndex,
    timeseries,
  } satisfies CompanyJobsViewData;
  await act(async () => {
    await renderWithRouter(
      <CompanyJobsPageView data={data} actions={jobsActions} />,
    );
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  jobsActions.invalidate.mockResolvedValue(undefined);
  jobsActions.navigateToEdit.mockResolvedValue(undefined);
  membersActions.invalidate.mockResolvedValue(undefined);
  membersActions.navigateToDashboard.mockResolvedValue(undefined);
  membersActions.navigateToMembers.mockResolvedValue(undefined);
  profileActions.invalidate.mockResolvedValue(undefined);
  profileActions.navigateToDashboard.mockResolvedValue(undefined);
  pipelineActions.invalidate.mockResolvedValue(undefined);
});

beforeEach(() => {
  jobsLoaderDependencies.getSeoBase.mockResolvedValue({
    boardName: 'Acme Board',
  });
  applicantsLoaderDependencies.getSeoBase.mockResolvedValue({
    boardName: 'Acme Board',
  });
  refreshSession.mockResolvedValue({ ok: false });
  // Deferred reporting reads default to empty envelopes; individual tests
  // override them to exercise the join and the chart.
  jobsLoaderDependencies.getEmployerJobStats.mockResolvedValue({
    data: [],
  });
  jobsLoaderDependencies.getEmployerJobStatsTimeseries.mockResolvedValue({
    data: [],
  });
  // The applicants loader gates on the native-applications feature flag;
  // default it on so the existing pipeline tests exercise the API path.
  applicantsLoaderDependencies.getBoardContext.mockResolvedValue({
    features: { nativeApplications: true },
  });
});

describe('employer company workspace', () => {
  it('lets every shell-owning employer workspace route own the document main', () => {
    expect(JobsRoute.options.staticData).toMatchObject({ ownsMain: true });
    expect(ProfileRoute.options.staticData).toMatchObject({ ownsMain: true });
    expect(MembersRoute.options.staticData).toMatchObject({ ownsMain: true });
    expect(ApplicantsRoute.options.staticData).toMatchObject({
      ownsMain: true,
    });
  });

  it('recovers a transient auth failure with a refresh instead of sign-in', async () => {
    jobsLoaderDependencies.getCompanyWorkspace.mockRejectedValue(
      new BoardApiError({
        status: 401,
        code: 'auth_unauthorized',
        message: 'Session expired',
        raw: {},
      }),
    );
    refreshSession.mockResolvedValue({ ok: true });
    let result: unknown;
    try {
      result = await createCompanyJobsLoader(jobsLoaderDependencies)(
        jobsLoaderContext({}),
      );
    } catch (error) {
      result = error;
    }

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    // A successful refresh reloads the same page (bounded by ?reauth=1).
    expect(result.options.href).toBe(
      '/employers/companies/northstar-labs?reauth=1',
    );
  });

  it('falls through to sign-in once the refresh cannot recover', async () => {
    jobsLoaderDependencies.getCompanyWorkspace.mockRejectedValue(
      new BoardApiError({
        status: 401,
        code: 'auth_unauthorized',
        message: 'Session expired',
        raw: {},
      }),
    );
    refreshSession.mockResolvedValue({ ok: false });
    let result: unknown;
    try {
      result = await createCompanyJobsLoader(jobsLoaderDependencies)(
        jobsLoaderContext({}),
      );
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options).toMatchObject({
      to: '/auth/sign-in',
      search: { returnTo: '/employers/companies/northstar-labs' },
    });
  });

  it('does not refresh again on the retried load, going straight to sign-in', async () => {
    jobsLoaderDependencies.getCompanyWorkspace.mockRejectedValue(
      new BoardApiError({
        status: 401,
        code: 'auth_unauthorized',
        message: 'Session expired',
        raw: {},
      }),
    );
    refreshSession.mockResolvedValue({ ok: true });
    let result: unknown;
    try {
      result = await createCompanyJobsLoader(jobsLoaderDependencies)(
        jobsLoaderContext({ reauth: '1' }),
      );
    } catch (error) {
      result = error;
    }

    expect(refreshSession).not.toHaveBeenCalled();
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options).toMatchObject({ to: '/auth/sign-in' });
  });

  it('keeps forbidden company workspace errors distinct from authentication', async () => {
    applicantsLoaderDependencies.getPipeline.mockRejectedValue(
      new BoardApiError({
        status: 403,
        code: 'auth_forbidden',
        message: 'Not a company member',
        raw: {},
      }),
    );
    await expect(
      createApplicantsLoader(applicantsLoaderDependencies)(
        applicantsLoaderContext(),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('degrades the applicants pipeline to not-found when native applications are off', async () => {
    applicantsLoaderDependencies.getBoardContext.mockResolvedValue({
      features: { nativeApplications: false },
    });
    let outcome: unknown;
    try {
      await createApplicantsLoader(applicantsLoaderDependencies)(
        applicantsLoaderContext(),
      );
    } catch (error) {
      outcome = error;
    }

    expect(isRouteNotFound(outcome)).toBe(true);
    // The API pipeline read is never attempted — the feature does not exist.
    expect(applicantsLoaderDependencies.getPipeline).not.toHaveBeenCalled();
  });

  it('titles the jobs list with the company name and its active-job count', async () => {
    await renderJobs([
      { ...draftJob, id: 'a', status: 'published', publishedAt: '2026-07-01' },
      { ...draftJob, id: 'b', status: 'published', publishedAt: '2026-07-02' },
      { ...draftJob, id: 'c', status: 'draft' },
    ]);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Northstar Labs Jobs' }),
    ).toBeInTheDocument();
    expect(screen.getByText('You have 2 active jobs.')).toBeInTheDocument();
  });

  it('links every role name to its edit page and hides applicants for drafts', async () => {
    await renderJobs([draftJob]);

    const roleLink = screen.getByRole('link', {
      name: 'Senior Product Designer',
    });
    expect(roleLink).toHaveAttribute(
      'href',
      '/employers/companies/northstar-labs/jobs/job-1/edit',
    );
    // Publish is no longer a standalone pill — it lives only in the menu.
    expect(
      screen.queryByRole('link', { name: 'Publish' }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Actions for Senior Product Designer',
      }),
    );
    // A draft's Publish menu item lands on the edit page (plan picker + pay).
    expect(screen.getByRole('menuitem', { name: 'Publish' })).toHaveAttribute(
      'href',
      '/employers/companies/northstar-labs/jobs/job-1/edit',
    );
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'Applicants' }),
    ).not.toBeInTheDocument();
  });

  it('joins per-job view / apply-click / application stats into the table', async () => {
    await renderJobs(
      [
        {
          ...draftJob,
          id: 'job-live',
          status: 'published',
          publishedAt: '2026-07-01',
        },
      ],
      {
        stats: [
          {
            object: 'employer_job_stat',
            jobId: 'job-live',
            views: 1234,
            applyClicks: 56,
            applications: 7,
          },
        ],
      },
    );

    // Column headers exist immediately (table paints before stats stream in).
    expect(
      screen.getByRole('columnheader', { name: 'Views' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Apply clicks' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Applications' }),
    ).toBeInTheDocument();

    // The joined figures fill in once the deferred stats resolve, formatted.
    expect(await screen.findByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('56')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders the not-applicable dash for an external-apply job, never a zero', async () => {
    await renderJobs(
      [
        {
          ...draftJob,
          id: 'job-external',
          status: 'published',
          publishedAt: '2026-07-01',
        },
      ],
      {
        stats: [
          {
            object: 'employer_job_stat',
            jobId: 'job-external',
            views: 40,
            applyClicks: 5,
            applications: null,
          },
        ],
      },
    );

    // Views/clicks still show their numbers…
    expect(await screen.findByText('40')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    // …but a null application count reads as the dash + an accessible label,
    // and is never coerced to 0.
    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('still renders the jobs table when the stats read degrades', async () => {
    // A rejected deferred stats promise (the loader catch → empty Map) must not
    // take the table down: the rows render, the stat cells resolve to dashes.
    const data = {
      slug: 'northstar-labs',
      membership: { company: { name: 'Northstar Labs' } },
      jobs: {
        data: [
          {
            ...draftJob,
            id: 'job-live',
            status: 'published',
            publishedAt: '2026-07-01',
          },
        ],
      },
      statsIndex: Promise.resolve(new Map()),
      timeseries: Promise.resolve([]),
    } satisfies CompanyJobsViewData;
    await act(async () => {
      await renderWithRouter(
        <CompanyJobsPageView data={data} actions={jobsActions} />,
      );
    });

    expect(
      screen.getByRole('link', { name: 'Senior Product Designer' }),
    ).toBeInTheDocument();
    // No stats row for the job → dashes, resolved after the empty Map settles.
    expect(await screen.findAllByText('—')).not.toHaveLength(0);
  });

  it('renders the reporting chart with data and its empty state on all-zero', async () => {
    const publishedJob = {
      ...draftJob,
      id: 'job-live',
      status: 'published',
      publishedAt: '2026-07-01',
    } satisfies EmployerJob;

    // All-zero window → the honest empty panel, not a chart on a broken axis.
    await renderJobs([publishedJob], {
      timeseries: [
        {
          object: 'employer_job_stats_point',
          date: '2026-07-01',
          views: 0,
          applyClicks: 0,
        },
        {
          object: 'employer_job_stats_point',
          date: '2026-07-02',
          views: 0,
          applyClicks: 0,
        },
      ],
    });
    expect(await screen.findByText('No activity yet')).toBeInTheDocument();
    cleanup();

    // Real activity → the chart renders (its accessible label is present).
    await renderJobs([publishedJob], {
      timeseries: [
        {
          object: 'employer_job_stats_point',
          date: '2026-07-01',
          views: 12,
          applyClicks: 3,
        },
        {
          object: 'employer_job_stats_point',
          date: '2026-07-02',
          views: 18,
          applyClicks: 5,
        },
      ],
    });
    expect(
      await screen.findByRole('img', {
        name: 'Daily views and apply clicks over the last 30 days',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('No activity yet')).not.toBeInTheDocument();
  });

  it('shows a distinct Expired chip and flips the date to the expiry', async () => {
    await renderJobs([
      {
        ...draftJob,
        status: 'published',
        publishedAt: '2026-06-01T00:00:00.000Z',
        expiresAt: '2026-07-01T00:00:00.000Z',
      },
    ]);
    // Past its expiry, the published masquerade is replaced by an Expired chip.
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getByText(/Expired on/)).toBeInTheDocument();
    expect(screen.queryByText(/^Posted/)).not.toBeInTheDocument();
  });

  it('republishes an entitled job in place and toasts', async () => {
    jobsActions.publishJob.mockResolvedValue({ ok: true, data: {} });
    await renderJobs([
      {
        ...draftJob,
        status: 'expired',
        expiresAt: '2026-07-01T00:00:00.000Z',
      },
    ]);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Actions for Senior Product Designer',
      }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Republish' }));

    await waitFor(() =>
      expect(jobsActions.publishJob).toHaveBeenCalledTimes(1),
    );
    expect(jobsActions.toastSuccess).toHaveBeenCalledTimes(1);
    expect(jobsActions.navigateToEdit).not.toHaveBeenCalled();
  });

  it('routes an unentitled republish to the edit/pay page', async () => {
    jobsActions.publishJob.mockResolvedValue({
      ok: false,
      message: 'Payment required',
    });
    await renderJobs([
      {
        ...draftJob,
        status: 'expired',
        expiresAt: '2026-07-01T00:00:00.000Z',
      },
    ]);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Actions for Senior Product Designer',
      }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Republish' }));

    await waitFor(() =>
      expect(jobsActions.navigateToEdit).toHaveBeenCalledWith(
        'northstar-labs',
        'job-1',
      ),
    );
    expect(jobsActions.toastSuccess).not.toHaveBeenCalled();
  });

  it('keeps the company profile editable in place with the public link visible', () => {
    renderProfile();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Company profile' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /View public page/ }),
    ).toHaveAttribute('href', 'https://jobs.example/companies/northstar-labs');
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(
      'Northstar Labs',
    );
    expect(screen.getByRole('textbox', { name: 'Website' })).toHaveValue(
      'northstar.example',
    );
    // The three per-network social fields sit behind their domain addons.
    expect(screen.getByText('linkedin.com/company/')).toBeInTheDocument();
    expect(screen.getByText('x.com/')).toBeInTheDocument();
    expect(screen.getByText('facebook.com/')).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByText('Hiring')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save company' })).toBeEnabled();
  });

  it('auto-strips a pasted social URL down to the handle', () => {
    renderProfile();

    const linkedin = screen.getByRole('textbox', { name: 'LinkedIn' });
    fireEvent.change(linkedin, {
      target: { value: 'https://www.linkedin.com/company/northstar' },
    });
    expect(linkedin).toHaveValue('northstar');
  });

  it('prefills the tagline and social fields from the editable company read', () => {
    renderProfile();

    // The tagline is no longer a write-only blank — it round-trips from
    // `summary`, so the field carries the stored value on load.
    expect(screen.getByRole('textbox', { name: 'Tagline' })).toHaveValue(
      'Hiring, humanely.',
    );
    // A stored social URL prefills as the bare handle behind its domain addon.
    expect(screen.getByRole('textbox', { name: 'LinkedIn' })).toHaveValue(
      'northstar',
    );
  });

  it('uploads a new company logo through the profile logo control', async () => {
    profileActions.uploadCompanyLogo.mockResolvedValue({
      ...employerCompany,
      logoUrl: 'https://cdn.example/logo.png',
    });
    renderProfile();

    // The upload control is present now (no more "not available here yet").
    expect(
      screen.getByRole('button', { name: 'Change logo' }),
    ).toBeInTheDocument();

    const input = document.querySelector<HTMLInputElement>(
      '[data-test="logo-file-input"]',
    );
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('The logo control must render a file input');
    }
    const file = new File(['logo-bytes'], 'logo.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(profileActions.uploadCompanyLogo).toHaveBeenCalledTimes(1);
    const firstCall = profileActions.uploadCompanyLogo.mock.calls[0];
    if (!firstCall) throw new Error('Expected a logo upload call');
    const uploadInput = firstCall[0];
    if (!uploadInput) throw new Error('Expected logo upload input');
    const formData = uploadInput.data;
    if (!(formData instanceof FormData)) {
      throw new Error('The logo upload boundary requires FormData');
    }
    expect(formData.get('slug')).toBe('northstar-labs');
    expect(formData.get('logo')).toBe(file);
    await waitFor(() => expect(profileActions.invalidate).toHaveBeenCalled());
  });

  it('streams the profile-views stat into the header once the deferred read resolves', async () => {
    const data = {
      ...profileLoaderData,
      profileViews: Promise.resolve({
        total: 1204,
        points: [
          {
            object: 'employer_profile_views_point',
            date: '2026-07-01',
            views: 4,
          },
          {
            object: 'employer_profile_views_point',
            date: '2026-07-02',
            views: 8,
          },
        ],
      }),
    } satisfies CompanyProfileViewData;
    // The deferred stat suspends via <Await>; await the render so the resolved
    // promise flushes inside act (the strict setup rejects un-awaited suspense).
    await act(async () => {
      renderProfile(data);
    });

    expect(
      screen.getByText('Profile views · last 30 days'),
    ).toBeInTheDocument();
    // 'en-AU' locale (from the mocked root loader) groups thousands with commas.
    expect(screen.getByText('1,204')).toBeInTheDocument();
  });

  it('shows the honest zero state when the company has no profile views yet', async () => {
    const data = {
      ...profileLoaderData,
      profileViews: Promise.resolve({ total: 0, points: [] }),
    } satisfies CompanyProfileViewData;
    await act(async () => {
      renderProfile(data);
    });

    expect(screen.getByText('No views yet')).toBeInTheDocument();
  });

  it('renders the applicant pipeline as a kanban board with cards in their stage column', () => {
    const pipeline = {
      object: 'employer_pipeline',
      job: {
        id: 'job-1',
        title: 'Senior Product Designer',
        status: 'published',
        expiresAt: null,
      },
      stages: [
        {
          id: 'stage-review',
          object: 'employer_pipeline_stage',
          jobId: 'job-1',
          label: 'Review',
          systemStage: 'review',
          isProtected: true,
          hidden: false,
          position: 0,
        },
        {
          id: 'stage-interview',
          object: 'employer_pipeline_stage',
          jobId: 'job-1',
          label: 'Interview',
          systemStage: null,
          isProtected: false,
          hidden: false,
          position: 1,
        },
      ],
      applicants: [
        {
          id: 'application-1',
          object: 'employer_applicant',
          jobId: 'job-1',
          candidateBoardUserId: 'candidate-1',
          candidateProfileId: 'profile-1',
          candidateProfileHandle: 'ada',
          candidateName: 'Ada Lovelace',
          candidateEmail: 'ada@example.com',
          candidateHeadline: 'Product designer',
          candidateLocation: 'Sydney',
          coverNote: 'I care deeply about accessible products.',
          resumeFilename: 'ada.pdf',
          resumeUrl: 'https://files.example/ada.pdf',
          stage: 'review',
          source: 'native_apply',
          appliedAt: '2026-07-13T00:00:00.000Z',
          timeline: [],
        },
      ],
      seo: {
        boardName: 'Acme Board',
      },
    } satisfies Parameters<typeof ApplicantsPageView>[0]['pipeline'];

    render(
      <ApplicantsPageView
        slug="northstar-labs"
        pipeline={pipeline}
        actions={pipelineActions}
      />,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Senior Product Designer',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Published · 1 applicant/)).toBeInTheDocument();
    // Each visible stage is a column; the Review column carries the card.
    expect(
      screen.getByRole('heading', { level: 3, name: 'Review' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Interview' }),
    ).toBeInTheDocument();
    const reviewColumn = screen.getByRole('grid', {
      name: 'Review applicants',
    });
    expect(within(reviewColumn).getByText('Ada Lovelace')).toBeInTheDocument();
    expect(within(reviewColumn).getByText(/Applied/)).toBeInTheDocument();
  });

  function reviewBoardVM(): PipelineBoardVM {
    return {
      stages: [
        {
          id: 'stage-review',
          label: 'Review',
          systemStage: 'review',
          isProtected: true,
        },
      ],
      cards: [
        {
          id: 'application-1',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          headline: null,
          initials: 'AL',
          appliedLabel: 'Applied 13 Jul 2026',
          coverNote: null,
          resumeUrl: null,
          resumeFilename: null,
          columnStageId: 'stage-review',
          timeline: [{ id: 'event-1', text: 'Note: Strong portfolio' }],
        },
      ],
    };
  }

  it('surfaces stage picker, note field, and activity in the card detail sheet', () => {
    render(
      <ApplicantPipelineBoard
        slug="northstar-labs"
        jobId="job-1"
        actions={pipelineActions}
        board={reviewBoardVM()}
        defaultOpenCardId="application-1"
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Stage' })).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Add a private note' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Note: Strong portfolio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });

  it('keeps a failed stage rename open and reports the error in the dialog', async () => {
    pipelineActions.renameStage.mockResolvedValue({
      ok: false,
      message: 'Rename failed',
    });

    render(
      <ApplicantPipelineBoard
        slug="northstar-labs"
        jobId="job-1"
        actions={pipelineActions}
        board={{
          stages: [
            {
              id: 'stage-custom',
              label: 'Portfolio review',
              systemStage: null,
              isProtected: false,
            },
          ],
          cards: [],
        }}
        defaultStageDialog={{
          kind: 'rename',
          stage: {
            id: 'stage-custom',
            label: 'Portfolio review',
            systemStage: null,
            isProtected: false,
          },
        }}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Stage name' });
    expect(input).toHaveValue('Portfolio review');
    fireEvent.change(input, { target: { value: 'Interview' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Rename failed');
    expect(screen.getByRole('textbox', { name: 'Stage name' })).toHaveValue(
      'Interview',
    );
    expect(pipelineActions.invalidate).not.toHaveBeenCalled();
  });

  it('reports a failed reject in the detail sheet action area', async () => {
    pipelineActions.bulkRejectApplicants.mockResolvedValue({
      ok: false,
      message: 'Reject failed',
    });

    render(
      <ApplicantPipelineBoard
        slug="northstar-labs"
        jobId="job-1"
        actions={pipelineActions}
        board={reviewBoardVM()}
        defaultOpenCardId="application-1"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Reject failed');
    expect(alert.closest('[data-applicant-action-feedback]')).not.toBeNull();
    expect(pipelineActions.invalidate).not.toHaveBeenCalled();
  });

  it('moves a card optimistically through the detail sheet stage picker', async () => {
    // Hold the move in-flight so the optimistic column placement is observable
    // (a resolved move + mocked invalidate would settle back to the static prop).
    let resolveMove!: (value: { ok: true; data: null }) => void;
    pipelineActions.moveApplicant.mockReturnValue(
      new Promise((resolve) => {
        resolveMove = resolve;
      }),
    );

    render(
      <ApplicantPipelineBoard
        slug="northstar-labs"
        jobId="job-1"
        actions={pipelineActions}
        board={{
          stages: [
            {
              id: 'stage-review',
              label: 'Review',
              systemStage: 'review',
              isProtected: true,
            },
            {
              id: 'stage-interview',
              label: 'Interview',
              systemStage: null,
              isProtected: false,
            },
          ],
          cards: [
            {
              id: 'application-1',
              name: 'Ada Lovelace',
              email: 'ada@example.com',
              headline: null,
              initials: 'AL',
              appliedLabel: null,
              coverNote: null,
              resumeUrl: null,
              resumeFilename: null,
              columnStageId: 'stage-review',
              timeline: [],
            },
          ],
        }}
        defaultOpenCardId="application-1"
      />,
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'Stage' }));
    const interviewOption = await screen.findByRole('option', {
      name: 'Interview',
    });
    fireEvent.pointerDown(interviewOption, { pointerType: 'mouse' });
    fireEvent.click(interviewOption);

    await waitFor(() =>
      expect(pipelineActions.moveApplicant).toHaveBeenCalledWith({
        data: {
          slug: 'northstar-labs',
          applicationId: 'application-1',
          stageId: 'stage-interview',
        },
      }),
    );
    // Optimistic: the stage picker adopts Interview immediately (the card's
    // resolved column follows the same override) while the move is in flight.
    expect(screen.getByRole('combobox', { name: 'Stage' })).toHaveTextContent(
      'Interview',
    );

    // Settle the move; the loader invalidation is what refetches truth.
    await act(async () => {
      resolveMove({ ok: true, data: null });
    });
    await waitFor(() => expect(pipelineActions.invalidate).toHaveBeenCalled());
  });

  const memberAda = {
    id: 'member-ada',
    object: 'company_member' as const,
    boardUserId: 'user-ada',
    displayName: 'Ada Lovelace',
    email: 'ada@northstar.example',
    role: 'admin' as const,
    approvedBy: 'owner_creation',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const memberGrace = {
    id: 'member-grace',
    object: 'company_member' as const,
    boardUserId: 'user-grace',
    displayName: 'Grace Hopper',
    email: 'grace@northstar.example',
    role: 'member' as const,
    approvedBy: 'domain_match',
    createdAt: '2026-02-01T00:00:00.000Z',
  };

  const membersLoaderData = {
    workspace: {
      slug: 'northstar-labs',
      membership: { role: 'admin', company },
    },
    members: { data: [memberAda, memberGrace] },
    invites: { data: [] },
    user: { id: 'user-ada' },
    joined: false,
  } satisfies CompanyMembersViewData;

  function renderMembers(data: CompanyMembersViewData = membersLoaderData) {
    render(<CompanyMembersPageView data={data} actions={membersActions} />);
  }

  it('lets admins remove members and surfaces last_admin inline', async () => {
    membersActions.removeCompanyMember.mockResolvedValue({
      ok: false,
      code: 'last_admin',
      message: 'last admin',
    });
    renderMembers({
      ...membersLoaderData,
      members: {
        data: [memberAda, { ...memberGrace, role: 'admin' as const }],
      },
    });

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('grace@northstar.example')).toBeInTheDocument();
    expect(screen.queryByText(m.employerMembers_joinedViaColumn())).toBeNull();
    expect(
      screen.queryByText(m.employerMembers_joinedViaDomainMatch()),
    ).toBeNull();
    expect(
      screen.getAllByRole('combobox', {
        name: m.employerMembers_roleColumn(),
      }),
    ).toHaveLength(2);

    fireEvent.click(
      screen.getByRole('button', {
        name: m.employerMembers_removeAriaLabel({ name: 'Grace Hopper' }),
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: m.employerMembers_removeConfirmLabel(),
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.employerMembers_lastAdminError(),
    );
    expect(membersActions.removeCompanyMember).toHaveBeenCalledWith({
      data: {
        slug: 'northstar-labs',
        memberId: 'member-grace',
      },
    });
  });

  it('lets members leave and surfaces last_admin in the leave dialog', async () => {
    membersActions.leaveCompany.mockResolvedValue({
      ok: false,
      code: 'last_admin',
      message: 'last admin',
    });
    // Two admins: the viewer is not the sole admin, so the button is
    // enabled and the inline error covers the race where the other
    // admin was demoted after this page loaded.
    renderMembers({
      ...membersLoaderData,
      members: {
        data: [memberAda, { ...memberGrace, role: 'admin' as const }],
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: m.employerMembers_leaveAriaLabel({
          company: company.name,
        }),
      }),
    );
    expect(
      screen.getByText(
        m.employerMembers_leaveDialogTitle({ company: company.name }),
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: m.employerMembers_leaveConfirmLabel(),
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.employerMembers_leaveLastAdminError(),
    );
    expect(membersActions.leaveCompany).toHaveBeenCalledWith({
      data: { slug: 'northstar-labs' },
    });
  });

  it('disables leave with a tooltip reason for the sole admin', () => {
    renderMembers();

    expect(
      screen.getByRole('button', {
        name: m.employerMembers_leaveAriaLabel({ company: company.name }),
      }),
    ).toBeDisabled();
  });

  it('renders member roles read-only for non-admins', () => {
    renderMembers({
      ...membersLoaderData,
      workspace: {
        ...membersLoaderData.workspace,
        slug: 'northstar-labs',
        membership: { role: 'member', company },
      },
      user: { id: 'user-grace' },
    });

    expect(
      screen.queryByRole('combobox', {
        name: m.employerMembers_roleColumn(),
      }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', {
        name: m.employerMembers_removeAriaLabel({ name: 'Ada Lovelace' }),
      }),
    ).toBeNull();
    expect(screen.getByText(m.employerMembers_roleAdmin())).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: m.employerMembers_inviteLabel() }),
    ).toBeNull();
    expect(
      screen.getByRole('button', {
        name: m.employerMembers_leaveAriaLabel({
          company: company.name,
        }),
      }),
    ).toBeInTheDocument();
  });

  it('matches the jobs-page header: company heading, plural subtitle, admin invite CTA', () => {
    renderMembers();

    expect(
      screen.getByRole('heading', {
        name: m.employerMembers_companyHeading({ company: company.name }),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(m.employerMembers_countMany({ count: '2' })),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: m.employerMembers_inviteLabel() }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: m.employerMembers_leaveAriaLabel({
          company: company.name,
        }),
      }),
    ).toBeInTheDocument();
  });

  it('opens the invite dialog, surfaces already_member inline, and sends an invite', async () => {
    membersActions.createCompanyInvite
      .mockResolvedValueOnce({
        ok: false,
        code: 'already_member',
        message: 'already a member',
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          id: 'inv-1',
          object: 'company_member_invite',
          email: 'pat@northstar.example',
          createdAt: '2026-03-01T00:00:00.000Z',
          expiresAt: '2026-03-08T00:00:00.000Z',
        },
      });
    renderMembers({
      ...membersLoaderData,
      members: { data: [memberAda] },
    });

    fireEvent.click(
      screen.getByRole('button', { name: m.employerMembers_inviteLabel() }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: m.employerMembers_inviteDialogTitle(),
    });
    expect(dialog).toHaveAccessibleDescription(
      m.employerMembers_inviteDialogDescription(),
    );

    fireEvent.change(
      screen.getByLabelText(m.employerMembers_inviteEmailLabel()),
      {
        target: { value: 'ada@northstar.example' },
      },
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: m.employerMembers_inviteSubmitLabel(),
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.employerMembers_alreadyMemberError(),
    );

    fireEvent.change(
      screen.getByLabelText(m.employerMembers_inviteEmailLabel()),
      {
        target: { value: 'pat@northstar.example' },
      },
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: m.employerMembers_inviteSubmitLabel(),
      }),
    );

    await waitFor(() =>
      expect(membersActions.createCompanyInvite).toHaveBeenCalledWith({
        data: {
          slug: 'northstar-labs',
          body: { email: 'pat@northstar.example' },
        },
      }),
    );
    await waitFor(() => expect(membersActions.invalidate).toHaveBeenCalled());
    expect(membersActions.toastSuccess).toHaveBeenCalledWith(
      m.employerMembers_inviteSentToast(),
    );
  });

  it('shows pending invites to members and lets admins revoke', async () => {
    const pendingInvite = {
      id: 'inv-1',
      object: 'company_member_invite' as const,
      email: 'pat@northstar.example',
      createdAt: '2026-03-01T00:00:00.000Z',
      expiresAt: '2026-03-08T00:00:00.000Z',
    };
    membersActions.revokeCompanyInvite.mockResolvedValue({
      ok: true,
      data: null,
    });
    const memberView = {
      ...membersLoaderData,
      workspace: {
        ...membersLoaderData.workspace,
        slug: 'northstar-labs',
        membership: { role: 'member', company },
      },
      invites: { data: [pendingInvite] },
      user: { id: 'user-grace' },
    } satisfies CompanyMembersViewData;
    const { unmount } = render(
      <CompanyMembersPageView data={memberView} actions={membersActions} />,
    );

    expect(screen.getByText('pat@northstar.example')).toBeInTheDocument();
    expect(
      screen.getByText(m.employerMembers_invitedColumn()),
    ).toBeInTheDocument();
    // The expiry lives in a tooltip on the Invited badge now, not a
    // footer note.
    expect(
      screen.queryByText(m.employerMembers_pendingDescription()),
    ).toBeNull();
    expect(screen.queryByText(m.employerMembers_pendingHeading())).toBeNull();
    expect(
      screen.queryByRole('button', {
        name: m.employerMembers_revokeAriaLabel({
          email: 'pat@northstar.example',
        }),
      }),
    ).toBeNull();
    unmount();

    renderMembers({
      ...membersLoaderData,
      invites: { data: [pendingInvite] },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: m.employerMembers_revokeAriaLabel({
          email: 'pat@northstar.example',
        }),
      }),
    );
    await waitFor(() =>
      expect(membersActions.revokeCompanyInvite).toHaveBeenCalledWith({
        data: { slug: 'northstar-labs', inviteId: 'inv-1' },
      }),
    );
  });

  it('does not render a Joined via column for invite or unknown provenance', () => {
    renderMembers({
      ...membersLoaderData,
      members: {
        data: [
          { ...memberGrace, approvedBy: 'invite' },
          { ...memberAda, approvedBy: null },
        ],
      },
    });

    expect(screen.queryByText(m.employerMembers_joinedViaColumn())).toBeNull();
    expect(screen.queryByText(m.employerMembers_joinedViaInvite())).toBeNull();
    expect(screen.queryByText(m.employerMembers_joinedViaUnknown())).toBeNull();
    expect(screen.queryByText('Unknown')).toBeNull();
  });

  it('disables company delete for non-admins and deletes after typed confirmation', async () => {
    const memberProfile = {
      ...profileLoaderData,
      workspace: {
        ...profileLoaderData.workspace,
        slug: 'northstar-labs',
        membership: { role: 'member' },
      },
      members: { data: [memberAda] },
    } satisfies CompanyProfileViewData;
    const { unmount } = render(
      <CompanyProfilePageView data={memberProfile} actions={profileActions} />,
    );

    expect(
      screen.getByRole('button', { name: m.employerDelete_submitLabel() }),
    ).toBeDisabled();
    expect(
      screen.getByText(m.employerDelete_notAdminText()),
    ).toBeInTheDocument();
    unmount();

    profileActions.deleteCompany.mockResolvedValue({ ok: true, data: null });
    renderProfile({
      ...profileLoaderData,
      members: { data: [memberAda] },
    });

    fireEvent.click(
      screen.getByRole('button', { name: m.employerDelete_submitLabel() }),
    );
    fireEvent.change(
      screen.getByLabelText(
        m.dangerZone_confirmLabel({ word: m.dangerZone_confirmWord() }),
      ),
      { target: { value: m.dangerZone_confirmWord() } },
    );
    const confirmButtons = screen.getAllByRole('button', {
      name: m.employerDelete_confirmButton(),
    });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]!);

    await waitFor(() =>
      expect(profileActions.deleteCompany).toHaveBeenCalledWith({
        data: { slug: 'northstar-labs' },
      }),
    );
    expect(profileActions.navigateToDashboard).toHaveBeenCalledOnce();
  });
});
