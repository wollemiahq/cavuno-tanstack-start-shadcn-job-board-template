import { describe, expect, it } from "vitest";

import type { PublicCompany, PublicCompanyDetail } from "@cavuno/board";

import { toCompanyCardVM, toCompanyDetailVM } from "./company-view-model";

const labels = {
  noDescriptionText: "No company description provided.",
  markets: "Markets",
  openJobs: (count: number) => `${count} open ${count === 1 ? "job" : "jobs"}`,
  viewCompany: "View company",
  viewJobs: "View jobs",
  visitWebsite: "Visit website",
  website: "Website",
};

const company = {
  id: "company-1",
  object: "public_company",
  name: "Acme Research",
  slug: "acme-research",
  website: "acme.example",
  logoUrl: "https://cdn.example/acme.svg",
  description: "<p>Research tools for ambitious engineering teams.</p>",
  jobCount: 3,
  publishedJobCount: 3,
  links: { public: "https://jobs.example/companies/acme-research" },
} as PublicCompany;

describe("company view models", () => {
  it("maps a list company to honest, canonical card data", () => {
    expect(toCompanyCardVM(company, labels)).toEqual({
      id: "company-1",
      name: "Acme Research",
      logoUrl: "https://cdn.example/acme.svg",
      avatarName: "Acme Research",
      descriptionText: "Research tools for ambitious engineering teams.",
      detailHref: "/companies/acme-research",
      publishedJobCount: 3,
      openJobsLabel: "3 open jobs",
    });
  });

  it("does not invent card copy when the description or job count is absent", () => {
    const vm = toCompanyCardVM(
      { ...company, description: null, publishedJobCount: 0 },
      labels
    );

    expect(vm.descriptionText).toBeNull();
    expect(vm.openJobsLabel).toBeNull();
  });

  it("maps detail-only markets, normalized website, and conditional action links", () => {
    const vm = toCompanyDetailVM(
      {
        ...company,
        markets: [{ name: "Developer tools", slug: "developer-tools" }],
      } as PublicCompanyDetail,
      labels
    );

    expect(vm.marketChips).toEqual([
      {
        key: "developer-tools",
        name: "Developer tools",
        href: "/companies/markets/developer-tools",
      },
    ]);
    expect(vm.websiteHref).toBe("https://acme.example");
    expect(vm.websiteLabel).toBe("acme.example");
    expect(vm.detailHref).toBe("/companies/acme-research");
    expect(vm.companySlug).toBe("acme-research");
    expect(vm).not.toHaveProperty("jobsHref");
  });
});
