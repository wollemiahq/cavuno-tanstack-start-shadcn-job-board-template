// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
  type RouteComponent,
} from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

type MockRouteOptions = Parameters<
  ReturnType<typeof import('@tanstack/react-router').createFileRoute>
>[0];
// The pages read only the loader fields each test sets.
const loader = vi.hoisted(() => ({ data: {} }));
vi.mock('@tanstack/react-router', async (original) => {
  const actual = await original<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    createFileRoute: () => (options: MockRouteOptions) => ({
      options,
      useLoaderData: () => loader.data,
    }),
  };
});

import { Route as LocationRoute } from './salaries.locations.$slug.index';
import { Route as LocationsIndexRoute } from './salaries.locations.index';
import { Route as SkillRoute } from './salaries.skills.$slug.index';

import { salarySkillLinkPath } from '@/board/salary-view-model';

async function renderPage(Page: RouteComponent) {
  const rootRoute = createRootRoute({ component: Page });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  render(<RouterProvider router={router} />);
  await router.load();
}

function hrefs() {
  return screen.queryAllByRole('link').map((link) => link.getAttribute('href'));
}

const row = {
  avgSalaryMin: 90_000,
  avgSalaryMax: 120_000,
  medianSalaryMin: 90_000,
  medianSalaryMax: 120_000,
  p25SalaryMin: 80_000,
  p75SalaryMax: 130_000,
  jobCount: 12,
  currency: 'USD',
};

function place(slug: string, indexable: boolean) {
  return {
    ...row,
    placeName: slug,
    placeLabel: slug,
    placeSlug: slug,
    countryCode: 'US',
    indexable,
  };
}

function title(slug: string, indexable: boolean) {
  return {
    ...row,
    categoryName: slug,
    categorySlug: slug,
    indexable,
  };
}

function locationData(adminLevel: string) {
  return {
    salary: {
      canonicalSlug: 'fixture-place',
      placeName: 'Fixture place',
      adminLevel,
      currency: 'USD',
      overallSalary: null,
      childLocations: [place('child-in', true), place('child-out', false)],
      childLocationsByRegion: [
        {
          regionName: 'Region',
          regionSlug: 'region',
          cities: [place('region-in', true), place('region-out', false)],
        },
      ],
      siblingLocations: [
        place('sibling-in', true),
        place('sibling-out', false),
      ],
      topCategories: [title('title-in', true), title('title-out', false)],
      topSkills: [],
    },
    hierarchy: [],
    faqs: [],
  };
}

afterEach(() => {
  cleanup();
});

describe('location salary page rails', () => {
  it('links only rows the Board API marks indexable', async () => {
    loader.data = locationData('region');
    await renderPage(LocationRoute.options.component!);

    expect(hrefs()).toEqual(
      expect.arrayContaining([
        '/salaries/locations/child-in',
        '/salaries/locations/region-in',
        '/salaries/locations/sibling-in',
        '/salaries/titles/title-in',
      ]),
    );
    expect(hrefs().filter((href) => href?.includes('-out'))).toEqual([]);
  });

  it('links each top title to the title-in-this-city page on a city', async () => {
    loader.data = locationData('city');
    await renderPage(LocationRoute.options.component!);

    expect(hrefs()).toContain('/salaries/titles/title-in/fixture-place');
    expect(hrefs()).not.toContain('/salaries/titles/title-in');
  });
});

describe('salary locations index tree', () => {
  it('names a non-indexable place as text and still links its indexable children', async () => {
    const node = (
      placeSlug: string,
      parentSlug: string | null,
      indexable: boolean,
    ) => ({
      ...row,
      placeName: placeSlug,
      placeSlug,
      parentSlug,
      indexable,
    });
    loader.data = {
      locations: [
        node('country-out', null, false),
        node('city-in', 'country-out', true),
      ],
    };
    await renderPage(LocationsIndexRoute.options.component!);

    expect(screen.getByText('country-out')).toBeInTheDocument();
    expect(hrefs()).toEqual(['/salaries/locations/city-in']);
  });
});

describe('skill salary page rails', () => {
  it("links a related skill to the skill's jobs page, whatever its salary flag", async () => {
    loader.data = {
      salary: {
        canonicalSlug: 'fixture-skill',
        skillName: 'Fixture skill',
        currency: 'USD',
        overallSalary: null,
        bySeniority: [],
        topCompanies: [],
        topLocations: [{ ...place('skill-place', true) }],
        topTitles: [],
        relatedSkills: [
          {
            ...row,
            skillName: 'related',
            skillSlug: 'related',
            indexable: false,
          },
        ],
      },
      faqs: [],
    };
    await renderPage(SkillRoute.options.component!);

    expect(hrefs()).toEqual([salarySkillLinkPath('related')]);
  });
});
