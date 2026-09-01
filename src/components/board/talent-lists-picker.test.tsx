// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TalentListsPicker } from "./talent-lists-picker";

import { parseTalentSearch } from "@/lib/talent-search";
import type { TalentListRecord } from "@/server/employers";

const createList = vi.fn();

afterEach(() => {
  cleanup();
  createList.mockReset();
});

const berlin: TalentListRecord = {
  id: "list_berlin",
  object: "talent_list",
  name: "Berlin engineers",
  filters: { skill: "go", interestedRole: "Engineer" },
  jobId: null,
  createdBy: "bu_employer",
  createdAt: 1,
  updatedAt: 1,
};

const bound: TalentListRecord = {
  id: "list_smoke",
  object: "talent_list",
  name: "Smoke Robotics",
  filters: { interestedRole: "Smoke Robotics Engineer" },
  jobId: "job_smoke",
  createdBy: "bu_employer",
  createdAt: 1,
  updatedAt: 1,
};

function renderPicker(lists: TalentListRecord[] = [berlin, bound], selectedListId?: string) {
  const onListsChange = vi.fn();
  const rootRoute = createRootRoute();
  const talentRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/talent/",
    validateSearch: parseTalentSearch,
    component: () => (
      <TalentListsPicker
        slug="tls-smoke-labs"
        lists={lists}
        jobs={[{ id: "job_smoke", title: "Smoke Robotics Engineer" }]}
        selectedListId={selectedListId}
        currentFilters={{ skill: "go" }}
        onListsChange={onListsChange}
        createList={createList}
      />
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([talentRoute]),
    history: createMemoryHistory({
      initialEntries: [selectedListId ? `/talent/?list=${selectedListId}` : "/talent/"],
    }),
  });

  return {
    ...render(<RouterProvider router={router} />),
    router,
    onListsChange,
  };
}

describe("TalentListsPicker", () => {
  it("lists saved searches with none checked by default", async () => {
    renderPicker();

    fireEvent.click(await screen.findByRole("button", { name: "Saved searches" }));
    expect(screen.queryByRole("menuitemcheckbox", { name: "All candidates" })).toBeNull();
    expect(screen.queryByText("Sourced")).toBeNull();
    expect(
      screen.queryByRole("menuitemcheckbox", {
        name: "Smoke Robotics Engineer",
      }),
    ).toBeNull();
    expect(screen.getByRole("menuitemcheckbox", { name: "Berlin engineers" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("menuitemcheckbox", { name: "Smoke Robotics" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "New saved search…" })).toBeTruthy();
  });

  it("clears the selected search when it is clicked again", async () => {
    const { router } = renderPicker([berlin, bound], "list_berlin");

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Saved searches, Berlin engineers",
      }),
    );
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Berlin engineers" }));

    await waitFor(() => expect(router.state.location.search.list).toBeUndefined());
  });

  it("writes a list predicate into the talent URL", async () => {
    const { router } = renderPicker();

    fireEvent.click(await screen.findByRole("button", { name: "Saved searches" }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Berlin engineers" }));

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        list: "list_berlin",
        skill: "go",
        interestedRole: "Engineer",
      }),
    );
  });

  it("creates a blank list from the current filters", async () => {
    createList.mockResolvedValueOnce({
      ok: true,
      data: {
        ...berlin,
        id: "list_new",
        name: "Platform search",
        filters: { skill: "go" },
      },
    });
    const { onListsChange } = renderPicker();

    fireEvent.click(await screen.findByRole("button", { name: "Saved searches" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "New saved search…" }));
    expect(screen.getByRole("radio", { name: "Current filters" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "A job" })).toBeTruthy();
    fireEvent.change(await screen.findByLabelText("Name"), {
      target: { value: "Platform search" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create saved search" }));

    await waitFor(() =>
      expect(createList).toHaveBeenCalledWith({
        data: {
          slug: "tls-smoke-labs",
          name: "Platform search",
          filters: { skill: "go" },
        },
      }),
    );
    expect(onListsChange).toHaveBeenCalled();
  });

  it("creates a job-bound search from the job title keyword", async () => {
    createList.mockResolvedValueOnce({
      ok: true,
      data: {
        ...bound,
        id: "list_job",
        filters: { q: "Smoke Robotics Engineer" },
      },
    });
    renderPicker();

    fireEvent.click(await screen.findByRole("button", { name: "Saved searches" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "New saved search…" }));
    fireEvent.click(screen.getByRole("radio", { name: "A job" }));
    fireEvent.click(screen.getByRole("button", { name: "Create saved search" }));

    await waitFor(() =>
      expect(createList).toHaveBeenCalledWith({
        data: {
          slug: "tls-smoke-labs",
          name: "Smoke Robotics Engineer",
          filters: { q: "Smoke Robotics Engineer" },
          job: "job_smoke",
        },
      }),
    );
  });
});
