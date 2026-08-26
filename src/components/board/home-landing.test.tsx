// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
/**
 * HomeLanding section-composition invariants. The home `/` is an
 * editorial landing with its own introduction and real board collections;
 * directory search stays in the persistent public header. These lock the
 * branching reasons, not visual class strings:
 *
 *  - the hero shows the HONEST open-role count and omits the pill when the
 *    loader returned no count (never a "0"/blank stat);
 *  - the companies / blog / talent strips render their shared cards and are
 *    each OMITTED WHOLE when their collection is empty or their feature is off
 *    (the loader passes `null` and the section does not render);
 *  - the latest-jobs grid reuses the shared `JobCard` (one design system: the
 *    featured pill is a real Badge, the featured tile earns the primary ring)
 *    and links each job into the `/jobs` two-pane workspace with that job
 *    PRESELECTED (the `selectedJob` search param), not the standalone detail
 *    page — the canonical job URL for crawlers stays on the `/jobs` listing and
 *    in the homepage JSON-LD (emitted by the route from `links.public`);
 *  - the dual-path sign-up band mirrors `resolveSignupDestination`: the
 *    candidate card points at /auth/sign-up and the employer card at
 *    /auth/employer/sign-up, each shows ONLY when its role is enabled, and the
 *    whole band is omitted when neither role is enabled.
 *
 * Everything mounts under a memory router: the landing is built from typed
 * `Link`s + path-helper hrefs, so the router seam is part of what it is.
 */
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeLanding } from './home-landing';

import type { JobCardVM } from '@/board/job-view-model';
import { m } from '@/paraglide/messages';
import { makeJobCardVM } from '@/test/fixtures';
import type {
  PublicBlogPostSummary,
  TalentDirectoryEntry,
} from '@cavuno/board';

