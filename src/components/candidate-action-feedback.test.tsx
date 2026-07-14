// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CandidateActionFeedback } from "./candidate-action-feedback";

afterEach(cleanup);

describe("CandidateActionFeedback", () => {
  it("announces successful candidate mutations without presenting an error", () => {
    render(<CandidateActionFeedback state="success" />);

    expect(screen.getByRole("status")).toHaveTextContent("Changes saved.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("announces a recoverable mutation failure as an alert", () => {
    render(<CandidateActionFeedback state="error" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
  });
});
