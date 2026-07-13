// @vitest-environment jsdom
/**
 * Public-header behavior (CAV-503).
 *
 * These tests exercise the user-visible seam under a real TanStack memory
 * router: optional collections follow board feature flags, account entry
 * points follow the enabled roles, the mobile menu exposes disclosure state,
 * and the search form derives its destination/parameter from the current
 * public collection without navigating for each keystroke.
 */
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Header imports the signed-in Messages link even for this anonymous public
// shell suite. Stub its Board API boundary so jsdom never resolves the
// Cloudflare Workers environment module.
vi.mock("../server/messaging", () => ({ getUnreadCount: vi.fn() }));
vi.mock("../server/queries", () => ({
  searchPlaces: vi.fn().mockResolvedValue({ data: [] }),
}));

import Header from "./Header";
import { UntitledUiRouterProvider } from "./untitled-ui/router-provider";
import {
  resolveHeaderSearchState,
  type HeaderSearchSubmission,
} from "../lib/header-search";

afterEach(cleanup);

type HeaderFeatures = React.ComponentProps<typeof Header>["features"] & {
  blog: boolean;
  talentDirectory: boolean;
};

const allFeatures: HeaderFeatures = {
  candidates: true,
  employers: true,
  publicJobSubmission: true,
  blog: true,
  talentDirectory: true,
};

type TalentDirectoryVisibility = "off" | "public" | "employers_only" | null;

function renderHeader({
  initialEntry = "/",
  features = allFeatures,
  talentDirectoryVisibility = features.talentDirectory ? "public" : "off",
}: {
  initialEntry?: string;
  features?: HeaderFeatures;
  talentDirectoryVisibility?: TalentDirectoryVisibility;
} = {}) {
  const initialUrl = new URL(initialEntry, "https://board.example");
  const initialSearch = resolveHeaderSearchState(
    initialUrl.pathname,
    Object.fromEntries(initialUrl.searchParams),
    initialUrl.pathname.startsWith("/jobs/locations/") ? "Sydney" : undefined,
  );
  const rootRoute = createRootRoute();
  const route = (path: string) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => {
        const navigate = useNavigate();

        function submitSearch({
          scope,
          query,
          location,
        }: HeaderSearchSubmission) {
          if (scope === "companies") {
            void navigate({ to: "/companies", search: { query } });
          } else if (scope === "talent") {
            void navigate({ to: "/talent", search: { q: query } });
          } else if (location) {
            void navigate({
              to: "/jobs/locations/$location",
              params: { location: location.slug },
              search: { q: query },
            });
          } else {
            void navigate({ to: "/jobs", search: { q: query } });
          }
        }

        return (
          <UntitledUiRouterProvider>
            <Header
              boardName="Robotics Jobs"
              logoUrl={null}
              user={null}
              language="en"
              features={features}
              talentDirectoryVisibility={talentDirectoryVisibility}
              search={{
                ...initialSearch,
                onSubmit: submitSearch,
                locationSuggestions: {
                  suggestions: [],
                  loading: false,
                  onQueryChange: vi.fn(),
                },
              }}
            />
          </UntitledUiRouterProvider>
        );
      },
    });

  const router = createRouter({
    routeTree: rootRoute.addChildren([
      route("/"),
      route("/jobs"),
      route("/jobs/locations/$location"),
      route("/companies"),
      route("/talent"),
      route("/p/$handle"),
      route("/blog"),
      route("/post"),
      route("/auth/sign-in"),
      route("/auth/join"),
      route("/auth/sign-up"),
      route("/auth/employer/sign-up"),
    ]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });

  render(<RouterProvider router={router} />);
  return router;
}

describe("Header — feature-gated public collections", () => {
  it("omits Blog and Talent when those board features are disabled", async () => {
    renderHeader({
      features: {
        ...allFeatures,
        blog: false,
        talentDirectory: false,
      },
    });

    expect(await screen.findByRole("link", { name: "Jobs" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Companies" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Blog" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Talent" })).toBeNull();
  });

  it("links Blog and Talent to their collection pages when enabled", async () => {
    renderHeader();

    expect((await screen.findByRole("link", { name: "Blog" })).getAttribute("href")).toBe("/blog");
    expect(screen.getByRole("link", { name: "Talent" }).getAttribute("href")).toBe("/talent");
  });

  it("keeps Talent navigation and search scope available for an employer-only directory", async () => {
    renderHeader({
      features: { ...allFeatures, talentDirectory: false },
      talentDirectoryVisibility: "employers_only",
    });

    expect((await screen.findByRole("link", { name: "Talent" })).getAttribute("href")).toBe(
      "/talent",
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Search category" }));
    expect(await screen.findByRole("option", { name: "Talent" })).toBeTruthy();
  });
});

describe("Header — role and public-posting gates", () => {
  it("hides every account entry point when neither account role is enabled", async () => {
    renderHeader({
      features: {
        ...allFeatures,
        candidates: false,
        employers: false,
        publicJobSubmission: false,
      },
    });

    await screen.findByRole("link", { name: "Jobs" });
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Sign up" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Post a job" })).toBeNull();
  });

  it.each([
    {
      name: "candidate-only boards",
      candidates: true,
      employers: false,
      href: "/auth/sign-up",
    },
    {
      name: "employer-only boards",
      candidates: false,
      employers: true,
      href: "/auth/employer/sign-up",
    },
    {
      name: "boards serving both roles",
      candidates: true,
      employers: true,
      href: "/auth/join",
    },
  ])("routes Sign up correctly for $name", async ({ candidates, employers, href }) => {
    renderHeader({
      features: {
        ...allFeatures,
        candidates,
        employers,
        publicJobSubmission: false,
      },
    });

    expect((await screen.findByRole("link", { name: "Sign up" })).getAttribute("href")).toBe(href);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe(
      "/auth/sign-in",
    );
  });

  it("shows Post a job independently of account registration", async () => {
    renderHeader({
      features: {
        ...allFeatures,
        candidates: false,
        employers: false,
        publicJobSubmission: true,
      },
    });

    expect((await screen.findByRole("link", { name: "Post a job" })).getAttribute("href")).toBe(
      "/post",
    );
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Sign up" })).toBeNull();
  });
});

describe("Header — mobile navigation disclosure", () => {
  it("exposes the collapsed and expanded state and controls the rendered menu", async () => {
    renderHeader();

    const toggle = await screen.findByRole("button", {
      name: /navigation menu/i,
    });
    const controlledId = toggle.getAttribute("aria-controls");

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(controlledId).toBeTruthy();
    expect(document.getElementById(controlledId!)).toBeNull();

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById(controlledId!)).toBeTruthy();
  });
});

