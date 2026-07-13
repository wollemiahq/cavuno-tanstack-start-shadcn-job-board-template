import { describe, expect, it } from "vitest";

import { extractToc, withHeadingAnchors } from "./article-toc";

describe("extractToc", () => {
  it("returns one entry per <h2> with slugified id and trimmed text", () => {
    const html = "<h2>Getting started</h2><p>Body</p><h2>Next steps</h2>";
    expect(extractToc(html)).toEqual([
      { id: "getting-started", text: "Getting started" },
      { id: "next-steps", text: "Next steps" },
    ]);
  });

  it("strips inline tags from heading text and from the slug", () => {
    const html = "<h2>Install the <code>cli</code> tool</h2>";
    expect(extractToc(html)).toEqual([
      { id: "install-the-cli-tool", text: "Install the cli tool" },
    ]);
  });

  it("dedupes repeated titles with numeric -2/-3 suffixes", () => {
    const html = "<h2>Overview</h2><h2>Overview</h2><h2>Overview</h2>";
    expect(extractToc(html)).toEqual([
      { id: "overview", text: "Overview" },
      { id: "overview-2", text: "Overview" },
      { id: "overview-3", text: "Overview" },
    ]);
  });

  it("returns [] when there are no h2 headings", () => {
    expect(extractToc("<p>Just a paragraph</p><h3>Sub</h3>")).toEqual([]);
  });

  it("honours an existing id attribute as the anchor target", () => {
    const html = '<h2 id="intro">Introduction</h2>';
    expect(extractToc(html)).toEqual([{ id: "intro", text: "Introduction" }]);
  });

  it("ignores h2 headings whose text is empty after stripping tags", () => {
    const html = '<h2><img src="x.png" /></h2><h2>Real heading</h2>';
    expect(extractToc(html)).toEqual([{ id: "real-heading", text: "Real heading" }]);
  });

  it("returns [] for null html", () => {
    expect(extractToc(null)).toEqual([]);
  });
});

describe("withHeadingAnchors", () => {
  it("injects a slugified id on each h2 that matches extractToc", () => {
    const html = "<h2>Getting started</h2><p>x</p><h2>Overview</h2>";
    const out = withHeadingAnchors(html);
    expect(out).toContain('<h2 id="getting-started">Getting started</h2>');
    expect(out).toContain('<h2 id="overview">Overview</h2>');
    for (const { id } of extractToc(html)) {
      expect(out).toContain(`id="${id}"`);
    }
  });

  it("preserves inline markup inside the heading while adding the id", () => {
    const html = "<h2>Install the <code>cli</code> tool</h2>";
    expect(withHeadingAnchors(html)).toBe(
      '<h2 id="install-the-cli-tool">Install the <code>cli</code> tool</h2>',
    );
  });

  it("applies the same -2 suffix dedup as extractToc", () => {
    const html = "<h2>Overview</h2><h2>Overview</h2>";
    const out = withHeadingAnchors(html);
    expect(out).toBe('<h2 id="overview">Overview</h2><h2 id="overview-2">Overview</h2>');
  });

  it("leaves an existing id untouched instead of adding a second one", () => {
    const html = '<h2 id="intro">Introduction</h2>';
    expect(withHeadingAnchors(html)).toBe(html);
  });

  it("does not reuse an id already claimed by an explicit id attribute", () => {
    const html = '<h2 id="overview">First</h2><h2>Overview</h2>';
    expect(withHeadingAnchors(html)).toBe(
      '<h2 id="overview">First</h2><h2 id="overview-2">Overview</h2>',
    );
  });

  it("returns the html unchanged when there are no h2 headings", () => {
    const html = "<p>No headings here</p>";
    expect(withHeadingAnchors(html)).toBe(html);
  });

  it("returns an empty string for null html", () => {
    expect(withHeadingAnchors(null)).toBe("");
  });
});
