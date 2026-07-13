// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TalentSearchResultDetail } from "./talent-search-result-detail";
import { profileVm } from "./talent-ui-test-fixtures";

afterEach(cleanup);

describe("TalentSearchResultDetail", () => {
  it("shows decision-complete public facts and only the supported View profile action", () => {
    const { container } = render(<TalentSearchResultDetail vm={profileVm} />);

    expect(screen.getByRole("heading", { level: 2, name: "Ada Lovelace" })).toBeVisible();
    expect(screen.getByText("I translate ambitious ideas into working systems.")).toBeVisible();
    expect(screen.getByText("Analytical engineer")).toBeVisible();
    expect(screen.getByText("Bachelor of Mathematics")).toBeVisible();
    expect(screen.getByText("Fluent")).toBeVisible();

    const actions = container.querySelector<HTMLElement>(
      "[data-slot='talent-detail-actions']",
    );
    expect(actions).not.toBeNull();
    if (!actions) throw new Error("Talent detail actions were not rendered");

    const actionLinks = within(actions).getAllByRole("link");
    expect(actionLinks).toHaveLength(1);
    expect(actionLinks[0]).toHaveAccessibleName("View profile");
    expect(actionLinks[0]).toHaveAttribute("href", "/p/ada-lovelace");
    expect(within(actions).queryByRole("button", { name: /message|contact|save|apply/i })).toBeNull();
  });

  it("removes every profile action while preserved detail is read-only", () => {
    const { container } = render(
      <TalentSearchResultDetail vm={profileVm} interactive={false} />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Ada Lovelace" })).toBeVisible();
    expect(screen.getByText("Analytical engineer")).toBeVisible();
    expect(container.querySelector("[data-slot='talent-detail-actions']")).toBeNull();
    expect(screen.queryByRole("link", { name: "View profile" })).toBeNull();
  });
});
