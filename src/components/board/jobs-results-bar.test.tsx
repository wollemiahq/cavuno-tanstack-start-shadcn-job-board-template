import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("JobsResultsBar — replaceable shadcn select seam", () => {
  const source = readFileSync(join(import.meta.dirname, "jobs-results-bar.tsx"), "utf8");

  it("uses the owned shadcn Select API rather than the legacy select system", () => {
    expect(source).toContain('from "@/components/ui/select"');
    expect(source).not.toMatch(/components\/base\/select/);
  });
});
