// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TaxonomyTags } from "./taxonomy-tags";

/**
 * The taxonomy chips are the SEO internal-linking spine, so the load-bearing
 * behaviors are: each chip is a real, crawlable `<a href>` LINK carrying its
 * resolved href (NOT a JS-navigated div — the reason we don't use react-aria
 * TagGroup here), and the overflow is an honest, NON-link "+N".
 */
describe("TaxonomyTags", () => {
  const chips = [
    { key: "react", name: "React", href: "/jobs/skills/react" },
    { key: "go", name: "Go", href: "/jobs/skills/go" },
  ];

  it("renders each chip as a real anchor carrying its resolved href", () => {
    const { container } = render(<TaxonomyTags chips={chips} />);

    const anchors = [...container.querySelectorAll("a")];
    expect(anchors.map((a) => a.getAttribute("href"))).toEqual([
      "/jobs/skills/react",
      "/jobs/skills/go",
    ]);
    // Real link role — crawlable, not a div[data-href].
    expect(screen.getByRole("link", { name: "React" })).toBeTruthy();
  });

  it("shows an honest +N overflow that is NOT a link", () => {
    const { container } = render(<TaxonomyTags chips={chips} overflow={3} />);

    expect(screen.getByText("+3")).toBeTruthy();
    // Only the two real chips are anchors; the overflow is a plain span.
    expect(container.querySelectorAll("a")).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "+3" })).toBeNull();
  });

  it("renders nothing when there are no chips and no overflow", () => {
    const { container } = render(<TaxonomyTags chips={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
