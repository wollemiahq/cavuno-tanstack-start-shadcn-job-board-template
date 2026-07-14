// @vitest-environment jsdom
/**
 * CompanySectionShell — the shared company-section header (CAV-512). These
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
 *  - The header block (avatar + name + one-line description) is byte-for-byte
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
import { afterEach, describe, expect, it } from 'vitest';

import { CompanySectionShell } from './company-section-header';

afterEach(cleanup);

type ShellProps = React.ComponentProps<typeof CompanySectionShell>;

const baseProps: ShellProps = {
  breadcrumb: {
    ariaLabel: 'Breadcrumb',
    items: [
      { name: 'Home', href: '/' },
      { name: 'Companies', href: '/companies' },
      { name: 'Anduril' },
    ],
  },
  company: {
    name: 'Anduril',
    slug: 'anduril',
    logoUrl: null,
    description: '<p>Autonomous <strong>defense</strong> systems</p>',
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
const trail = () => screen.getByRole('navigation', { name: 'Breadcrumb' });

describe('CompanySectionShell — trail locates the entity, tabs navigate within it', () => {
  it('ends the breadcrumb at the company with NO section crumb', async () => {
    renderShell(baseProps);
    await screen.findByRole('heading', { level: 1, name: 'Anduril' });

    // The trail is exactly Home → Companies → Anduril.
    const crumbs = within(trail()).getAllByRole('listitem');
    expect(crumbs.map((c) => c.textContent)).toEqual([
      'Home',
      'Companies',
      'Anduril',
    ]);

    // Current page is the ENTITY (unlinked), never a section.
    const current = within(trail()).getByText('Anduril', {
      selector: '[aria-current="page"]',
    });
    expect(current).toBeTruthy();
    // No "Jobs" / "Salaries" / "Overview" crumb was appended to the trail.
    expect(within(trail()).queryByText('Jobs')).toBeNull();
    expect(within(trail()).queryByText('Salaries')).toBeNull();
    expect(within(trail()).queryByText('Overview')).toBeNull();
  });

  it('renders the company name as the H1 and the description as tag-stripped one-liner', async () => {
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

describe('CompanySectionShell — header rides a full-bleed band (CAV-516)', () => {
  it('seats the breadcrumb + header + tabs inside a bg-secondary band, section content below on white', async () => {
    renderShell(baseProps);
    await screen.findByRole('heading', { level: 1 });

    // The header block now lives inside a full-bleed gray band — the SAME
    // composition as the job-detail page (PageBody `band` slot, bg-secondary
    // + border-b), so the two top sections read as the same component.
    const band = document.querySelector('.bg-secondary');
    expect(band, 'expected a bg-secondary band wrapper').toBeTruthy();
    const header = document.querySelector('header')!;
    expect(band!.contains(header)).toBe(true);
    expect(band!.contains(tabNav())).toBe(true);

    // The breadcrumb trail is seated at the TOP of the band, above the header.
    expect(band!.contains(trail())).toBe(true);
    expect(
      trail().compareDocumentPosition(header) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // Section content renders OUTSIDE the band (below, on the white surface).
    const content = screen.getByTestId('section-content');
    expect(band!.contains(content)).toBe(false);
  });

  it('does not wrap the tab row in an overflow-x-auto scroll container', async () => {
    // `overflow-x-auto` with the default `overflow-y: visible` is promoted by
    // the browser to `overflow-y: auto` (CSS spec); the active tab underline's
    // `-mb-px` then overflowed by 1px and painted a spurious VERTICAL
    // scrollbar. The three fixed tabs never overflow, so the scroll container
    // is removed entirely.
    renderShell(baseProps);
    await screen.findByRole('heading', { level: 1 });
    expect(tabNav().className).not.toContain('overflow-x-auto');
  });
});

describe('CompanySectionShell — one entity across three sections', () => {
  it('renders a byte-identical header block whichever section is active', async () => {
    renderShell(baseProps);
    await screen.findByRole('heading', { level: 1 });
    const overviewHeader = document.querySelector('header')!.outerHTML;
    cleanup();

    renderShell({ ...baseProps, activeSection: 'salaries' });
    await screen.findByRole('heading', { level: 1 });
    const salariesHeader = document.querySelector('header')!.outerHTML;

    expect(salariesHeader).toBe(overviewHeader);
  });
});
