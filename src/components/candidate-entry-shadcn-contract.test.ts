import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const CANDIDATE_ENTRY_FILES = [
  "src/components/candidate-shell.tsx",
  "src/components/board/apply-button.tsx",
  "src/components/board/save-job-button.tsx",
];

describe("candidate entry shadcn contract", () => {
  it.each(CANDIDATE_ENTRY_FILES)("%s has no legacy presentation imports", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");

    expect(source).not.toMatch(/@untitledui\/icons/);
    expect(source).not.toMatch(/@\/components\/application\//);
    expect(source).not.toMatch(/@\/components\/base\//);
    expect(source).not.toMatch(/@\/components\/text/);
    expect(source).not.toMatch(/@\/utils\/cx/);
  });

  it("keeps the candidate shell presentational by receiving route data through props", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/candidate-shell.tsx"),
      "utf8",
    );

    expect(source).not.toContain("getRouteApi");
    expect(source).not.toContain("useLoaderData");
  });
});
