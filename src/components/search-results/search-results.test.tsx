// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  AdRail,
  SearchResultCard,
  SearchResultDetail,
  SearchResultsLayout,
  SearchResultsList,
} from "./search-results";

afterEach(cleanup);

describe("Search results composition", () => {
  it("keeps the result list and selected detail as independently named regions", () => {
    const { container } = render(
      <SearchResultsLayout
        list={
          <SearchResultsList label="Job results" scrollRestorationId="jobs-list">
            <SearchResultCard selected>
              <a href="/companies/acme/jobs/designer">Product designer</a>
            </SearchResultCard>
          </SearchResultsList>
        }
        detail={
          <SearchResultDetail label="Selected job" scrollRestorationId="job-detail">
            <h2>Product designer</h2>
          </SearchResultDetail>
        }
      />,
    );

    const list = screen.getByRole("region", { name: "Job results" });
    const detail = screen.getByRole("region", { name: "Selected job" });

    expect(list).toHaveAttribute("data-scroll-restoration-id", "jobs-list");
    expect(detail).toHaveAttribute("data-scroll-restoration-id", "job-detail");
    expect(within(list).getByRole("link", { name: "Product designer" })).toHaveAttribute(
      "href",
      "/companies/acme/jobs/designer",
    );
    expect(container.querySelector('[data-slot="search-result-card"]')).toHaveAttribute(
      "data-selected",
      "true",
    );

    const core = container.querySelector('[data-slot="search-results-core"]');
    expect(core).not.toHaveClass("rounded-2xl");
    expect(core).not.toHaveClass("border");
    expect(core).not.toHaveClass("overflow-hidden");
    expect(core).not.toHaveClass("bg-background");
    expect(list).toHaveClass("md:border-r");
  });

  it("renders only supplied advertising regions with explicit labels and sides", () => {
    const { container, rerender } = render(
      <SearchResultsLayout
        startAd={<AdRail label="Advertisement from Example">Start creative</AdRail>}
        list={<SearchResultsList label="Results">Results</SearchResultsList>}
        detail={<SearchResultDetail label="Detail">Detail</SearchResultDetail>}
      />,
    );

    const startRail = screen.getByRole("complementary", {
      name: "Advertisement from Example",
    });
    expect(startRail).toHaveAttribute("data-side", "start");
    expect(container.querySelector('[data-side="end"]')).toBeNull();

    rerender(
      <SearchResultsLayout
        endAd={<AdRail label="Advertisement">End creative</AdRail>}
        list={<SearchResultsList label="Results">Results</SearchResultsList>}
        detail={<SearchResultDetail label="Detail">Detail</SearchResultDetail>}
      />,
    );

    expect(screen.getByRole("complementary", { name: "Advertisement" })).toHaveAttribute(
      "data-side",
      "end",
    );
    expect(container.querySelector('[data-side="start"]')).toBeNull();
  });
});
