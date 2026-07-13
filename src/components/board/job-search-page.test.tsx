// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import type { PublicJobCard } from "@cavuno/board";

import { JobSearchPage } from "./job-search-page";

const job = {
  id: "job-1",
  slug: "product-designer",
  title: "Product designer",
  description: "<p>Own product discovery.</p>",
  publishedAt: null,
  employmentType: "full_time",
  remoteOption: "hybrid",
  remoteLocationLabel: null,
  locationLabel: "Sydney",
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  salaryTimeframe: null,
  isFeatured: false,
  company: { slug: "acme", name: "Acme", logoUrl: null },
  categories: [],
  skills: [],
} as unknown as PublicJobCard;

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

afterEach(cleanup);

describe("JobSearchPage — search results pattern", () => {
  it("composes one page title, paired search inputs, and named master-detail regions", async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: () => (
        <JobSearchPage
          jobs={[job]}
          count={1}
          page={1}
          pageSize={20}
          filters={{ q: "product designer" }}
          language="en"
          heading="Jobs"
          onFiltersChange={vi.fn()}
          onSearchSubmit={vi.fn()}
          onPageChange={vi.fn()}
          locationSuggestions={{
            suggestions: [],
            loading: false,
            onQueryChange: vi.fn(),
          }}
          selectedJob="product-designer"
          onSelectedJobReplace={vi.fn()}
          onSelectedJobPush={vi.fn()}
          detail={<p>Selected job details</p>}
        />
      ),
    });
    const jobRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/companies/$companySlug/jobs/$jobSlug",
      component: () => <p>Full job</p>,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, jobRoute]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    const { container } = render(<RouterProvider router={router} />);

    await screen.findByRole("main");
    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("searchbox", { name: "Keyword" })).toHaveValue("product designer");
    expect(screen.getByRole("combobox", { name: /location/i })).toBeVisible();

    const results = screen.getByRole("region", { name: "Job results" });
    const detail = screen.getByRole("region", { name: "Selected job" });
    expect(within(results).getByRole("link", { name: /Product designer/i })).toHaveAttribute(
      "href",
      "/companies/acme/jobs/product-designer",
    );
    expect(detail).toHaveTextContent("Selected job details");
  });
});
