// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { BoardApiError } from '@cavuno/board';
import { isRedirect } from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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
  getCompany: vi.fn(),
  getJob: vi.fn(),
  getSeoBase: vi.fn(),
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
}));

import { Route as JobsRoute } from './employers.companies.$slug.index';
import { Route as ApplicantsRoute } from './employers.companies.$slug.jobs.$jobId.applicants';
import { Route as ProfileRoute } from './employers.companies.$slug.profile';

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

function renderJobs(jobs: unknown[]) {
  vi.spyOn(JobsRoute, 'useLoaderData').mockReturnValue({
    slug: 'northstar-labs',
    membership: { company: { name: 'Northstar Labs' } },
    jobs: { data: jobs },
    billingOptions: { data: [] },
    plans: [],
  } as never);
  const JobsPage = JobsRoute.options.component;
  if (!JobsPage) throw new Error('The jobs route must expose its component');
  render(<JobsPage />);
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

  it('titles the jobs list with the company name and its active-job count', () => {
    renderJobs([
      { ...draftJob, id: 'a', status: 'published', publishedAt: '2026-07-01' },
      { ...draftJob, id: 'b', status: 'published', publishedAt: '2026-07-02' },
      { ...draftJob, id: 'c', status: 'draft' },
    ]);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Northstar Labs Jobs' }),
    ).toBeInTheDocument();
    expect(screen.getByText('You have 2 active jobs.')).toBeInTheDocument();
  });

  it('links every role name to its edit page and hides applicants for drafts', () => {
    renderJobs([draftJob]);

    const roleLink = screen.getByRole('link', {
      name: 'Senior Product Designer',
    });
    expect(roleLink).toHaveAttribute(
      'href',
      '/employers/companies/$slug/jobs/$jobId/edit',
    );
    // A draft keeps a primary Publish that also lands on the edit page.
    expect(screen.getByRole('link', { name: 'Publish' })).toHaveAttribute(
      'href',
      '/employers/companies/$slug/jobs/$jobId/edit',
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Actions for Senior Product Designer',
      }),
    );
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'Applicants' }),
    ).not.toBeInTheDocument();
  });

  it('shows a distinct Expired chip and flips the date to the expiry', () => {
    renderJobs([
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
    renderJobs([
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
    renderJobs([
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

  it('renders applicant identity, pipeline controls, notes, and history together', () => {
    const stages = [
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
    ] as const;
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
      stages,
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
          timeline: [
            {
              id: 'event-1',
              type: 'note_created',
              actorBoardUserId: 'employer-1',
              actorName: 'Grace Hopper',
              noteId: 'note-1',
              noteBody: 'Strong portfolio',
              fromStage: null,
              toStage: null,
              createdAt: '2026-07-14T00:00:00.000Z',
            },
          ],
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
    // The header no longer carries a back link, stages heading, or system badge.
    expect(
      screen.queryByRole('link', { name: 'Back to company' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Pipeline stages' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('system')).not.toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Stage' })).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Add a private note' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Note: Strong portfolio · Grace Hopper'),
    ).toBeInTheDocument();
  });

  it('keeps a failed stage rename open and reports the error beside that stage', async () => {
    const stages = [
      {
        id: 'stage-custom',
        object: 'employer_pipeline_stage',
        jobId: 'job-1',
        label: 'Portfolio review',
        systemStage: null,
        isProtected: false,
        hidden: false,
        position: 0,
      },
    ] as const;
    mocks.renameStage.mockResolvedValue({
      ok: false,
      message: 'Rename failed',
    });
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
      stages,
      applicants: [],
    } as never);

    const ApplicantsPage = ApplicantsRoute.options.component;
    if (!ApplicantsPage)
      throw new Error('The applicants route must expose its component');
    render(<ApplicantsPage />);

    fireEvent.click(
      screen.getByRole('button', { name: 'edit Portfolio review' }),
    );
    const input = screen.getByRole('textbox', { name: 'Portfolio review' });
    fireEvent.change(input, { target: { value: 'Interview' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Rename failed');
    expect(
      screen.getByRole('textbox', { name: 'Portfolio review' }),
    ).toHaveValue('Interview');
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });

  it('reports a failed applicant action in the action area rather than the note field', async () => {
    mocks.bulkRejectApplicants.mockResolvedValue({
      ok: false,
      message: 'Reject failed',
    });
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
          candidateHeadline: null,
          candidateLocation: null,
          coverNote: null,
          resumeFilename: null,
          resumeUrl: null,
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
    const { container } = render(<ApplicantsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Reject failed');
    expect(alert.closest('[data-applicant-action-feedback]')).not.toBeNull();
    expect(
      container.querySelector('[data-applicant-note-field] [role="alert"]'),
    ).toBeNull();
  });
});
