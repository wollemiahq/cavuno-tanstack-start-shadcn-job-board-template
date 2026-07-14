// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompanySearchDetailState } from "./company-search-detail-state";

afterEach(cleanup);

describe("CompanySearchDetailState", () => {
  it("preserves the pane geometry while the first company detail loads", () => {
    const { container } = render(
      <CompanySearchDetailState
        status="loading"
        loadingLabel="Loading company details…"
        errorTitle="Could not load company"
        retryLabel="Retry"
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading company details…")).toHaveClass("sr-only");
    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(2);
  });

  it("keeps the caller-provided read-only detail visible during a transition", () => {
    render(
      <CompanySearchDetailState
        status="loading"
        detail={<article aria-label="Previous company">Previous company details</article>}
        loadingLabel="Loading company details…"
        errorTitle="Could not load company"
        retryLabel="Retry"
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole("article", { name: "Previous company" })).toBeVisible();
    expect(screen.getByText("Previous company details")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Loading company details…");
  });

  it("offers an explicit retry for a recoverable first-load error", () => {
    const onRetry = vi.fn();
    render(
      <CompanySearchDetailState
        status="error"
        loadingLabel="Loading company details…"
        errorTitle="Could not load company"
        retryLabel="Retry"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load company");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("keeps the preserved read-only detail visible when a transition fails", () => {
    const onRetry = vi.fn();
    render(
      <CompanySearchDetailState
        status="error"
        detail={<article aria-label="Previous company">Previous company details</article>}
        loadingLabel="Loading company details…"
        errorTitle="Could not load company"
        retryLabel="Retry"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("article", { name: "Previous company" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load company");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders no detail state when the desktop pane has no selection", () => {
    const { container } = render(
      <CompanySearchDetailState
        status="idle"
        loadingLabel="Loading company details…"
        errorTitle="Could not load company"
        retryLabel="Retry"
        onRetry={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
