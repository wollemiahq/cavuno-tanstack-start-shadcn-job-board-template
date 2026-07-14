import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const PUBLIC_ALERT_FILES = [
  "src/routes/alerts.manage.tsx",
  "src/routes/alerts.confirm.tsx",
  "src/components/board/alert-signup-form.tsx",
  "src/components/board/alerts-band.tsx",
  "src/components/job-alert-floating-prompt.tsx",
];

describe("public alert shadcn contract", () => {
  it.each(PUBLIC_ALERT_FILES)("%s has no legacy presentation imports", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");

    expect(source).not.toMatch(/@untitledui\/icons/);
    expect(source).not.toMatch(/@\/components\/application\//);
    expect(source).not.toMatch(/@\/components\/base\//);
    expect(source).not.toMatch(/@\/components\/text/);
    expect(source).not.toMatch(/@\/utils\/cx/);

    if (file.startsWith("src/routes/")) {
      expect(source).toContain("staticData: { ownsMain: true }");
    }
  });
});
