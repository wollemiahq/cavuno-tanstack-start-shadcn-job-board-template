// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageBody } from "./page-body";

/**
 * `PageBody` is the page-width primitive: it owns the constrained container
 * and, when given a `rail`, becomes the canonical two-column layout. The
 * structural guarantees below are what let every page share one width.
 */
describe("PageBody", () => {
  it("renders a full-bleed band above the constrained content", () => {
    const { container } = render(
      <PageBody band={<div data-test="band">band</div>}>
        <p>content</p>
      </PageBody>,
    );
    expect(container.querySelector('[data-test="band"]')).not.toBeNull();
    expect(screen.getByText("content")).toBeTruthy();
  });

  it("switches to the two-column grid with an aside when a rail is given", () => {
    const { container } = render(
      <PageBody rail={<div data-test="rail">rail</div>}>
        <p>main</p>
      </PageBody>,
    );
    // The rail lives in an <aside>; both columns render.
    const aside = container.querySelector("aside");
    expect(aside).not.toBeNull();
    expect(aside!.querySelector('[data-test="rail"]')).not.toBeNull();
    expect(container.querySelector(".lg\\:grid-cols-\\[1fr_20rem\\]")).not.toBeNull();
    expect(screen.getByText("main")).toBeTruthy();
  });

  it("renders a single content column (no aside) without a rail", () => {
    const { container } = render(
      <PageBody>
        <p>only</p>
      </PageBody>,
    );
    expect(container.querySelector("aside")).toBeNull();
    expect(screen.getByText("only")).toBeTruthy();
  });

  it("seats a band-less page's trail through PageBreadcrumb, hugging the nav at pt-4/5", () => {
    // The `breadcrumb` slot is the ONE placement seam for band-less pages: the
    // trail renders via the shared `PageBreadcrumb` at the codified
    // `pt-4 md:pt-5`, left-aligned at the container edge — identical to the band
    // pages, so the spacing cannot diverge (CAV-511).
    const { container } = render(
      <PageBody
        breadcrumb={{
          ariaLabel: "Breadcrumb",
          items: [{ name: "Home", href: "/" }, { name: "Salaries" }],
        }}
      >
        <p>content</p>
      </PageBody>,
    );
    const nav = container.querySelector('nav[aria-label="Breadcrumb"]');
    expect(nav).not.toBeNull();
    expect(nav!.textContent).toContain("Home");
    // The current (last) crumb is unlinked.
    expect(container.querySelector('[aria-current="page"]')!.textContent).toBe("Salaries");
    // The placement primitive owns the hug + container edge — not the route.
    const placement = nav!.closest("div.max-w-container");
    expect(placement).not.toBeNull();
    expect(placement!.className).toContain("pt-4");
    expect(placement!.className).toContain("md:pt-5");
  });

  it("renders no trail markup when the breadcrumb slot is omitted (backward compatible)", () => {
    const { container } = render(
      <PageBody>
        <p>only</p>
      </PageBody>,
    );
    expect(container.querySelector("nav")).toBeNull();
  });
});
