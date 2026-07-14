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
  it("leaves keyword and location search to the header and puts filters before the page heading", async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: () => (
        <JobSearchPage
          jobs={[job]}
          count={12}
          page={1}
          pageSize={20}
          filters={{ q: "product designer" }}
          language="en"
          onFiltersChange={vi.fn()}
          onPageChange={vi.fn()}
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
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /location/i })).not.toBeInTheDocument();

    const filterBar = container.querySelector("[data-slot='jobs-filter-bar']");
    const heading = screen.getByRole("heading", { level: 1, name: "12 jobs" });
    expect(
      screen.queryByText("Browse every open role — search, filter, and apply."),
    ).not.toBeInTheDocument();
    expect(filterBar).toBeInTheDocument();
    if (!filterBar) throw new Error("Expected the Jobs filter bar");
    expect(filterBar.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    const results = screen.getByRole("region", { name: "Job results" });
    const detail = screen.getByRole("region", { name: "Selected job" });
    expect(within(results).getByRole("link", { name: /Product designer/i })).toHaveAttribute(
      "href",
      "/companies/acme/jobs/product-designer",
    );
    expect(detail).toHaveTextContent("Selected job details");
  });

  it("uses the full results canvas for a search with no matching jobs", async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: () => (
        <JobSearchPage
          jobs={[]}
          count={0}
          page={1}
          pageSize={20}
          filters={{ q: "no-such-role" }}
          language="en"
          onFiltersChange={vi.fn()}
          onPageChange={vi.fn()}
          onSelectedJobReplace={vi.fn()}
          onSelectedJobPush={vi.fn()}
          detail={<p>Unused detail pane</p>}
        />
      ),
    });
    const jobsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/jobs",
      component: () => null,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, jobsRoute]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    const { container } = render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { level: 1, name: "0 jobs" })).toBeVisible();
    expect(screen.getByText("No jobs match your search")).toBeVisible();
    expect(screen.getByRole("link", { name: "Reset filters" })).toHaveAttribute("href", "/jobs");
    expect(screen.getByRole("link", { name: "Reset filters" })).toHaveClass("bg-primary");
    expect(container.querySelector("[data-slot='search-results-layout']")).toBeNull();
    expect(screen.queryByRole("region", { name: "Selected job" })).toBeNull();
    expect(screen.queryByText("Unused detail pane")).toBeNull();
  });
});
