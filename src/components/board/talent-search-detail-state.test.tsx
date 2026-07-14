// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TalentSearchDetailState } from "./talent-search-detail-state";
import { TalentSearchResultDetail } from "./talent-search-result-detail";
import { profileVm } from "./talent-ui-test-fixtures";

afterEach(cleanup);

const labels = {
  loadingLabel: "Loading profile details…",
  errorTitle: "Could not load profile",
  retryLabel: "Retry",
};

describe("TalentSearchDetailState", () => {
  it("preserves the pane geometry while the first profile loads", () => {
    const { container } = render(
      <TalentSearchDetailState status="loading" {...labels} onRetry={vi.fn()} />,
    );

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading profile details…")).toHaveClass("sr-only");
    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(2);
  });

  it("keeps the previous profile visible but action-free during a selection transition", () => {
    render(
      <TalentSearchDetailState
        status="loading"
        detail={<TalentSearchResultDetail vm={profileVm} interactive={false} />}
        {...labels}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Ada Lovelace" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Loading profile details…");
    expect(screen.queryByRole("link", { name: "View profile" })).toBeNull();
  });

  it("keeps the previous action-free profile visible when a selection transition fails", () => {
    const onRetry = vi.fn();
    render(
      <TalentSearchDetailState
        status="error"
        detail={<TalentSearchResultDetail vm={profileVm} interactive={false} />}
        {...labels}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Ada Lovelace" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load profile");
    expect(screen.queryByRole("link", { name: "View profile" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("offers an explicit retry for a recoverable first-load error", () => {
    const onRetry = vi.fn();
    render(<TalentSearchDetailState status="error" {...labels} onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load profile");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders no profile detail when the desktop pane has no selection", () => {
    const { container } = render(
      <TalentSearchDetailState status="idle" {...labels} onRetry={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
