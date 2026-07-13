import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("shadcn Rhea foundation", () => {
  it("declares the official Base UI Rhea preset contract", () => {
    const config = JSON.parse(read("components.json"));

    expect(config).toMatchObject({
      style: "base-rhea",
      rsc: false,
      iconLibrary: "lucide",
      menuColor: "default",
      menuAccent: "subtle",
      tailwind: {
        baseColor: "neutral",
        cssVariables: true,
        prefix: "",
      },
    });
  });

  it("scopes colliding Rhea color utilities away from legacy surfaces", () => {
    const styles = read("src/styles.css");
    const untitledTheme = read("src/styles/untitled-ui/theme.css");

    expect(untitledTheme).toContain("--background-color-primary: var(--color-bg-primary)");
    expect(styles).not.toMatch(/@theme[^}]*--(?:color|background-color)-primary:/s);
    expect(styles).toMatch(/\.rhea-theme\s*{[^}]*--background-color-primary:\s*var\(--primary\)/s);
  });

  it("restores pre-Rhea base border and outline colors outside the pilot scope", () => {
    const theme = read("src/theme.css");
    const styles = read("src/styles.css");

    expect(theme).toMatch(/@layer base\s*{\s*\*\s*{\s*@apply border-border outline-ring\/50;/s);
    expect(styles).toMatch(
      /\*:not\(\.rhea-theme, \.rhea-theme \*\)\s*{[^}]*border-color:\s*currentColor;[^}]*outline-color:\s*currentColor;/s,
    );
  });

  it("keeps the auth pilot entirely on owned Rhea components", () => {
    const pilot = [
      "src/components/rhea-auth-pilot.tsx",
      "src/routes/auth.join.tsx",
      "src/routes/auth.sign-up.tsx",
      "src/routes/auth.employer.sign-up.tsx",
    ].map(read);

    for (const source of pilot) {
      expect(source).not.toMatch(/@untitledui|components\/base\//);
    }
    expect(pilot[1]).toContain("RoleSelector");
    expect(pilot[2]).toContain("RheaRegistrationPage");
    expect(pilot[3]).toContain("RheaRegistrationPage");
  });

  it("does not wrap inherited auth routes in the Rhea token scope", () => {
    const inherited = read("src/components/auth-form.tsx");
    expect(inherited).not.toMatch(/rhea-theme|components\/ui\//);
    expect(inherited).toMatch(/@untitledui|components\/base\//);
  });

  it("loads the static tokens through the one global stylesheet entry", () => {
    expect(read("src/styles.css")).toContain('@import "./theme.css"');
    expect(JSON.parse(read("components.json")).tailwind.css).toBe("src/theme.css");
    expect(read("src/styles.css")).not.toContain("tokens.css");
    expect(read("src/routes/__root.tsx")).not.toContain("tokens.css?url");
  });

  it("carries representative exact values from the official Neutral preset", () => {
    const theme = read("src/theme.css");
    expect(theme).toContain("--primary: oklch(0.205 0 0)");
    expect(theme).toContain("--destructive: oklch(0.577 0.245 27.325)");
    expect(theme).toContain("--radius: 0.625rem");
    expect(theme).toContain("--primary: oklch(0.922 0 0)");
    expect(theme).toContain("--sidebar-primary: oklch(0.488 0.243 264.376)");
  });

  it("keeps app composition on replaceable Base UI-backed shadcn APIs", () => {
    const auth = read("src/components/rhea-auth-pilot.tsx");
    expect(auth).not.toMatch(/@base-ui\/react|data-checked|data-state/);
    expect(auth).toContain("@/components/ui/radio-group");
  });

  it("tells future agents to expand Rhea while legacy only shrinks", () => {
    const agents = read("AGENTS.md");
    expect(agents).toMatch(/shadcn.*Base UI/i);
    expect(agents).toMatch(/legacy[\s\S]*only shrink/i);
    expect(agents).toMatch(/portaled Rhea primitive[\s\S]*\.rhea-theme[\s\S]*owned portal root/i);
    expect(agents).not.toMatch(/New components compose \*\*Untitled UI/i);
  });

  it("positions the public starter as Rhea and labels Untitled UI as temporary", () => {
    const readme = read("README.md");
    const publicIntro = readme.slice(0, readme.indexOf("## Quickstart"));

    expect(publicIntro).toMatch(/shadcn\/ui[\s\S]*Rhea[\s\S]*Base UI/i);
    expect(publicIntro).toMatch(/\*\*Stack\*\*:[^\n]*Base UI/i);
    expect(publicIntro).toContain(
      "![Job board built with shadcn/ui Rhea](docs/screenshot-home.png)",
    );
    expect(publicIntro).toMatch(
      /inherited Untitled UI[\s\S]*temporary migration-only[\s\S]*deleted before release/i,
    );
    expect(publicIntro).not.toMatch(/built entirely from[\s\S]*Untitled UI/i);
  });
});
