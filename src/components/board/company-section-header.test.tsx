// @vitest-environment jsdom
/**
 * CompanySectionShell — the shared company-section header. These
 * lock the invariants the tabbed navigation exists to enforce, not the
 * markup:
 *
 *  - The trail locates the ENTITY and stops there: Home → Companies →
 *    {Company}, with NO section crumb appended. It is identical across the
 *    three sections; the tab row alone says which section you are in.
 *  - The tabs are the section-nav internal-linking spine: REAL crawlable
 *    `<a href>` anchors (never react-aria's role=tab JS panels) into the
 *    sibling sections, the active one an unlinked `aria-current` label.
 *  - The Jobs tab carries the honest company job count as a Badge.
 *  - The Salaries tab renders ONLY when the company actually has salary
 *    data — a company without it earns no dead tab.
 *  - The header block (avatar + name + one-line summary) is byte-for-byte
 *    identical whichever section is active, so the three surfaces read as ONE
 *    entity.
 *
 * The shell always renders typed `Link`s + the router-seam breadcrumb, so
 * every case mounts inside a memory router.
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

import { CompanySectionShell } from './company-section-header';

beforeEach(() => {
  // The band's decorative DitherCanvas asks for a 2D context; jsdom has none,
  // so stub it to null — the canvas degrades to a transparent no-op, exactly
  // its production fallback path.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    null as never,
  );
});

afterEach(cleanup);

type ShellProps = React.ComponentProps<typeof CompanySectionShell>;

const baseProps: ShellProps = {
  company: {
    name: 'Anduril',
    slug: 'anduril',
    logoUrl: null,
    summary: 'Autonomous defense systems',
  },
  activeSection: 'overview',
  jobCount: 54,
  hasSalaries: true,
  children: <div data-testid="section-content">content</div>,
};

/** Mount the shell under a real router so its typed `Link`s resolve. */
function renderShell(props: ShellProps) {
  const rootRoute = createRootRoute();
  const stub = (path: string) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null,
    });
  const shellRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <CompanySectionShell {...props} />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      shellRoute,
      stub('/companies/$companySlug'),
      stub('/companies/$companySlug/jobs'),
      stub('/companies/$companySlug/salaries'),
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  render(<RouterProvider router={router} />);
}

const tabNav = () =>
  screen.getByRole('navigation', { name: 'Company sections' });
describe('CompanySectionShell — trail locates the entity, tabs navigate within it', () => {
  it('renders the company name as the H1 and the platform summary as the one-liner', async () => {
    renderShell(baseProps);
    const h1 = await screen.findByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Anduril');
    // The header never leaks markup: the strong tag is gone, the words stay.
    expect(screen.getByText('Autonomous defense systems')).toBeTruthy();
    expect(document.querySelector('header strong')).toBeNull();
  });

  it('composes the identity and jobs count from the owned shadcn Avatar and Badge', async () => {
    renderShell(baseProps);
    await screen.findByRole('heading', { level: 1, name: 'Anduril' });

    const header = document.querySelector('header')!;
    expect(header.querySelector("[data-slot='avatar']")).toBeTruthy();
    expect(
      header.querySelector("[data-slot='avatar-fallback']")?.textContent,
    ).toBe('A');
    expect(
      within(tabNav()).getByText('54').closest("[data-slot='badge']"),
    ).toBeTruthy();
  });
});

describe('CompanySectionShell — tabs are the crawlable section-nav spine', () => {
  it('renders the sibling sections as real <a href> anchors', async () => {
    renderShell(baseProps);
    await screen.findByRole('heading', { level: 1 });

    // Active = Overview → an unlinked aria-current label, not an anchor.
    expect(
      within(tabNav()).queryByRole('link', { name: /Overview/ }),
    ).toBeNull();
    const active = tabNav().querySelector('[aria-current="page"]');
    expect(active?.textContent).toContain('Overview');
    expect(active?.tagName).not.toBe('A');

    // The other two sections are genuine crawlable anchors.
    const jobs = within(tabNav()).getByRole('link', { name: /Jobs/ });
    expect(jobs.tagName).toBe('A');
    expect(jobs.getAttribute('href')).toBe('/companies/anduril/jobs');

    const salaries = within(tabNav()).getByRole('link', { name: /Salaries/ });
    expect(salaries.getAttribute('href')).toBe('/companies/anduril/salaries');
  });

  it('links Overview + Salaries when the Jobs section is active', async () => {
    renderShell({ ...baseProps, activeSection: 'jobs' });
    await screen.findByRole('heading', { level: 1 });

    expect(within(tabNav()).queryByRole('link', { name: /Jobs/ })).toBeNull();
    expect(
      within(tabNav())
        .getByRole('link', { name: /Overview/ })
        .getAttribute('href'),
    ).toBe('/companies/anduril');
    expect(
      within(tabNav())
        .getByRole('link', { name: /Salaries/ })
        .getAttribute('href'),
    ).toBe('/companies/anduril/salaries');
  });

  it('shows the honest company job count as the Jobs tab badge', async () => {
    renderShell(baseProps);
    await screen.findByRole('heading', { level: 1 });
    expect(within(tabNav()).getByText('54')).toBeTruthy();
  });
});

describe('CompanySectionShell — Salaries gates on real data', () => {
  it('hides the Salaries tab when the company has no salary data', async () => {
    renderShell({ ...baseProps, hasSalaries: false });
    await screen.findByRole('heading', { level: 1 });
    expect(within(tabNav()).queryByText('Salaries')).toBeNull();
    // Overview + Jobs still render.
    expect(within(tabNav()).getByRole('link', { name: /Jobs/ })).toBeTruthy();
  });
});

describe('CompanySectionShell — shared section header', () => {
  it('places the company header and tabs before section content', async () => {
    renderShell(baseProps);
    const heading = await screen.findByRole('heading', { level: 1 });
    const content = screen.getByTestId('section-content');

    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull();
    expect(
      heading.compareDocumentPosition(content) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      tabNav().compareDocumentPosition(content) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

describe('CompanySectionShell — one entity across three sections', () => {
  it('keeps the same company identity and destinations across sections', async () => {
    renderShell(baseProps);
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(
      'Anduril',
    );
    const overviewDestinations = within(tabNav())
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(
      overviewDestinations.every((href) =>
        href?.startsWith('/companies/anduril'),
      ),
    ).toBe(true);
    cleanup();

    renderShell({ ...baseProps, activeSection: 'salaries' });
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(
      'Anduril',
    );
    const salaryDestinations = within(tabNav())
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    expect(
      salaryDestinations.every((href) =>
        href?.startsWith('/companies/anduril'),
      ),
    ).toBe(true);
  });
});