describe("Header — pathname-scoped submit-only search", () => {
  it("uses the route-resolved place name without reconstructing it from the slug", () => {
    expect(
      resolveHeaderSearchState(
        "/jobs/locations/sao-paulo-sp",
        {},
        "São Paulo, SP",
      ).location,
    ).toEqual({ slug: "sao-paulo-sp", name: "São Paulo, SP" });
  });

  it("keeps the themed scope picker inside the Rhea theme rather than portaling to body", async () => {
    renderHeader();

    fireEvent.click(await screen.findByRole("combobox", { name: "Search category" }));

    const jobsOption = await screen.findByRole("option", { name: "Jobs" });
    expect(jobsOption.closest(".rhea-theme")).toBeTruthy();
  });

  it("uses the themed non-native scope picker", async () => {
    renderHeader();

    const scopePicker = await screen.findByRole("combobox", {
      name: "Search category",
    });
    expect(scopePicker.tagName).toBe("BUTTON");
    expect(scopePicker.textContent).toContain("Jobs");
  });

  it("pairs keyword and location inputs for Jobs without leaking location into other scopes", async () => {
    renderHeader({ initialEntry: "/jobs" });

    expect(await screen.findByRole("searchbox")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: /location/i })).toBeTruthy();

    cleanup();
    renderHeader({ initialEntry: "/companies" });
    await screen.findByRole("searchbox");
    expect(screen.queryByRole("combobox", { name: /location/i })).toBeNull();
  });

  it("preserves an active place and submits keyword plus location together", async () => {
    const router = renderHeader({
      initialEntry: "/jobs/locations/sydney?q=engineer",
    });
    const keyword = (await screen.findByRole("searchbox")) as HTMLInputElement;
    const location = screen.getByRole("combobox", {
      name: /location/i,
    }) as HTMLInputElement;

    expect(location.value).toBe("Sydney");
    fireEvent.change(keyword, { target: { value: "robotics" } });
    fireEvent.submit(keyword.closest("form") as HTMLFormElement);

    await waitFor(() =>
      expect(router.state.location.href).toBe(
        "/jobs/locations/sydney?q=robotics",
      ),
    );
  });

  it.each([
    {
      name: "Jobs",
      initialEntry: "/jobs?q=platform",
      initialValue: "platform",
      nextValue: "robotics",
      expectedHref: "/jobs?q=robotics",
    },
    {
      name: "Companies",
      initialEntry: "/companies?query=acme",
      initialValue: "acme",
      nextValue: "orbital",
      expectedHref: "/companies?query=orbital",
    },
    {
      name: "Talent",
      initialEntry: "/talent?q=designer",
      initialValue: "designer",
      nextValue: "researcher",
      expectedHref: "/talent?q=researcher",
    },
    {
      name: "Talent profile",
      initialEntry: "/p/ada-lovelace?q=designer",
      initialValue: "designer",
      nextValue: "researcher",
      expectedHref: "/talent?q=researcher",
    },
  ])(
    "derives the $name search destination from the pathname and navigates only on submit",
    async ({ initialEntry, initialValue, nextValue, expectedHref }) => {
      const router = renderHeader({ initialEntry });
      const searchbox = (await screen.findByRole("searchbox")) as HTMLInputElement;

      expect(searchbox.value).toBe(initialValue);

      fireEvent.change(searchbox, { target: { value: nextValue } });
      expect(router.state.location.href).toBe(initialEntry);

      fireEvent.submit(searchbox.closest("form") as HTMLFormElement);
      await waitFor(() => expect(router.state.location.href).toBe(expectedHref));
    },
  );

  it("uses Jobs search from the landing page and hands the query to /jobs", async () => {
    const router = renderHeader({ initialEntry: "/" });
    const searchbox = (await screen.findByRole("searchbox")) as HTMLInputElement;

    fireEvent.change(searchbox, { target: { value: "systems" } });
    expect(router.state.location.href).toBe("/");

    fireEvent.submit(searchbox.closest("form") as HTMLFormElement);
    await waitFor(() => expect(router.state.location.href).toBe("/jobs?q=systems"));
  });
});
