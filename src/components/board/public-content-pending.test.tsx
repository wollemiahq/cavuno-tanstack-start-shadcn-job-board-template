// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PublicContentPending } from "./public-content-pending";

afterEach(cleanup);

describe("PublicContentPending", () => {
  it("announces a shared non-interactive shadcn skeleton while public content loads", () => {
    const { container } = render(<PublicContentPending label="Loading public content" />);

    const status = screen.getByRole("status", { name: "Loading public content" });
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThanOrEqual(4);
    expect(within(status).queryByRole("link")).not.toBeInTheDocument();
    expect(within(status).queryByRole("button")).not.toBeInTheDocument();
  });
});