beforeEach(() => {
  // The hero's decorative DitherCanvas probes for a WebGL2 context; jsdom has
  // none and would log a "not implemented" warning. Stub getContext to null —
  // the band degrades to its plain-background fallback, its production path
  // wherever WebGL2 is unavailable.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(window, 'Image').mockImplementation(function MockImage() {
    const image = document.createElement('img');
    Object.defineProperties(image, {
      complete: { value: true },
      naturalWidth: { value: 100 },
    });
    return image;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type LandingProps = React.ComponentProps<typeof HomeLanding>;

const job: JobCardVM = makeJobCardVM({
  id: 'j1',
  title: 'Senior Backend Engineer',
  companySlug: 'technova-labs',
  jobSlug: 'senior-backend-engineer',
  detailHref: '/companies/technova-labs/jobs/senior-backend-engineer',
  companyName: 'TechNova Labs',
  companyAvatarName: 'TechNova Labs',
  compLine: null,
  salaryLabel: null,
  summary: null,
  isFeatured: true,
});

const productDesignerJob: JobCardVM = makeJobCardVM({
  id: 'j2',
  title: 'Product Designer',
  companySlug: 'technova-labs',
  jobSlug: 'product-designer',
  detailHref: '/companies/technova-labs/jobs/product-designer',
  companyName: 'TechNova Labs',
  companyLogoUrl: 'https://cdn.example.com/technova-logo.png',
  companyAvatarName: 'TechNova Labs',
  compLine: null,
  salaryLabel: null,
  summary:
    'Design the dashboards our customers live in. You will run discovery with design partners and ship high-fidelity Figma specs alongside a design system.',
  isFeatured: false,
  featuredLabel: 'Featured',
  postedAtLabel: null,
  tags: [
    { key: 's-figma', name: 'Figma', href: '/jobs?skills=figma' },
    {
      key: 's-design-systems',
      name: 'Design Systems',
      href: '/jobs?skills=design-systems',
    },
  ],
});

const machineLearningJob: JobCardVM = makeJobCardVM({
  id: 'j3',
  title: 'Machine Learning Engineer',
  companySlug: 'technova-labs',
  jobSlug: 'machine-learning-engineer',
  detailHref: '/companies/technova-labs/jobs/machine-learning-engineer',
  companyName: 'TechNova Labs',
  companyAvatarName: 'TechNova Labs',
  compLine: null,
  salaryLabel: null,
  summary:
    'Build anomaly-detection models over build telemetry. Production Python, feature pipelines, and model monitoring — not research.',
  isFeatured: false,
  featuredLabel: 'Featured',
  postedAtLabel: null,
  tags: [
    { key: 's-python', name: 'Python', href: '/jobs?skills=python' },
    { key: 's-pytorch', name: 'PyTorch', href: '/jobs?skills=pytorch' },
  ],
});

const company: LandingProps['companies'][number] = {
  id: 'c1',
  slug: 'technova-labs',
  name: 'TechNova Labs',
  logoUrl: null,
  summary: 'We build robotics tooling for warehouses.',
  publishedJobCount: 3,
  openJobsLabel: '3 open jobs',
};

const hiringCompanies: LandingProps['companies'] = [
  {
    id: 'c2',
    slug: 'fieldstone-robotics',
    name: 'Fieldstone Robotics',
    logoUrl: null,
    summary: 'Autonomous field robots for agriculture.',
    publishedJobCount: 3,
    openJobsLabel: '3 open jobs',
  },
  {
    id: 'c3',
    slug: 'brightpath-health',
    name: 'Brightpath Health',
    logoUrl: null,
    summary: null,
    publishedJobCount: 3,
    openJobsLabel: '3 open jobs',
  },
  company,
  {
    id: 'c4',
    slug: 'harborline-analytics',
    name: 'Harborline Analytics',
    logoUrl: null,
    summary: null,
    publishedJobCount: 3,
    openJobsLabel: '3 open jobs',
  },
];

const post: PublicBlogPostSummary = {
  id: 'p1',
  object: 'public_blog_post',
  slug: 'building-robots',
  title: 'Building Robots at Scale',
  featured: false,
  coverUrl: null,
  featureImageAlt: null,
  customExcerpt: null,
  readingTimeMin: null,
  publishedAt: '2026-01-01T00:00:00.000Z',
  canonicalUrl: 'https://jobs.example/blog/building-robots',
  createdAt: '2026-01-01T00:00:00.000Z',
  tags: [],
  authors: [],
};

const candidate: TalentDirectoryEntry = {
  object: 'talent_directory_entry',
  displayName: 'Ada Lovelace',
  handle: 'ada',
  avatarUrl: null,
  location: null,
  headline: null,
  summary: null,
  bio: null,
  jobSearchStatus: 'open_to_offers',
  skills: [],
  experiences: [],
  education: [],
};

const baseProps: LandingProps = {
  jobs: [job, productDesignerJob, machineLearningJob],
  jobsCountLabel: '12 jobs',
  companiesCountLabel: '4 companies',
  talentCountLabel: '1 candidate',
  postsCountLabel: '1 post',
  companies: hiringCompanies,
  posts: [post],
  talent: [candidate],
  boardName: 'Robotics Jobs',
  candidatesEnabled: true,
  employersEnabled: true,
  viewer: { emailVerified: true },
  onSaveJob: async () => {},
};

/** Mount the landing under a real router so its typed `Link`s resolve. */
function renderLanding(props: LandingProps) {
  // PostCard reads `board.language` off the root match's loader data.
  const rootRoute = createRootRoute({
    loader: () => ({ board: { language: 'en' } }),
  });
  const stub = (path: string) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null,
    });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <HomeLanding {...props} />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      indexRoute,
      stub('/jobs'),
      stub('/companies'),
      stub('/companies/$companySlug'),
      stub('/companies/$companySlug/jobs/$jobSlug'),
      stub('/blog'),
      stub('/blog/$postSlug'),
      stub('/blog/tag/$tagSlug'),
      stub('/talent'),
      stub('/p/$handle'),
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  render(<RouterProvider router={router} />);
}

