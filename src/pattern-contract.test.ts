/**
 * Pattern-doc contract (CAV-503). The Polaris-style pattern layer lives in
 * docs/patterns/ as markdown with a fixed shape, so agents (and the DESIGN.md
 * generator that reads the frontmatter) can rely on it. This gate keeps the
 * docs structurally honest:
 *
 *  (a) every pattern page carries the template's `## ` sections IN ORDER,
 *  (b) the frontmatter parses and carries name / purpose / primitives / usedBy,
 *  (c) the README taxonomy index links every pattern page.
 *
 * It does NOT assert prose — content review is a human job. Structure is what
 * the generator and the cross-links depend on.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import {
  PATTERN_FRONTMATTER_KEYS,
  PATTERN_SECTION_ORDER,
  parsePatternDoc,
  patternDocFiles,
} from "../scripts/gen-design-lib.mjs";

const root = join(import.meta.dirname, "..");
const PATTERNS_DIR = join(root, "docs", "patterns");
const SRC_DIR = join(root, "src");
const read = (p: string) => readFileSync(p, "utf8");

/** Every `.tsx` source file (excluding tests), recursively. */
function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...tsxFiles(path));
    } else if (entry.name.endsWith(".tsx") && !/\.test\.tsx$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

const patterns = patternDocFiles(root) as { slug: string; file: string }[];

describe("pattern docs (docs/patterns/)", () => {
  it("there is at least one pattern page besides the template and index", () => {
    // Guards against the glob silently matching nothing (which would make
    // the per-file suites below vacuously pass).
    expect(patterns.length).toBeGreaterThanOrEqual(14);
  });

  it("the folder holds only markdown (template, index, and pattern pages)", () => {
    const stray = readdirSync(PATTERNS_DIR).filter((f) => !/\.md$/.test(f));
    expect(stray, `non-markdown files in docs/patterns: ${stray}`).toEqual([]);
  });

  describe.each(patterns)("$slug", ({ file }) => {
    const md = read(file);
    const doc = parsePatternDoc(md);

    it("carries the required frontmatter keys, non-empty", () => {
      for (const key of PATTERN_FRONTMATTER_KEYS) {
        const value = doc[key as keyof typeof doc];
        const present = Array.isArray(value) ? value.length > 0 : Boolean(value);
        expect(present, `frontmatter key "${key}" missing/empty`).toBe(true);
      }
    });

    it("usedBy globs point at real repo paths", () => {
      // usedBy is the contract a usage test asserts against — a typo here
      // would silently exempt a route. Every entry must resolve to a file.
      for (const glob of doc.usedBy) {
        expect(() => read(join(root, glob)), `usedBy path ${glob}`).not.toThrow();
      }
    });

    it("has the template sections in the enforced order", () => {
      // The body may carry extra `## ` headings, but the template's seven
      // must appear, in order, with none missing.
      const wanted = PATTERN_SECTION_ORDER;
      const present = doc.sections.filter((s) => wanted.includes(s));
      expect(present).toEqual(wanted);
    });
  });
});

describe("breadcrumb singleton (P6 — one implementation only)", () => {
  // The chevron-separated trail markup (the `<ol>` + `aria-current="page"`
  // current-page crumb) is the canonical breadcrumb primitive. It must live
  // in exactly ONE file: src/components/board/breadcrumb.tsx. `job-detail.tsx`
  // once embedded a byte-identical private copy (CAV-510 collapsed it); a new
  // hand-rolled trail anywhere else re-forks the primitive and drifts.
  const OL_SIGNATURE = "flex flex-wrap items-center gap-1.5 text-sm";
  const CURRENT_CRUMB = 'aria-current="page"';
  const CANONICAL = join("src", "components", "board", "breadcrumb.tsx");

  it("the trail markup exists only in board/breadcrumb.tsx", () => {
    const owners = tsxFiles(SRC_DIR)
      .filter((path) => {
        const source = read(path);
        return source.includes(OL_SIGNATURE) && source.includes(CURRENT_CRUMB);
      })
      .map((path) => relative(root, path));
    expect(
      owners,
      "a second breadcrumb implementation exists — import Breadcrumb " +
        "from @/components/board/breadcrumb instead of hand-rolling the trail",
    ).toEqual([CANONICAL]);
  });
});

describe("breadcrumb placement (P6 — one placement primitive)", () => {
  // Placement is owned by ONE primitive: `PageBreadcrumb` (board/breadcrumb.tsx)
  // hugs the nav at the codified `pt-4 md:pt-5`, left-aligned at the container
  // edge. It is seated ONLY by the sanctioned seams — `PageBody`'s `breadcrumb`
  // slot, `ListingPageHeader`'s `breadcrumb` slot, the `JobDetail` band, and the
  // `CompanySectionShell` band (CAV-516: the company section header rides the
  // same full-bleed band as job-detail) — so the spacing literally cannot
  // diverge per page (CAV-511). Two gates keep it that way:
  //  (a) the trail element `<Breadcrumb` is rendered ONLY by the placement
  //      primitive's own file (never hand-placed by a route),
  //  (b) the `<PageBreadcrumb` placement primitive is seated ONLY by the
  //      sanctioned seams (never dropped into a route with ad-hoc spacing).
  const BREADCRUMB_ELEMENT = "<Breadcrumb";
  const PLACEMENT_ELEMENT = "<PageBreadcrumb";
  const BREADCRUMB_OWNERS = [join("src", "components", "board", "breadcrumb.tsx")];
  const PLACEMENT_OWNERS = [
    join("src", "components", "board", "company-search-page.tsx"),
    join("src", "components", "board", "company-section-header.tsx"),
    join("src", "components", "board", "job-detail.tsx"),
    join("src", "components", "board", "job-search-page.tsx"),
    join("src", "components", "board", "listing-page-header.tsx"),
    join("src", "components", "board", "page-body.tsx"),
    join("src", "components", "board", "page-header-with-breadcrumb.tsx"),
  ];

  it("renders the <Breadcrumb> trail element only inside the placement primitive", () => {
    const owners = tsxFiles(SRC_DIR)
      .filter((path) => read(path).includes(BREADCRUMB_ELEMENT))
      .map((path) => relative(root, path))
      .sort();
    expect(
      owners,
      "a route/component renders <Breadcrumb> directly — pass the resolved " +
        "trail to the `breadcrumb` slot on PageBody / ListingPageHeader instead",
    ).toEqual(BREADCRUMB_OWNERS);
  });

  it("seats the <PageBreadcrumb> placement primitive only in the sanctioned seams", () => {
    const owners = tsxFiles(SRC_DIR)
      .filter((path) => read(path).includes(PLACEMENT_ELEMENT))
      .map((path) => relative(root, path))
      .sort();
    expect(
      owners,
      "a route/component seats <PageBreadcrumb> directly — route the trail " +
        "through a sanctioned page-header seam instead",
    ).toEqual(PLACEMENT_OWNERS);
  });
});

describe("typography scale (P17 — authored headings route through <Text>)", () => {
  // The role-named `Text` primitive (src/components/text.tsx) makes off-scale
  // headings unexpressible: there is no `text-2xl` heading variant, so an
  // authored `<h1>`–`<h6>` in a route or a board component must never carry a
  // raw off-scale Tailwind size (the `text-2xl … text-6xl` drift that CAV-513
  // burned down). A heading needing a size reaches for `<Text variant=…>`,
  // whose token is on the Untitled UI scale by construction.
  //
  // Scope is authored surfaces ONLY — `src/routes` + `src/components/board`.
  // It deliberately excludes the vendored UUI collection
  // (`base`/`application`/`foundations`, which ship their own scale) and the
  // `Prose` rich-text surface (whose headings come from rendered HTML strings,
  // never authored `<hN className>` JSX).
  const OFF_SCALE = /<h[1-6][^>]*\btext-(?:2xl|3xl|4xl|5xl|6xl)\b/;
  const SCANNED = [join(root, "src", "routes"), join(root, "src", "components", "board")];

  it("no authored heading in routes/board carries a raw off-scale size class", () => {
    const offenders = tsxFiles(SRC_DIR)
      .filter((path) => SCANNED.some((dir) => path.startsWith(dir + "/")))
      .filter((path) => OFF_SCALE.test(read(path)))
      .map((path) => relative(root, path))
      .sort();
    expect(
      offenders,
      "an authored heading carries a raw off-scale size (text-2xl…text-6xl) — " +
        'render it through <Text as="hN" variant="…"> so the size stays on the ' +
        "Untitled UI scale (see docs/patterns/typography.md)",
    ).toEqual([]);
  });
});

describe("pattern index (docs/patterns/README.md)", () => {
  const readme = read(join(PATTERNS_DIR, "README.md"));

  it("links every pattern page", () => {
    const missing = patterns.filter(({ slug }) => !readme.includes(`(${slug}.md)`));
    expect(
      missing.map((p) => p.slug),
      "pattern pages absent from the README taxonomy table",
    ).toEqual([]);
  });

  it("every link in the taxonomy table resolves to a pattern page", () => {
    const linked = [...readme.matchAll(/\(([\w-]+)\.md\)/g)]
      .map((m) => m[1])
      .filter((slug) => slug !== "_template");
    const slugs = new Set(patterns.map((p) => p.slug));
    const dangling = linked.filter((slug) => !slugs.has(slug));
    expect(dangling, "README links a non-existent pattern page").toEqual([]);
  });
});
