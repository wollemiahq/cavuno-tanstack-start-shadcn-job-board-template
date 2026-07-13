// @vitest-environment jsdom
/**
 * HomeLanding section-composition invariants (CAV-515). The home `/` is a
 * designed landing that opens with the SAME shared listing hero as /jobs and
 * previews the board's collections. These lock the NEW branching — the reasons
 * each section exists, not its markup:
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
} from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  PublicBlogPostSummary,
  PublicJobCard,
  TalentDirectoryEntry,
} from '@cavuno/board'

// The hero's LocationCombobox imports the server-only query module
// (`cloudflare:workers`); stub it so the landing mounts in jsdom.
vi.mock('../../server/queries', () => ({ searchPlaces: vi.fn() }))

import { HomeLanding } from './home-landing'

afterEach(cleanup)

type LandingProps = React.ComponentProps<typeof HomeLanding>

const job = {
  id: 'j1',
  title: 'Senior Backend Engineer',
  slug: 'senior-backend-engineer',
  company: { slug: 'technova-labs', name: 'TechNova Labs', logoUrl: null },
  categories: [],
  skills: [],
  description: '',
  isFeatured: false,
  salaryMin: null,
  salaryMax: null,
  salaryTimeframe: null,
  salaryCurrency: null,
} as unknown as PublicJobCard

const company: LandingProps['companies'][number] = {
  id: 'c1',
  slug: 'technova-labs',
  name: 'TechNova Labs',
  logoUrl: null,
  description: null,
  publishedJobCount: 5,
}

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
} as unknown as PublicBlogPostSummary

const candidate = {
  displayName: 'Ada Lovelace',
  handle: 'ada',
  avatarUrl: null,
  location: null,
  headline: null,
  skills: [],
} as unknown as TalentDirectoryEntry

const baseProps: LandingProps = {
  jobs: [job],
  count: 12,
  companies: [company],
  posts: [post],
  talent: [candidate],
  language: 'en',
  labels: undefined,
  boardName: 'Robotics Jobs',
  candidatesEnabled: true,
  employersEnabled: true,
}

/** Mount the landing under a real router so its typed `Link`s resolve. */
function renderLanding(props: LandingProps) {
  // PostCard reads `board.language` off the root match's loader data.
  const rootRoute = createRootRoute({
    loader: () => ({ board: { language: 'en' } }),
  })
  const stub = (path: string) =>
    createRoute({ getParentRoute: () => rootRoute, path, component: () => null })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <HomeLanding {...props} />,
  })
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
  })
  render(<RouterProvider router={router} />)
}

describe('HomeLanding — honest stat pill', () => {
  it('shows the open-role count and omits it when the loader returned none', async () => {
    renderLanding(baseProps)
    expect(await screen.findByText(/12/)).toBeTruthy()
    cleanup()
    renderLanding({ ...baseProps, count: undefined })
    // No count from the loader ⇒ no stat pill (never a bare "0").
    await screen.findByRole('link', { name: 'View all jobs' })
    expect(screen.queryByText(/^12/)).toBeNull()
  })
})

describe('HomeLanding — latest jobs carry detail links (read.jobs doctor)', () => {
  it('links each job to its typed detail route on the home page', async () => {
    renderLanding(baseProps)
    const link = await screen.findByRole('link', { name: 'Senior Backend Engineer' })
    expect(link.getAttribute('href')).toBe(
      '/companies/technova-labs/jobs/senior-backend-engineer',
    )
  })
})

describe('HomeLanding — companies strip', () => {
  it('renders a company card linking to the typed company route', async () => {
    renderLanding(baseProps)
    const link = await screen.findByRole('link', { name: 'TechNova Labs' })
    expect(link.getAttribute('href')).toBe('/companies/technova-labs')
  })

  it('omits the whole section when the board surfaced no companies', async () => {
    renderLanding({ ...baseProps, companies: [] })
    await screen.findByRole('link', { name: 'View all jobs' })
    expect(screen.queryByRole('link', { name: 'TechNova Labs' })).toBeNull()
  })
})

describe('HomeLanding — blog strip (feature/data gated)', () => {
  it('renders a post card linking to the typed post route', async () => {
    renderLanding(baseProps)
    const link = await screen.findByRole('link', { name: /Building Robots at Scale/ })
    expect(link.getAttribute('href')).toBe('/blog/building-robots')
    expect(screen.getByRole('link', { name: 'View all posts' })).toBeTruthy()
  })

  it('omits the whole section when the blog feature is off (posts=null)', async () => {
    renderLanding({ ...baseProps, posts: null })
    await screen.findByRole('link', { name: 'View all jobs' })
    expect(screen.queryByRole('link', { name: 'View all posts' })).toBeNull()
    expect(screen.queryByText(/Building Robots at Scale/)).toBeNull()
  })
})

describe('HomeLanding — talent strip (feature/data gated)', () => {
  it('renders a talent card linking to the typed profile route', async () => {
    renderLanding(baseProps)
    const link = await screen.findByRole('link', { name: 'Ada Lovelace' })
    expect(link.getAttribute('href')).toBe('/p/ada')
    expect(screen.getByRole('link', { name: 'View all talent' })).toBeTruthy()
  })

  it('omits the whole section when the talent feature is off (talent=null)', async () => {
    renderLanding({ ...baseProps, talent: null })
    await screen.findByRole('link', { name: 'View all jobs' })
    expect(screen.queryByRole('link', { name: 'View all talent' })).toBeNull()
    expect(screen.queryByText('Ada Lovelace')).toBeNull()
  })
})

describe('HomeLanding — dual-path sign-up band', () => {
  it('shows both role cards pointing DIRECTLY at each role form when both roles are enabled', async () => {
    renderLanding(baseProps)
    const candidateCta = await screen.findByRole('link', {
      name: 'Create a candidate profile',
    })
    const employerCta = screen.getByRole('link', { name: 'Create an employer profile' })
    expect(candidateCta.getAttribute('href')).toBe('/auth/sign-up')
    expect(employerCta.getAttribute('href')).toBe('/auth/employer/sign-up')
  })

  it('shows ONLY the candidate card when employers are disabled', async () => {
    renderLanding({ ...baseProps, employersEnabled: false })
    await screen.findByRole('link', { name: 'Create a candidate profile' })
    expect(
      screen.queryByRole('link', { name: 'Create an employer profile' }),
    ).toBeNull()
  })

  it('shows ONLY the employer card when candidates are disabled', async () => {
    renderLanding({ ...baseProps, candidatesEnabled: false })
    await screen.findByRole('link', { name: 'Create an employer profile' })
    expect(
      screen.queryByRole('link', { name: 'Create a candidate profile' }),
    ).toBeNull()
  })

  it('omits the whole band when neither role is enabled', async () => {
    renderLanding({
      ...baseProps,
      candidatesEnabled: false,
      employersEnabled: false,
    })
    await screen.findByRole('link', { name: 'View all jobs' })
    expect(
      screen.queryByRole('link', { name: 'Create a candidate profile' }),
    ).toBeNull()
    expect(
      screen.queryByRole('link', { name: 'Create an employer profile' }),
    ).toBeNull()
  })
})
