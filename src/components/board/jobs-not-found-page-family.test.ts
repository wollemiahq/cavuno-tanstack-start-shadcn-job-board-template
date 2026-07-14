import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(import.meta.dirname, "jobs-not-found.tsx"), "utf8");
const routeSources = [
  "../../routes/jobs.$keyword.tsx",
  "../../routes/jobs.skills.$skill.tsx",
  "../../routes/jobs.locations.$location.index.tsx",
  "../../routes/jobs.locations.$location.$keyword.tsx",
  "../../routes/jobs.locations.$location.skills.$skill.tsx",
].map((path) => readFileSync(join(import.meta.dirname, path), "utf8"));

describe("JobsNotFound — search-results recovery", () => {
  it("keeps filters and gives the empty state the full results width", () => {
    expect(source).not.toContain("PageBody");
    expect(source).not.toContain("ListingPageHeader");
    expect(source).not.toContain("ListingSearchBand");
    expect(source).not.toContain("PageHeader");
    expect(source).not.toContain("useState");
    expect(source).toContain("JobsFilterControls");
    expect(source).toContain("parseJobsSearch");
    expect(source).toMatch(/from\s+["']@\/components\/layout\/page["']/);
    expect(source).toContain("<Page");
    expect(source).not.toContain("<PageContent");
    expect(source).not.toContain("<SearchResultsLayout");
    expect(source).not.toContain("<SearchResultsList");
    expect(source).not.toContain("<SearchResultDetail");
    expect(source).toContain("max-w-6xl");
    expect(source).toContain("<Empty");
    expect(source).toContain("jobSearch_noMatchingResultsHeading");
    expect(source).toContain("jobSearch_resetFiltersAction");
    expect(source).toContain('<Link to="/jobs"');
    expect(source).not.toContain('variant: "outline"');
    expect(source).not.toContain("message:");
    expect(source).not.toContain("{message}");
    expect(source).toContain("<h1");
  });

  it("uses the same search-focused recovery state for every missing jobs taxonomy route", () => {
    for (const routeSource of routeSources) {
      expect(routeSource).toContain("<JobsNotFound />");
      expect(routeSource).not.toContain("<JobsNotFound message=");
    }
  });
});
