// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { JobDetailVM } from "@/board/job-detail-view-model";

import { JobSearchResultDetail } from "./job-search-result-detail";

const vm: JobDetailVM = {
  breadcrumbs: [],
  breadcrumbAriaLabel: "Breadcrumbs",
  title: "Product designer",
  companyName: "Acme",
  companyLogoUrl: null,
  companyAvatarName: "Acme",
  sector: "Design",
  locationLabel: "Sydney",
  employmentTypeLabel: "Full time",
  seniorityLabel: "Senior",
  salaryLabel: "$140k–$170k",
  publishedLabel: "Posted 2d ago",
  canonicalUrl: "https://jobs.example.com/companies/acme/jobs/product-designer",
  detailHref: "/companies/acme/jobs/product-designer",
  descriptionHtml: "<h2>About the role</h2><p>Own product discovery.</p>",
  noDescriptionText: "No description provided.",
  facts: [{ label: "Work permits", value: "Australia" }],
  categoryChips: [{ key: "design", name: "Design", href: "/jobs/design" }],
  skillChips: [{ key: "figma", name: "Figma", href: "/jobs/skills/figma" }],
  categoriesHeading: "Categories",
  skillsHeading: "Skills",
  customFields: [{ key: "portfolio", label: "Portfolio required", value: "Yes" }],
  additionalDetailsHeading: "Additional details",
  company: null,
  similar: [],
  similarJobsHeading: "Similar jobs",
};

afterEach(cleanup);

describe("JobSearchResultDetail", () => {
  it("is decision-complete without importing full-page SEO composition", () => {
    render(
      <JobSearchResultDetail
        vm={vm}
        fullPageHref="/companies/acme/jobs/product-designer"
        fullPageLabel="View full job"
        applySlot={<button>Apply</button>}
        saveSlot={<button>Save</button>}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Product designer" })).toBeVisible();
    expect(screen.getByText("$140k–$170k")).toBeVisible();
    expect(screen.getByRole("heading", { name: "About the role" })).toBeVisible();
    expect(screen.getByText("Work permits")).toBeVisible();
    expect(screen.getByRole("link", { name: "Design" })).toHaveAttribute("href", "/jobs/design");
    expect(screen.getByRole("link", { name: "Figma" })).toHaveAttribute(
      "href",
      "/jobs/skills/figma",
    );
    expect(screen.getByText("Portfolio required")).toBeVisible();
    const primaryActions = document.querySelector("[data-slot='job-detail-primary-actions']");
    expect(primaryActions).toContainElement(screen.getByRole("button", { name: "Apply" }));
    expect(primaryActions).toContainElement(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("link", { name: "View full job" })).toHaveAttribute(
      "href",
      "/companies/acme/jobs/product-designer",
    );
  });

  it("states when the API omitted the description", () => {
    render(
      <JobSearchResultDetail
        vm={{ ...vm, descriptionHtml: null }}
        fullPageHref="/companies/acme/jobs/product-designer"
        fullPageLabel="View full job"
      />,
    );

    expect(screen.getByText("No description provided.")).toBeVisible();
  });
});
