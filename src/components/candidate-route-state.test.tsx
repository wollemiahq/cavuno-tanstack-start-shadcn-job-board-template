// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CandidateRouteError,
  CandidateRouteErrorPage,
  CandidateRoutePending,
} from "./candidate-route-state";

afterEach(cleanup);

describe("candidate route states", () => {
  it("announces a busy loading state without exposing fake content", () => {
    render(<CandidateRoutePending label="Loading your account…" />);

    expect(screen.getByRole("status", { name: "Loading your account…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("offers an inline retry for a recoverable account load failure", () => {
    const reset = vi.fn();
    render(
      <CandidateRouteError
        title="We couldn't load this page"
        description="Try again without losing your place."
        retryLabel="Try again"
        navigationLabel="Candidate account"
        reset={reset}
      />,
    );

    expect(screen.getByRole("complementary", { name: "Candidate account" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "We couldn't load this page" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("describes the placeholder that keeps the failed route layout stable", () => {
    const errorProps: ErrorComponentProps = {
      error: new Error("account unavailable"),
      reset: vi.fn(),
    };
    render(<CandidateRouteErrorPage {...errorProps} />);

    expect(
      screen.getByText(
        "Try again. A placeholder keeps the page layout stable while this content is unavailable.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/navigation will stay/i)).not.toBeInTheDocument();
  });
});
