// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import type { TalentDirectoryEntry } from "@cavuno/board";

import { TalentSearchPage } from "./talent-search-page";

const candidate = {
  object: "talent_directory_entry",
  handle: "ada-lovelace",
  displayName: "Ada Lovelace",
  headline: "Computing pioneer",
  location: "London",
  avatarUrl: null,
  bio: null,
  jobSearchStatus: "open_to_offers",
  skills: ["Mathematics"],
  experiences: [],
  education: [],
} as TalentDirectoryEntry;

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

function renderPage(onNextResults = vi.fn()) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => (
      <TalentSearchPage
        candidates={[candidate]}
        q="engineer"
        skill="Mathematics"
        hasMore
        onNextResults={onNextResults}
        selectedTalent="ada-lovelace"
        onSearchSubmit={vi.fn()}
        onSelectedTalentReplace={vi.fn()}
        onSelectedTalentPush={vi.fn()}
        detail={<p>Selected profile details</p>}
        startAd={{ label: "Sponsored start", content: <p>Start creative</p> }}
        endAd={{ label: "Sponsored end", content: <p>End creative</p> }}
      />
    ),
  });
  const profileRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/p/$handle",
    component: () => <p>Full profile</p>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, profileRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  return { ...render(<RouterProvider router={router} />), onNextResults };
}

describe("TalentSearchPage — search results pattern", () => {
  it("composes two-field search, canonical result anchors, ads, and named master-detail regions", async () => {
    const { container } = renderPage();

    await screen.findByRole("main");
    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("searchbox", { name: /candidate/i })).toHaveValue("engineer");
    expect(screen.getByRole("textbox", { name: /skill/i })).toHaveValue("Mathematics");

    const results = screen.getByRole("region", { name: "Talent results" });
    expect(within(results).getByRole("link", { name: /Ada Lovelace/i })).toHaveAttribute(
      "href",
      "/p/ada-lovelace",
    );
    expect(screen.getByRole("region", { name: "Selected profile" })).toHaveTextContent(
      "Selected profile details",
    );
    expect(screen.getByRole("complementary", { name: "Sponsored start" })).toBeVisible();
    expect(screen.getByRole("complementary", { name: "Sponsored end" })).toBeVisible();
  });

  it("uses an honest cursor replacement action", async () => {
    const { onNextResults } = renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Next results" }));
    expect(onNextResults).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Load more")).toBeNull();
  });
});
