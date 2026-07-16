// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
/**
 * HomeLanding section-composition invariants (CAV-503). The home `/` is an
 * editorial landing with its own introduction and real board collections;
 * directory search stays in the persistent public header. These lock the
 * branching reasons, not visual class strings:
 *
 *  - the hero shows the HONEST open-role count and omits the pill when the
 *    loader returned no count (never a "0"/blank stat);
 *  - the companies / blog / talent strips render their shared cards and are
 *    each OMITTED WHOLE when their collection is empty or their feature is off
 *    (the loader passes `null` and the section does not render);
 *  - the latest-jobs grid links each job to its typed detail route — the home
 *    page MUST carry job-detail links (the read.jobs doctor probes `/`);
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
import type {
  PublicBlogPostSummary,
  TalentDirectoryEntry,
} from '@cavuno/board';

beforeEach(() => {
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

const job: JobCardVM = {
  id: 'j1',
  title: 'Senior Backend Engineer',
  companySlug: 'technova-labs',
  jobSlug: 'senior-backend-engineer',
  detailHref: '/companies/technova-labs/jobs/senior-backend-engineer',
  hasDetailLink: true,
  companyName: 'TechNova Labs',
  companyLogoUrl: null,
  companyAvatarName: 'TechNova Labs',
  sector: null,
  compLine: null,
  salaryLabel: null,
  locationLabel: 'Worldwide (Remote)',
  summary: null,
  isFeatured: false,
  featuredLabel: 'Featured',
  postedAtLabel: null,
  tags: [],
};

const productDesignerJob: JobCardVM = {
  id: 'j2',
  title: 'Product Designer',
  companySlug: 'technova-labs',
  jobSlug: 'product-designer',
  detailHref: '/companies/technova-labs/jobs/product-designer',
  hasDetailLink: true,
  companyName: 'TechNova Labs',
  companyLogoUrl: 'https://cdn.example.com/technova-logo.png',
  companyAvatarName: 'TechNova Labs',
  sector: null,
  compLine: null,
  salaryLabel: null,
  locationLabel: 'Sydney, NSW (Hybrid)',
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
};

const machineLearningJob: JobCardVM = {
  id: 'j3',
  title: 'Machine Learning Engineer',
  companySlug: 'technova-labs',
  jobSlug: 'machine-learning-engineer',
  detailHref: '/companies/technova-labs/jobs/machine-learning-engineer',
  hasDetailLink: true,
  companyName: 'TechNova Labs',
  companyLogoUrl: null,
  companyAvatarName: 'TechNova Labs',
  sector: null,
  compLine: null,
  salaryLabel: null,
  locationLabel: 'Worldwide (Remote)',
  summary:
    'Build anomaly-detection models over build telemetry. Production Python, feature pipelines, and model monitoring — not research.',
  isFeatured: false,
  featuredLabel: 'Featured',
  postedAtLabel: null,
  tags: [
    { key: 's-python', name: 'Python', href: '/jobs?skills=python' },
    { key: 's-pytorch', name: 'PyTorch', href: '/jobs?skills=pytorch' },
  ],
};

const company: LandingProps['companies'][number] = {
  id: 'c1',
  slug: 'technova-labs',
  name: 'TechNova Labs',
  logoUrl: null,
  description: null,
  openJobsLabel: '3 open jobs',
};

const hiringCompanies: LandingProps['companies'] = [
  {
    id: 'c2',
    slug: 'fieldstone-robotics',
    name: 'Fieldstone Robotics',
    logoUrl: null,
    description: null,
    openJobsLabel: '3 open jobs',
  },
  {
    id: 'c3',
    slug: 'brightpath-health',
    name: 'Brightpath Health',
    logoUrl: null,
    description: null,
    openJobsLabel: '3 open jobs',
  },
  company,
  {
    id: 'c4',
    slug: 'harborline-analytics',
    name: 'Harborline Analytics',
    logoUrl: null,
    description: null,
    openJobsLabel: '3 open jobs',
  },
];

const post = {
  id: 'p1',
  slug: 'building-robots',
  title: 'Building Robots at Scale',
  coverUrl: null,
  featureImageAlt: null,
  customExcerpt: null,
  publishedAt: '2026-01-01T00:00:00.000Z',
  tags: [],
  authors: [],
} as unknown as PublicBlogPostSummary;

const candidate = {
  displayName: 'Ada Lovelace',
  handle: 'ada',
  avatarUrl: null,
  location: null,
  headline: null,
  skills: [],
} as unknown as TalentDirectoryEntry;

const baseProps: LandingProps = {
  jobs: [job, productDesignerJob, machineLearningJob],
  countLabel: '12 jobs',
  companies: hiringCompanies,
  posts: [post],
  talent: [candidate],
  boardName: 'Robotics Jobs',
  candidatesEnabled: true,
  employersEnabled: true,
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

describe('HomeLanding — honest stat pill', () => {
  it('shows the open-role count and omits it when the loader returned none', async () => {
    renderLanding(baseProps);
    expect(await screen.findByText(/12/)).toBeTruthy();
    cleanup();
    renderLanding({ ...baseProps, countLabel: undefined });
    // No count from the loader ⇒ no stat pill (never a bare "0").
    await screen.findAllByRole('link', { name: 'View all jobs' });
    expect(screen.queryByText(/^12/)).toBeNull();
  });
});

describe('HomeLanding — pure landing hero', () => {
  it('leaves search to the persistent public header instead of duplicating it in the hero', async () => {
    renderLanding(baseProps);
    await screen.findByRole('heading', { name: 'Find your next role' });

    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Search' })).toBeNull();
  });
});

describe('HomeLanding — latest jobs carry detail links (read.jobs doctor)', () => {
  it('links each job to its typed detail route on the home page', async () => {
    renderLanding(baseProps);
    const link = await screen.findByRole('link', {
      name: 'Senior Backend Engineer',
    });
    expect(link.getAttribute('href')).toBe(
      '/companies/technova-labs/jobs/senior-backend-engineer',
    );
  });

  it('previews the latest real fixture roles rather than invented marketing content', async () => {
    renderLanding(baseProps);

    expect(
      await screen.findByRole('link', { name: 'Senior Backend Engineer' }),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Product Designer' })).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Machine Learning Engineer' }),
    ).toBeTruthy();
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
      name: 'Companies hiring now',
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

  it('omits the whole section when the board surfaced no companies', async () => {
    renderLanding({ ...baseProps, companies: [] });
    await screen.findAllByRole('link', { name: 'View all jobs' });
    expect(screen.queryByRole('link', { name: 'TechNova Labs' })).toBeNull();
  });
});

describe('HomeLanding — empty board', () => {
  it('stays a useful landing page without presenting zero as a stat or a failed-search message', async () => {
    renderLanding({
      ...baseProps,
      jobs: [],
      countLabel: undefined,
      companies: [],
      posts: null,
      talent: null,
    });

    await screen.findByRole('heading', { name: 'Find your next role' });
    expect(screen.queryByText(/^0 jobs$/)).toBeNull();
    expect(screen.queryByText('No jobs match')).toBeNull();
    const emptyHeading = screen.getByRole('heading', {
      name: 'New roles are on the way',
    });
    expect(emptyHeading.closest('[data-slot="empty"]')).toBeTruthy();
    expect(
      screen.getByText('Check back soon for new opportunities.'),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Create an employer profile' }),
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
    expect(screen.getByRole('link', { name: 'View all posts' })).toBeTruthy();
  });

  it('omits the whole section when the blog feature is off (posts=null)', async () => {
    renderLanding({ ...baseProps, posts: null });
    await screen.findAllByRole('link', { name: 'View all jobs' });
    expect(screen.queryByRole('link', { name: 'View all posts' })).toBeNull();
    expect(screen.queryByText(/Building Robots at Scale/)).toBeNull();
  });
});

describe('HomeLanding — talent strip (feature/data gated)', () => {
  it('renders a talent card linking to the typed profile route', async () => {
    renderLanding(baseProps);
    const link = await screen.findByRole('link', { name: 'Ada Lovelace' });
    expect(link.getAttribute('href')).toBe('/p/ada');
    expect(screen.getByRole('link', { name: 'View all talent' })).toBeTruthy();
  });

  it('omits the whole section when the talent feature is off (talent=null)', async () => {
    renderLanding({ ...baseProps, talent: null });
    await screen.findAllByRole('link', { name: 'View all jobs' });
    expect(screen.queryByRole('link', { name: 'View all talent' })).toBeNull();
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
  });
});

describe('HomeLanding — dual-path sign-up band', () => {
  it('shows both role cards pointing DIRECTLY at each role form when both roles are enabled', async () => {
    renderLanding(baseProps);
    const candidateCta = await screen.findByRole('link', {
      name: 'Create a candidate profile',
    });
    const employerCta = screen.getByRole('link', {
      name: 'Create an employer profile',
    });
    expect(candidateCta.getAttribute('href')).toBe('/auth/sign-up');
    expect(employerCta.getAttribute('href')).toBe('/auth/employer/sign-up');
  });

  it('shows ONLY the candidate card when employers are disabled', async () => {
    renderLanding({ ...baseProps, employersEnabled: false });
    await screen.findByRole('link', { name: 'Create a candidate profile' });
    expect(
      screen.queryByRole('link', { name: 'Create an employer profile' }),
    ).toBeNull();
  });

  it('shows ONLY the employer card when candidates are disabled', async () => {
    renderLanding({ ...baseProps, candidatesEnabled: false });
    await screen.findByRole('link', { name: 'Create an employer profile' });
    expect(
      screen.queryByRole('link', { name: 'Create a candidate profile' }),
    ).toBeNull();
  });

  it('omits the whole band when neither role is enabled', async () => {
    renderLanding({
      ...baseProps,
      candidatesEnabled: false,
      employersEnabled: false,
    });
    await screen.findAllByRole('link', { name: 'View all jobs' });
    expect(
      screen.queryByRole('link', { name: 'Create a candidate profile' }),
    ).toBeNull();
    expect(
      screen.queryByRole('link', { name: 'Create an employer profile' }),
    ).toBeNull();
  });
});
