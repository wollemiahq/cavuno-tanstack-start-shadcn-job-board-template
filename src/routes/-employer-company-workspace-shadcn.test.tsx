// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { BoardApiError } from '@cavuno/board';
import { isRedirect } from '@tanstack/react-router';
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
  getCompany: vi.fn(),
  getSeoBase: vi.fn(),
  getPipeline: vi.fn(),
  invalidate: vi.fn(),
  listCompanyJobs: vi.fn(),
  moveApplicant: vi.fn(),
  publishJob: vi.fn(),
  removeStage: vi.fn(),
  renameStage: vi.fn(),
  unpublishJob: vi.fn(),
  updateCompany: vi.fn(),
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
    useRouter: () => ({ invalidate: mocks.invalidate }),
  };
});

vi.mock('@/components/account-shell', async () => {
  const React = await import('react');
  return {
    EmployerCompanyShell: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'company-shell' }, children),
    EmployerIdentityAvatar: ({ name }: { name: string }) =>
      React.createElement('div', { 'data-testid': 'company-logo' }, name),
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
  getPipeline: mocks.getPipeline,
  moveApplicant: mocks.moveApplicant,
  publishJob: mocks.publishJob,
  removeStage: mocks.removeStage,
  renameStage: mocks.renameStage,
  unpublishJob: mocks.unpublishJob,
  updateCompany: mocks.updateCompany,
}));

vi.mock('../server/queries', () => ({
  getCompany: mocks.getCompany,
  getSeoBase: mocks.getSeoBase,
  listCompanyJobs: mocks.listCompanyJobs,
}));

import { ApplicantPipelineBoard } from '../components/employer/applicant-pipeline-board';
import { Route as JobsRoute } from './employers.companies.$slug.index';
import { Route as ApplicantsRoute } from './employers.companies.$slug.jobs.$jobId.applicants';
import { Route as ProfileRoute } from './employers.companies.$slug.profile';

import type { PipelineBoardVM } from '../board/pipeline-view-model';

const job = {
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
  object: 'company',
  name: 'Northstar Labs',
  slug: 'northstar-labs',
  website: 'https://northstar.example',
  logoUrl: null,
  description: '<p>Building better hiring tools.</p>',
  markets: [{ id: 'market-1', name: 'Hiring', slug: 'hiring' }],
  links: { public: 'https://jobs.example/companies/northstar-labs' },
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.invalidate.mockResolvedValue(undefined);
});

beforeEach(() => {
  // Every workspace loader now resolves the board name for its page title.
  mocks.getSeoBase.mockResolvedValue({ boardName: 'Acme Board' });
});

