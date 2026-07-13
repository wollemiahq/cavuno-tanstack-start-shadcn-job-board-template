/**
 * Compatibility-layer contract after the shadcn Rhea expand step.
 *
 * The Untitled UI layer must coexist with the chassis without changing
 * how existing surfaces render, and must key off the SAME dark-mode
 * mechanism the BoardTheme script already owns. These are the load-bearing
 * reconciliations — if one regresses, dark mode silently splits into two
 * class vocabularies or the whole app flips to the Untitled UI font stack
 * mid-conversion.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const tsFilesUnder = (dir: string): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry)) out.push(full);
    }
  };
  walk(join(root, dir));
  return out;
};

describe("Rhea foundation and inherited Untitled UI compatibility CSS", () => {
  it("loads the canonical Rhea theme before the inherited compatibility layers", () => {
    const css = read("src/styles.css");
    expect(css).toContain(`@import "./theme.css"`);
    expect(css).toContain(`@import "./styles/untitled-ui/theme.css"`);
    expect(css).toContain(`@import "./styles/untitled-ui/typography.css"`);
    expect(css.indexOf('@import "./theme.css"')).toBeLessThan(
      css.indexOf('@import "./styles/untitled-ui/theme.css"'),
    );
    expect(css).toContain(".rhea-theme");
  });

  it("loads the react-aria and animate Tailwind plugins", () => {
    const css = read("src/styles.css");
    expect(css).toContain(`@plugin "tailwindcss-react-aria-components"`);
    expect(css).toContain(`@plugin "tailwindcss-animate"`);
  });

  it("keys dark mode to the BoardTheme script's .dark class — .dark-mode must not survive anywhere", () => {
    // themeModeScript toggles `dark` on <html>; upstream Untitled UI ships
    // `.dark-mode`. The adaptation is exactly one token — if `.dark-mode`
    // reappears (e.g. a future component paste), dark mode silently stops
    // applying to that code.
    for (const p of [
      "src/styles.css",
      "src/styles/untitled-ui/theme.css",
      "src/styles/untitled-ui/typography.css",
    ]) {
      expect(read(p), `${p} must not reference .dark-mode`).not.toContain("dark-mode");
    }
    // Exactly one dark variant definition, covering .dark itself AND its
    // descendants (superset of the old chassis variant), at the chassis's
    // original :is() specificity.
    const styles = read("src/styles.css");
    expect(styles.match(/@custom-variant dark /g)).toHaveLength(1);
    expect(styles).toContain("@custom-variant dark (&:is(.dark, .dark *))");
  });

  it("owns Geist in the CLI theme while preserving Inter for inherited routes", () => {
    const theme = read("src/theme.css");
    const styles = read("src/styles.css");
    expect(theme).toContain('@import "@fontsource-variable/geist"');
    expect(theme).toContain('--font-sans: "Geist Variable", sans-serif');
    expect(styles).toContain("family=Inter");
    expect(styles).not.toMatch(/^:focus-visible/m);
  });

  it("has DELETED the legacy compat block at the contract step (CAV-509)", () => {
    // The bridge is gone: no LEGACY COMPAT block, no shadcn `@theme inline`
    // aliases, no workshop signature classes. The whole app renders on the
    // stock Untitled UI token namespaces (--background-color-*, --text-color-*,
    // --border-color-*), so nothing needs the compat aliases anymore.
    const css = read("src/styles.css");
    expect(css).not.toContain("LEGACY COMPAT");
    expect(css).not.toContain("CAV-489");
    expect(css).not.toContain("prose-workshop");
    expect(css).not.toContain("bench-card");
    expect(css).not.toContain("--color-muted-foreground");
    expect(css).not.toContain("--color-foreground-subtle");
    expect(css).not.toContain("--font-heading");
  });

  it("hands rich text to the single owned shadcn Typeset preset", () => {
    const css = read("src/styles.css");
    const typeset = read("src/typeset.css");
    expect(css).toContain('@import "./typeset.css"');
    expect(css).not.toContain(".prose-uui");
    expect(typeset).toContain(".typeset-content");
  });

  it("keeps pre-Rhea names out of inherited application source", () => {
    // The owned Rhea pilot intentionally uses canonical shadcn names such as
    // bg-card. This guard remains scoped to the inherited application layer;
    // the measured no-growth ratchet owns the complete legacy frontier.
    const LEGACY_NAMES = [
      "prose-workshop",
      "bench-card",
      "featured-tab",
      "count-brass",
      "bg-card",
      "text-foreground-subtle",
      "divide-border",
      "border-destructive",
      "bg-foreground",
      "text-background",
      "prose-neutral",
      "prose-invert",
    ];
    const SKIP =
      /\.test\.tsx?$|routeTree\.gen\.ts$|resolved\.ts$|components\/(?:ui|layout|search-results)\/|components\/(?:auth-form|rhea-auth-pilot)\.tsx$|components\/board\/(?:company-search-controls|company-search-detail-state|company-search-page|company-search-result|company-search-result-detail|home-landing|job-search-page|job-search-result|job-search-result-detail|job-search-detail-state|jobs-filter-toolbar|jobs-results-bar|jobs-search-controls|save-job-button)\.tsx$|routes\/auth\./;
    const offenders: string[] = [];
    for (const file of tsFilesUnder("src")) {
      if (SKIP.test(file)) continue;
      const src = readFileSync(file, "utf8");
      for (const name of LEGACY_NAMES) {
        if (src.includes(name)) offenders.push(`${relative(root, file)} — ${name}`);
      }
    }
    expect(offenders, `legacy names still present:\n${offenders.join("\n")}`).toEqual([]);
  });
});

describe("class-merge utility (one seam, theirs)", () => {
  it("ships the Untitled UI cx/sortCx utility", () => {
    const cx = read("src/utils/cx.ts");
    expect(cx).toContain("extendTailwindMerge");
    expect(cx).toContain("export function sortCx");
  });

  it("new Untitled UI code paths never import the legacy cn helper", () => {
    for (const file of tsFilesUnder("src/components/base")) {
      const src = readFileSync(file, "utf8");
      expect(src, `${file} must use @/utils/cx`).not.toMatch(/from ['"][@#]\/lib\/utils['"]/);
    }
  });
});

describe("pilot wiring (the 404 page is a real page)", () => {
  it("the router mounts the not-found pilot as its default", () => {
    expect(read("src/router.tsx")).toContain("defaultNotFoundComponent");
  });
});
