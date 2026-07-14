import { describe, expect, it } from "vitest";

import { candidateReturnTo } from "./candidate-return-to";

describe("candidateReturnTo", () => {
  it("preserves complete internal job destinations", () => {
    expect(candidateReturnTo("/companies/acme/jobs/product-designer?ref=featured#apply")).toBe(
      "/companies/acme/jobs/product-designer?ref=featured#apply",
    );
    expect(candidateReturnTo("/jobs?q=designer&location=Sydney&selectedJob=product-designer")).toBe(
      "/jobs?q=designer&location=Sydney&selectedJob=product-designer",
    );
  });

  it.each([
    undefined,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/auth/sign-in",
  ])("falls back to the candidate account for an unsafe destination (%s)", (returnTo) => {
    expect(candidateReturnTo(returnTo)).toBe("/account");
  });
});
