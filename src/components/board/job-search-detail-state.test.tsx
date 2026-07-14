// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JobSearchDetailState } from "./job-search-detail-state";

import type { JobDetailVM } from "@/board/job-detail-view-model";

const vm: JobDetailVM = {
  breadcrumbs: [],
  breadcrumbAriaLabel: "Breadcrumbs",
  title: "Previous job",
  companyName: "Acme",
  companyLogoUrl: null,
  companyAvatarName: "Acme",
  sector: null,
  locationLabel: "Sydney",
  employmentTypeLabel: null,
  seniorityLabel: null,
  salaryLabel: null,
  publishedLabel: null,
  canonicalUrl: null,
  detailHref: "/companies/acme/jobs/previous-job",
  descriptionHtml: "<p>Previous description.</p>",
  noDescriptionText: "No description.",
  facts: [],
  categoryChips: [],
  skillChips: [],
  categoriesHeading: "Categories",
  skillsHeading: "Skills",
  customFields: [],
  additionalDetailsHeading: "Additional details",
  company: null,
  similar: [],
  similarJobsHeading: "Similar jobs",
};

afterEach(cleanup);

describe("JobSearchDetailState", () => {
  it("preserves the pane geometry while the first detail loads", () => {
    const { container } = render(
      <JobSearchDetailState
        status="loading"
        loadingLabel="Loading job details…"
        errorTitle="Could not load job"
        retryLabel="Retry"
        fullPageLabel="View full job"
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).not.toHaveAttribute("aria-busy");
    expect(screen.getByText("Loading job details…")).toHaveClass("sr-only");
    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(2);
    expect(container.querySelector("[data-slot='skeleton']")).toHaveClass(
      "motion-reduce:animate-none",
    );
  });

  it("renders no loading state when there is no selected job", () => {
    const { container } = render(
      <JobSearchDetailState
        status="idle"
        loadingLabel="Loading job details…"
        errorTitle="Could not load job"
        retryLabel="Retry"
        fullPageLabel="View full job"
        onRetry={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps preserved content read-only while the next selected job loads", () => {
    render(
      <JobSearchDetailState
        status="loading"
        vm={vm}
        loadingLabel="Loading job details…"
        errorTitle="Could not load job"
        retryLabel="Retry"
        fullPageLabel="View full job"
        onRetry={vi.fn()}
        applySlot={<button>Apply previous job</button>}
        saveSlot={<button>Save previous job</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: "Previous job" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Apply previous job" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save previous job" })).toBeNull();
  });

  it("offers an explicit retry for a recoverable detail error", () => {
    const onRetry = vi.fn();
    render(
      <JobSearchDetailState
        status="error"
        loadingLabel="Loading job details…"
        errorTitle="Could not load job"
        retryLabel="Retry"
        fullPageLabel="View full job"
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