describe('employer company workspace', () => {
  it('lets every shell-owning employer workspace route own the document main', () => {
    expect(JobsRoute.options.staticData).toMatchObject({ ownsMain: true });
    expect(ProfileRoute.options.staticData).toMatchObject({ ownsMain: true });
    expect(ApplicantsRoute.options.staticData).toMatchObject({
      ownsMain: true,
    });
  });

  it('preserves the requested company workspace across an expired session', async () => {
    mocks.getCompanyWorkspace.mockRejectedValue(
      new BoardApiError({
        status: 401,
        code: 'auth_unauthorized',
        message: 'Session expired',
        raw: {},
      }),
    );
    const loader = JobsRoute.options.loader;
    if (typeof loader !== 'function')
      throw new Error('The company jobs route needs a loader');

    let result: unknown;
    try {
      result = await loader({ params: { slug: 'northstar-labs' } } as never);
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
      } as never),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('renders job management as a semantic table with every draft action', async () => {
    vi.spyOn(JobsRoute, 'useLoaderData').mockReturnValue({
      slug: 'northstar-labs',
      membership: { company },
      jobs: { data: [job] },
      billingOptions: { data: [] },
      plans: [],
    } as never);

    const JobsPage = JobsRoute.options.component;
    if (!JobsPage) throw new Error('The jobs route must expose its component');
    render(<JobsPage />);

    const table = screen.getByRole('table');
    expect(
      within(table).getByText('Senior Product Designer'),
    ).toBeInTheDocument();
    expect(within(table).getByText('Full-time')).toBeInTheDocument();
    expect(within(table).getByText('Draft')).toBeInTheDocument();
    // The status-dependent primary action stays a visible button for drafts.
    expect(screen.getByRole('button', { name: 'Publish & pay' })).toBeEnabled();

    // Every remaining action groups behind the per-row ⋯ menu.
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Actions for Senior Product Designer',
      }),
    );
    expect(
      await screen.findByRole('menuitem', { name: 'Republish (if paid)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Applicants' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeEnabled();
  });

  it('prevents duplicate checkout requests and recovers next to the plan picker', async () => {
    let rejectCheckout!: (reason: Error) => void;
    mocks.checkoutJob.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectCheckout = reject;
        }),
    );
    vi.spyOn(JobsRoute, 'useLoaderData').mockReturnValue({
      slug: 'northstar-labs',
      membership: { company },
      jobs: { data: [job] },
      billingOptions: { data: [] },
      plans: [
        {
          id: 'plan-free',
          name: 'Free listing',
          description: null,
          prices: [],
        },
      ],
    } as never);

    const JobsPage = JobsRoute.options.component;
    if (!JobsPage) throw new Error('The jobs route must expose its component');
    render(<JobsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Publish & pay' }));
    const planButton = screen.getByRole('button', { name: /Free listing/ });
    fireEvent.click(planButton);

    expect(planButton).toBeDisabled();
    expect(mocks.checkoutJob).toHaveBeenCalledTimes(1);

    await act(async () => rejectCheckout(new Error('Checkout unavailable')));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong',
      ),
    );
    expect(planButton).toBeEnabled();
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

    // One always-editable form over the public profile — no view/edit toggle.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Company profile' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /View public page/ }),
    ).toHaveAttribute('href', 'https://jobs.example/companies/northstar-labs');
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(
      'Northstar Labs',
    );
    // The website edits behind a fixed https:// prefix.
    expect(screen.getByRole('textbox', { name: 'Website' })).toHaveValue(
      'northstar.example',
    );
    // The About field authors as rich text (HTML on the wire), so the
    // editor toolbar stands in for a plain textbox assertion.
    expect(screen.getByRole('toolbar', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save company' })).toBeEnabled();
    // Social links are writable on the update surface; they render as URL
    // inputs and start blank (no read returns them).
    expect(screen.getByRole('textbox', { name: 'LinkedIn' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'X' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Facebook' })).toHaveValue('');
  });

  it('sends tagline and social links (scheme-normalised) only when filled', async () => {
    mocks.updateCompany.mockResolvedValue({ ok: true, data: {} });
    vi.spyOn(ProfileRoute, 'useLoaderData').mockReturnValue({
      workspace: { slug: 'northstar-labs', membership: { company } },
      company,
    } as never);

    const ProfilePage = ProfileRoute.options.component;
    if (!ProfilePage)
      throw new Error('The profile route must expose its component');
    render(<ProfilePage />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Tagline' }), {
      target: { value: 'Hiring the best' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'LinkedIn' }), {
      target: { value: 'linkedin.com/company/northstar' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'X' }), {
      target: { value: 'https://x.com/northstar' },
    });
    // Facebook left blank — it must be omitted from the patch.
    fireEvent.click(screen.getByRole('button', { name: 'Save company' }));

    await waitFor(() => expect(mocks.updateCompany).toHaveBeenCalledTimes(1));
    const body = mocks.updateCompany.mock.calls[0][0].data.body;
    expect(body).toMatchObject({
      summary: 'Hiring the best',
      linkedinUrl: 'https://linkedin.com/company/northstar',
      xUrl: 'https://x.com/northstar',
    });
    expect(body).not.toHaveProperty('facebookUrl');
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
