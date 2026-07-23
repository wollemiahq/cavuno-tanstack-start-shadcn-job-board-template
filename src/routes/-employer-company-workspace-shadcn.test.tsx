// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { BoardApiError } from '@cavuno/board';
import {
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

const mocks = vi.hoisted(() => ({
  addApplicantNote: vi.fn(),
  bulkRejectApplicants: vi.fn(),
  checkoutJob: vi.fn(),
  createJob: vi.fn(),
  createStage: vi.fn(),
  deleteJob: vi.fn(),
  getCompanyWorkspace: vi.fn(),
  getEmployerCompany: vi.fn(),
  uploadCompanyLogo: vi.fn(),
  getEmployerJobStats: vi.fn(),
  getEmployerJobStatsTimeseries: vi.fn(),
  getEmployerProfileStats: vi.fn(),
  getEmployerProfileStatsTimeseries: vi.fn(),
  getCompany: vi.fn(),
  getJob: vi.fn(),
  getSeoBase: vi.fn(),
  getBoardContext: vi.fn(),
  getPipeline: vi.fn(),
  invalidate: vi.fn(),
  moveApplicant: vi.fn(),
  navigate: vi.fn(),
  publishJob: vi.fn(),
  refreshSession: vi.fn(),
  removeStage: vi.fn(),
  renameStage: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  unpublishJob: vi.fn(),
  updateCompany: vi.fn(),
  updateJob: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
  Toaster: () => null,
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  const React = await import('react');

  return {
    ...actual,
    getRouteApi: () => ({
      useLoaderData: () => ({
        board: { language: 'en-AU', labels: undefined },
      }),
    }),
    Link: ({
      children,
      params: _params,
      to,
      ...props
    }: {
      children: React.ReactNode;
      params?: Record<string, string>;
      to: string;
    } & React.ComponentProps<'a'>) =>
      React.createElement('a', { href: to, ...props }, children),
    useRouter: () => ({
      invalidate: mocks.invalidate,
      navigate: mocks.navigate,
    }),
  };
});

vi.mock('../server/employers', () => ({
  addApplicantNote: mocks.addApplicantNote,
  bulkRejectApplicants: mocks.bulkRejectApplicants,
  checkoutJob: mocks.checkoutJob,
  createJob: mocks.createJob,
  createStage: mocks.createStage,
  deleteJob: mocks.deleteJob,
  getCompanyWorkspace: mocks.getCompanyWorkspace,
  getEmployerCompany: mocks.getEmployerCompany,
  uploadCompanyLogo: mocks.uploadCompanyLogo,
  getEmployerJobStats: mocks.getEmployerJobStats,
  getEmployerJobStatsTimeseries: mocks.getEmployerJobStatsTimeseries,
  getEmployerProfileStats: mocks.getEmployerProfileStats,
  getEmployerProfileStatsTimeseries: mocks.getEmployerProfileStatsTimeseries,
  getJob: mocks.getJob,
  getPipeline: mocks.getPipeline,
  moveApplicant: mocks.moveApplicant,
  publishJob: mocks.publishJob,
  removeStage: mocks.removeStage,
  renameStage: mocks.renameStage,
  unpublishJob: mocks.unpublishJob,
  updateCompany: mocks.updateCompany,
  updateJob: mocks.updateJob,
}));

vi.mock('../server/auth', () => ({ refreshSession: mocks.refreshSession }));

vi.mock('../server/queries', () => ({
  getCompany: mocks.getCompany,
  getSeoBase: mocks.getSeoBase,
  getBoardContext: mocks.getBoardContext,
}));

import { ApplicantPipelineBoard } from '../components/employer/applicant-pipeline-board';
import { Route as JobsRoute } from './employers.companies.$slug.index';
import { Route as ApplicantsRoute } from './employers.companies.$slug.jobs.$jobId.applicants';
import { Route as ProfileRoute } from './employers.companies.$slug.profile';

import type { PipelineActions } from '../components/employer/applicant-pipeline-board';
import type { PipelineBoardVM } from '../board/pipeline-view-model';

// The board takes its mutations as a typed `actions` prop now; inject the same
// hoisted doubles the route would pass. (The `../server/employers` module mock
// above still covers the workspace routes imported in this file.)
const pipelineActions: PipelineActions = {
  moveApplicant: mocks.moveApplicant,
  bulkRejectApplicants: mocks.bulkRejectApplicants,
  addApplicantNote: mocks.addApplicantNote,
  createStage: mocks.createStage,
  renameStage: mocks.renameStage,
  removeStage: mocks.removeStage,
};

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
};

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

// The jobs page defers its stats via <Await> (per-row stat cells + the chart),
// so the render must flush the resolved promises inside an async act — a bare
// sync render would leave suspense pending and trip the strict console guard.
async function renderJobs(
  jobs: unknown[],
  deferred: {
    stats?: EmployerJobStat[];
    timeseries?: EmployerJobStatsPoint[];
  } = {},
) {
  const statsIndex = Promise.resolve(
    new Map((deferred.stats ?? []).map((stat) => [stat.jobId, stat])),
  );
  const timeseries = Promise.resolve(deferred.timeseries ?? []);
  vi.spyOn(JobsRoute, 'useLoaderData').mockReturnValue({
    slug: 'northstar-labs',
    membership: { company: { name: 'Northstar Labs' } },
    jobs: { data: jobs },
    billingOptions: { data: [] },
    plans: [],
    statsIndex,
    timeseries,
  } as never);
  const JobsPage = JobsRoute.options.component;
  if (!JobsPage) throw new Error('The jobs route must expose its component');
  await act(async () => {
    render(<JobsPage />);
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.invalidate.mockResolvedValue(undefined);
  mocks.navigate.mockResolvedValue(undefined);
});

beforeEach(() => {
  mocks.getSeoBase.mockResolvedValue({ boardName: 'Acme Board' });
  mocks.refreshSession.mockResolvedValue({ ok: false });
  // Deferred reporting reads default to empty envelopes; individual tests
  // override them to exercise the join and the chart.
  mocks.getEmployerJobStats.mockResolvedValue({ data: [] });
  mocks.getEmployerJobStatsTimeseries.mockResolvedValue({ data: [] });
  mocks.getEmployerProfileStats.mockResolvedValue({
    object: 'employer_profile_stats',
    profileViews: 0,
  });
  mocks.getEmployerProfileStatsTimeseries.mockResolvedValue({ data: [] });
  // The applicants loader gates on the native-applications feature flag;
  // default it on so the existing pipeline tests exercise the API path.
  mocks.getBoardContext.mockResolvedValue({
    features: { nativeApplications: true, messaging: true },
  });
});

describe('employer company workspace', () => {
  it('lets every shell-owning employer workspace route own the document main', () => {
    expect(JobsRoute.options.staticData).toMatchObject({ ownsMain: true });
    expect(ProfileRoute.options.staticData).toMatchObject({ ownsMain: true });
    expect(ApplicantsRoute.options.staticData).toMatchObject({
      ownsMain: true,
    });
  });

  it('recovers a transient auth failure with a refresh instead of sign-in', async () => {
    mocks.getCompanyWorkspace.mockRejectedValue(
      new BoardApiError({
        status: 401,
        code: 'auth_unauthorized',
        message: 'Session expired',
        raw: {},
      }),
    );
    mocks.refreshSession.mockResolvedValue({ ok: true });
    const loader = JobsRoute.options.loader;
    if (typeof loader !== 'function')
      throw new Error('The company jobs route needs a loader');

    let result: unknown;
    try {
      result = await loader({
        params: { slug: 'northstar-labs' },
        location: { search: {} },
      } as never);
    } catch (error) {
      result = error;
    }

    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    // A successful refresh reloads the same page (bounded by ?reauth=1).
    expect(result.options.href).toBe(
      '/employers/companies/northstar-labs?reauth=1',
    );
  });

  it('falls through to sign-in once the refresh cannot recover', async () => {
    mocks.getCompanyWorkspace.mockRejectedValue(
      new BoardApiError({
        status: 401,
        code: 'auth_unauthorized',
        message: 'Session expired',
        raw: {},
      }),
    );
    mocks.refreshSession.mockResolvedValue({ ok: false });
    const loader = JobsRoute.options.loader;
    if (typeof loader !== 'function')
      throw new Error('The company jobs route needs a loader');

    let result: unknown;
    try {
      result = await loader({
        params: { slug: 'northstar-labs' },
        location: { search: {} },
      } as never);
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
    mocks.getCompanyWorkspace.mockRejectedValue(
      new BoardApiError({
        status: 401,
        code: 'auth_unauthorized',
        message: 'Session expired',
        raw: {},
      }),
    );
    mocks.refreshSession.mockResolvedValue({ ok: true });
    const loader = JobsRoute.options.loader;
    if (typeof loader !== 'function') throw new Error('needs a loader');

    let result: unknown;
    try {
      result = await loader({
        params: { slug: 'northstar-labs' },
        location: { search: { reauth: '1' } },
      } as never);
    } catch (error) {
      result = error;
    }

    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options).toMatchObject({ to: '/auth/sign-in' });
  });

  it('keeps forbidden company workspace errors distinct from authentication', async () => {
    mocks.getPipeline.mockRejectedValue(
      new BoardApiError({
        status: 403,
        code: 'auth_forbidden',
        message: 'Not a company member',
        raw: {},
      }),
    );
    const loader = ApplicantsRoute.options.loader;
    if (typeof loader !== 'function')
      throw new Error('The applicants route needs a loader');

    await expect(
      loader({
        params: { slug: 'northstar-labs', jobId: 'job-1' },
        location: { search: {} },
      } as never),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('degrades the applicants pipeline to not-found when native applications are off', async () => {
    mocks.getBoardContext.mockResolvedValue({
      features: { nativeApplications: false, messaging: true },
    });
    const loader = ApplicantsRoute.options.loader;
    if (typeof loader !== 'function')
      throw new Error('The applicants route needs a loader');

    let outcome: unknown;
    try {
      await loader({
        params: { slug: 'northstar-labs', jobId: 'job-1' },
      } as never);
    } catch (error) {
      outcome = error;
    }

    expect(isRouteNotFound(outcome)).toBe(true);
    // The API pipeline read is never attempted — the feature does not exist.
    expect(mocks.getPipeline).not.toHaveBeenCalled();
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
      '/employers/companies/$slug/jobs/$jobId/edit',
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
      '/employers/companies/$slug/jobs/$jobId/edit',
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
    vi.spyOn(JobsRoute, 'useLoaderData').mockReturnValue({
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
      billingOptions: { data: [] },
      plans: [],
      statsIndex: Promise.resolve(new Map()),
      timeseries: Promise.resolve([]),
    } as never);
    const JobsPage = JobsRoute.options.component;
    if (!JobsPage) throw new Error('needs a component');
    await act(async () => {
      render(<JobsPage />);
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
    };

    // All-zero window → the honest empty panel, not a chart on a broken axis.
    await renderJobs([publishedJob], {
      timeseries: [
        { object: 'employer_job_stats_point', date: '2026-07-01', views: 0, applyClicks: 0 },
        { object: 'employer_job_stats_point', date: '2026-07-02', views: 0, applyClicks: 0 },
      ],
    });
    expect(await screen.findByText('No activity yet')).toBeInTheDocument();
    cleanup();

    // Real activity → the chart renders (its accessible label is present).
    await renderJobs([publishedJob], {
      timeseries: [
        { object: 'employer_job_stats_point', date: '2026-07-01', views: 12, applyClicks: 3 },
        { object: 'employer_job_stats_point', date: '2026-07-02', views: 18, applyClicks: 5 },
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
    mocks.publishJob.mockResolvedValue({ ok: true, data: {} });
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

    await waitFor(() => expect(mocks.publishJob).toHaveBeenCalledTimes(1));
    expect(mocks.toastSuccess).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('routes an unentitled republish to the edit/pay page', async () => {
    mocks.publishJob.mockResolvedValue({
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
      expect(mocks.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/employers/companies/$slug/jobs/$jobId/edit',
        }),
      ),
    );
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it('keeps the company profile editable in place with the public link visible', () => {
    vi.spyOn(ProfileRoute, 'useLoaderData').mockReturnValue({
      workspace: { slug: 'northstar-labs', membership: { company } },
      company,
      employerCompany,
    } as never);

    const ProfilePage = ProfileRoute.options.component;
    if (!ProfilePage)
      throw new Error('The profile route must expose its component');
    render(<ProfilePage />);

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
    expect(screen.getByText('linkedin.com/')).toBeInTheDocument();
    expect(screen.getByText('x.com/')).toBeInTheDocument();
    expect(screen.getByText('facebook.com/')).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByText('Hiring')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save company' })).toBeEnabled();
  });

  it('auto-strips a pasted social URL down to the handle', () => {
    vi.spyOn(ProfileRoute, 'useLoaderData').mockReturnValue({
      workspace: { slug: 'northstar-labs', membership: { company } },
      company,
      employerCompany,
    } as never);

    const ProfilePage = ProfileRoute.options.component;
    if (!ProfilePage) throw new Error('needs a component');
    render(<ProfilePage />);

    const linkedin = screen.getByRole('textbox', { name: 'LinkedIn' });
    fireEvent.change(linkedin, {
      target: { value: 'https://www.linkedin.com/company/northstar' },
    });
    expect(linkedin).toHaveValue('company/northstar');
  });

  it('prefills the tagline and social fields from the editable company read', () => {
    vi.spyOn(ProfileRoute, 'useLoaderData').mockReturnValue({
      workspace: { slug: 'northstar-labs', membership: { company } },
      company,
      employerCompany,
    } as never);

    const ProfilePage = ProfileRoute.options.component;
    if (!ProfilePage) throw new Error('needs a component');
    render(<ProfilePage />);

    // The tagline is no longer a write-only blank — it round-trips from
    // `summary`, so the field carries the stored value on load.
    expect(screen.getByRole('textbox', { name: 'Tagline' })).toHaveValue(
      'Hiring, humanely.',
    );
    // A stored social URL prefills as the bare handle behind its domain addon.
    expect(screen.getByRole('textbox', { name: 'LinkedIn' })).toHaveValue(
      'company/northstar',
    );
  });

  it('uploads a new company logo through the profile logo control', async () => {
    mocks.uploadCompanyLogo.mockResolvedValue({
      ...employerCompany,
      logoUrl: 'https://cdn.example/logo.png',
    });
    vi.spyOn(ProfileRoute, 'useLoaderData').mockReturnValue({
      workspace: { slug: 'northstar-labs', membership: { company } },
      company,
      employerCompany,
    } as never);

    const ProfilePage = ProfileRoute.options.component;
    if (!ProfilePage) throw new Error('needs a component');
    render(<ProfilePage />);

    // The upload control is present now (no more "not available here yet").
    expect(
      screen.getByRole('button', { name: 'Change logo' }),
    ).toBeInTheDocument();

    const input = document.querySelector(
      '[data-test="logo-file-input"]',
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    const file = new File(['logo-bytes'], 'logo.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(mocks.uploadCompanyLogo).toHaveBeenCalledTimes(1);
    const formData = mocks.uploadCompanyLogo.mock.calls[0][0].data as FormData;
    expect(formData.get('slug')).toBe('northstar-labs');
    expect(formData.get('logo')).toBe(file);
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
  });

  it('streams the profile-views stat into the header once the deferred read resolves', async () => {
    vi.spyOn(ProfileRoute, 'useLoaderData').mockReturnValue({
      workspace: { slug: 'northstar-labs', membership: { company } },
      company,
      employerCompany,
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
    } as never);

    const ProfilePage = ProfileRoute.options.component;
    if (!ProfilePage) throw new Error('needs a component');
    // The deferred stat suspends via <Await>; await the render so the resolved
    // promise flushes inside act (the strict setup rejects un-awaited suspense).
    await act(async () => {
      render(<ProfilePage />);
    });

    expect(
      screen.getByText('Profile views · last 30 days'),
    ).toBeInTheDocument();
    // 'en-AU' locale (from the mocked root loader) groups thousands with commas.
    expect(screen.getByText('1,204')).toBeInTheDocument();
  });

  it('shows the honest zero state when the company has no profile views yet', async () => {
    vi.spyOn(ProfileRoute, 'useLoaderData').mockReturnValue({
      workspace: { slug: 'northstar-labs', membership: { company } },
      company,
      employerCompany,
      profileViews: Promise.resolve({ total: 0, points: [] }),
    } as never);

    const ProfilePage = ProfileRoute.options.component;
    if (!ProfilePage) throw new Error('needs a component');
    await act(async () => {
      render(<ProfilePage />);
    });

    expect(screen.getByText('No views yet')).toBeInTheDocument();
  });

  it('renders the applicant pipeline as a kanban board with cards in their stage column', () => {
    vi.spyOn(ApplicantsRoute, 'useParams').mockReturnValue({
      slug: 'northstar-labs',
      jobId: 'job-1',
    });
    vi.spyOn(ApplicantsRoute, 'useLoaderData').mockReturnValue({
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
    } as never);

    const ApplicantsPage = ApplicantsRoute.options.component;
    if (!ApplicantsPage)
      throw new Error('The applicants route must expose its component');
    render(<ApplicantsPage />);

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
    mocks.renameStage.mockResolvedValue({
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
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });

  it('reports a failed reject in the detail sheet action area', async () => {
    mocks.bulkRejectApplicants.mockResolvedValue({
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
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });

  it('moves a card optimistically through the detail sheet stage picker', async () => {
    // Hold the move in-flight so the optimistic column placement is observable
    // (a resolved move + mocked invalidate would settle back to the static prop).
    let resolveMove!: (value: { ok: true; data: null }) => void;
    mocks.moveApplicant.mockReturnValue(
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
      expect(mocks.moveApplicant).toHaveBeenCalledWith({
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
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
  });
});