describe('HomeLanding — section-header count eyebrow', () => {
  it('shows the honest counts as section eyebrows and omits them when the loader returned none', async () => {
    renderLanding(baseProps);
    // The count rides the Latest jobs section header, not the hero.
    const jobsSection = await screen.findByRole('region', {
      name: m.home_latestJobsHeading(),
    });
    expect(
      within(jobsSection).getByText(baseProps.jobsCountLabel!),
    ).toBeTruthy();
    const companiesSection = screen.getByRole('region', {
      name: m.home_companiesHeading(),
    });
    expect(
      within(companiesSection).getByText(baseProps.companiesCountLabel!),
    ).toBeTruthy();

    cleanup();
    renderLanding({
      ...baseProps,
      jobsCountLabel: undefined,
      companiesCountLabel: undefined,
    });
    // No count from the loader ⇒ no eyebrow (never a bare "0").
    await screen.findAllByRole('link', {
      name: m.home_viewAllJobsLabel(),
    });
    expect(screen.queryByText(baseProps.jobsCountLabel!)).toBeNull();
    expect(screen.queryByText(baseProps.companiesCountLabel!)).toBeNull();
  });
});

describe('HomeLanding — pure landing hero', () => {
  it('leaves search to the persistent public header instead of duplicating it in the hero', async () => {
    renderLanding(baseProps);
    await screen.findByRole('heading', { name: m.home_heroHeadline() });

    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Search' })).toBeNull();
  });

  it('keeps the dither canvas when no background image is provided', async () => {
    renderLanding(baseProps);
    await screen.findByRole('heading', { name: m.home_heroHeadline() });
    expect(
      document.querySelector('[data-hero-background="dither"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('img[src="https://assets.cavuno.com/hero.png"]'),
    ).toBeNull();
  });

  it('renders an https hero photo instead of the dither canvas', async () => {
    renderLanding({
      ...baseProps,
      backgroundImageUrl: 'https://assets.cavuno.com/hero.png',
    });
    await screen.findByRole('heading', { name: m.home_heroHeadline() });
    expect(
      document.querySelector('img[src="https://assets.cavuno.com/hero.png"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-hero-background="photo"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-hero-background="dither"]'),
    ).toBeNull();
  });

  it('treats http and javascript URLs as missing and keeps the dither canvas', async () => {
    renderLanding({
      ...baseProps,
      backgroundImageUrl: 'http://evil.example/x.png',
    });
    await screen.findByRole('heading', { name: m.home_heroHeadline() });
    expect(
      document.querySelector('[data-hero-background="dither"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('img[src="http://evil.example/x.png"]'),
    ).toBeNull();

    cleanup();
    renderLanding({
      ...baseProps,
      backgroundImageUrl: 'javascript:alert(1)',
    });
    await screen.findByRole('heading', { name: m.home_heroHeadline() });
    expect(
      document.querySelector('[data-hero-background="dither"]'),
    ).not.toBeNull();
    expect(document.querySelector('img[src="javascript:alert(1)"]')).toBeNull();
  });
});

describe('HomeLanding — latest jobs reuse the shared card into the workspace', () => {
  it('links each job into the /jobs workspace with that job preselected, not the standalone detail page', async () => {
    renderLanding(baseProps);
    const link = await screen.findByRole('link', {
      name: 'Senior Backend Engineer',
    });
    const href = link.getAttribute('href') ?? '';
    // Opens the two-pane workspace with the job in the detail pane, NOT the
    // standalone /companies/{c}/jobs/{s} page.
    expect(href).toMatch(/^\/jobs\?/);
    expect(href).toContain('selectedJob=senior-backend-engineer');
    expect(href).not.toContain('/companies/');
  });

  it('gives a signed-in candidate a save control on every job card, like the /jobs cards', async () => {
    renderLanding(baseProps);
    const jobsSection = await screen.findByRole('region', {
      name: m.home_latestJobsHeading(),
    });
    // One save Button per job (icon presentation exposes the "Save" label).
    const saveButtons = within(jobsSection).getAllByRole('button', {
      name: m.companyJobDetail_saveJobLabel(),
    });
    expect(saveButtons).toHaveLength(baseProps.jobs.length);
  });

  it('shows an anonymous visitor a sign-in redirect affordance for saving, not a live save button', async () => {
    renderLanding({ ...baseProps, viewer: null });
    const jobsSection = await screen.findByRole('region', {
      name: m.home_latestJobsHeading(),
    });
    // Anonymous: the save control is a link into the candidate sign-in flow
    // (with a returnTo), mirroring the /jobs list — never a live save button.
    expect(
      within(jobsSection).queryByRole('button', {
        name: m.companyJobDetail_saveJobLabel(),
      }),
    ).toBeNull();
    const saveLinks = within(jobsSection).getAllByRole('link', {
      name: m.companyJobDetail_saveJobLabel(),
    });
    expect(saveLinks.length).toBe(baseProps.jobs.length);
    expect(saveLinks[0].getAttribute('href')).toMatch(
      /^\/auth\/sign-in\?returnTo=/,
    );
  });

  it('renders a featured job through the shared Card and Badge surfaces', async () => {
    renderLanding(baseProps);
    const link = await screen.findByRole('link', {
      name: 'Senior Backend Engineer',
    });
    // The whole tile is the shared owned Card.
    const cardTile = link.closest('[data-slot="card"]');
    expect(cardTile).not.toBeNull();
    // "Featured" is a real Badge, not plain text.
    const article = link.closest('article');
    if (!article) throw new Error('Expected the job link inside an article');
    const featured = within(article).getByText(job.featuredLabel);
    expect(featured).toHaveAttribute('data-slot', 'badge');
  });

  it('renders job taxonomy links through the owned Badge surface', async () => {
    renderLanding(baseProps);

    const tag = await screen.findByRole('link', { name: 'Figma' });
    expect(tag).toHaveAttribute('data-slot', 'badge');
  });

  it('shows a company avatar on every card, using the logo or company initials', async () => {
    renderLanding(baseProps);

    expect(
      await screen.findByRole('img', { name: 'TechNova Labs' }),
    ).toHaveAttribute('src', 'https://cdn.example.com/technova-logo.png');
    expect((await screen.findAllByText('TL')).length).toBeGreaterThan(0);
  });
});

describe('HomeLanding — hiring index', () => {
  it('presents the real hiring companies and counts as one named navigation region', async () => {
    renderLanding(baseProps);
    const index = await screen.findByRole('region', {
      name: m.home_companiesHeading(),
    });

    expect(
      within(index).getByRole('link', { name: 'Fieldstone Robotics' }),
    ).toHaveAttribute('href', '/companies/fieldstone-robotics');
    expect(
      within(index).getByRole('link', { name: 'Brightpath Health' }),
    ).toHaveAttribute('href', '/companies/brightpath-health');
    expect(
      within(index).getByRole('link', { name: 'TechNova Labs' }),
    ).toHaveAttribute('href', '/companies/technova-labs');
    expect(
      within(index).getByRole('link', { name: 'Harborline Analytics' }),
    ).toHaveAttribute('href', '/companies/harborline-analytics');
    expect(within(index).getAllByText('3 open jobs')).toHaveLength(4);
  });

  it('renders the shared CompanyCard with the wire summary, not a slim pill', async () => {
    renderLanding(baseProps);
    const index = await screen.findByRole('region', {
      name: m.home_companiesHeading(),
    });
    // Shared owned Card surface (not a bespoke homepage pill).
    expect(index.querySelector('[data-slot="card"]')).not.toBeNull();
    // Card teaser is the API summary (authored or server-derived).
    expect(
      within(index).getByText('Autonomous field robots for agriculture.'),
    ).toBeTruthy();
  });

  it('omits the whole section when the board surfaced no companies', async () => {
    renderLanding({ ...baseProps, companies: [] });
    await screen.findAllByRole('link', {
      name: m.home_viewAllJobsLabel(),
    });
    expect(screen.queryByRole('link', { name: 'TechNova Labs' })).toBeNull();
  });
});

describe('HomeLanding — empty board', () => {
  it('stays a useful landing page without presenting zero as a stat or a failed-search message', async () => {
    renderLanding({
      ...baseProps,
      jobs: [],
      jobsCountLabel: undefined,
      companies: [],
      posts: null,
      talent: null,
    });

    await screen.findByRole('heading', { name: m.home_heroHeadline() });
    expect(screen.queryByText(/^0 jobs$/)).toBeNull();
    expect(screen.queryByText('No jobs match')).toBeNull();
    const emptyHeading = screen.getByRole('heading', {
      name: m.home_emptyHeading(),
    });
    expect(emptyHeading.closest('[data-slot="empty"]')).toBeTruthy();
    expect(screen.getByText(m.home_emptySupporting())).toBeTruthy();
    expect(
      screen.getByRole('link', { name: m.home_employerCtaButton() }),
    ).toHaveAttribute('href', '/auth/employer/sign-up');
  });
});

describe('HomeLanding — blog strip (feature/data gated)', () => {
  it('renders a post card linking to the typed post route', async () => {
    renderLanding(baseProps);
    const link = await screen.findByRole('link', {
      name: /Building Robots at Scale/,
    });
    expect(link.getAttribute('href')).toBe('/blog/building-robots');
    expect(
      screen.getByRole('link', { name: m.home_viewAllBlogLabel() }),
    ).toBeTruthy();
  });

  it('omits the whole section when the blog feature is off (posts=null)', async () => {
    renderLanding({ ...baseProps, posts: null });
    await screen.findAllByRole('link', {
      name: m.home_viewAllJobsLabel(),
    });
    expect(
      screen.queryByRole('link', { name: m.home_viewAllBlogLabel() }),
    ).toBeNull();
    expect(screen.queryByText(/Building Robots at Scale/)).toBeNull();
  });
});

describe('HomeLanding — talent strip (feature/data gated)', () => {
  it('renders a talent card linking to the typed profile route', async () => {
    renderLanding(baseProps);
    const link = await screen.findByRole('link', { name: 'Ada Lovelace' });
    expect(link.getAttribute('href')).toBe('/p/ada');
    expect(
      screen.getByRole('link', { name: m.home_viewAllTalentLabel() }),
    ).toBeTruthy();
  });

  it('omits the whole section when the talent feature is off (talent=null)', async () => {
    renderLanding({ ...baseProps, talent: null });
    await screen.findAllByRole('link', {
      name: m.home_viewAllJobsLabel(),
    });
    expect(
      screen.queryByRole('link', { name: m.home_viewAllTalentLabel() }),
    ).toBeNull();
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
  });
});

describe('HomeLanding — dual-path sign-up band', () => {
  it('shows both role cards pointing DIRECTLY at each role form when both roles are enabled', async () => {
    renderLanding(baseProps);
    const candidateCta = await screen.findByRole('link', {
      name: m.home_candidateCtaButton(),
    });
    const employerCta = screen.getByRole('link', {
      name: m.home_employerCtaButton(),
    });
    expect(candidateCta.getAttribute('href')).toBe('/auth/sign-up');
    expect(employerCta.getAttribute('href')).toBe('/auth/employer/sign-up');
  });

  it('shows ONLY the candidate card when employers are disabled', async () => {
    renderLanding({ ...baseProps, employersEnabled: false });
    await screen.findByRole('link', {
      name: m.home_candidateCtaButton(),
    });
    expect(
      screen.queryByRole('link', { name: m.home_employerCtaButton() }),
    ).toBeNull();
  });

  it('shows ONLY the employer card when candidates are disabled', async () => {
    renderLanding({ ...baseProps, candidatesEnabled: false });
    await screen.findByRole('link', {
      name: m.home_employerCtaButton(),
    });
    expect(
      screen.queryByRole('link', { name: m.home_candidateCtaButton() }),
    ).toBeNull();
  });

  it('omits the whole band when neither role is enabled', async () => {
    renderLanding({
      ...baseProps,
      candidatesEnabled: false,
      employersEnabled: false,
    });
    await screen.findAllByRole('link', {
      name: m.home_viewAllJobsLabel(),
    });
    expect(
      screen.queryByRole('link', { name: m.home_candidateCtaButton() }),
    ).toBeNull();
    expect(
      screen.queryByRole('link', { name: m.home_employerCtaButton() }),
    ).toBeNull();
  });
});
