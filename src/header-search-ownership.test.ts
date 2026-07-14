import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(import.meta.dirname, path), "utf8");

describe("Header search ownership", () => {
  it("derives all four public search scopes from the active route", () => {
    const header = source("components/Header.tsx");
    const resolver = source("lib/header-search.ts");
    const root = source("routes/__root.tsx");

    expect(header).not.toContain("siteHeader_searchTypeAriaLabel");
    expect(header).not.toContain("<Select");
    expect(resolver).toContain('"jobs" | "companies" | "talent" | "blog"');
    expect(resolver).toContain('pathname.startsWith("/blog/")');
    expect(root).toMatch(/scope === ["']blog["']/);
    expect(root).toMatch(/to: ["']\/blog["']/);
  });

  it("keeps Blog search in the header instead of rendering a second page search", () => {
    for (const route of [
      "routes/blog.index.tsx",
      "routes/blog.tag.$tagSlug.tsx",
      "routes/blog.author.$authorSlug.tsx",
    ]) {
      const routeSource = source(route);
      expect(routeSource).not.toContain("BlogSearchBar");
      expect(routeSource).not.toContain("search={<");
    }
  });
});
