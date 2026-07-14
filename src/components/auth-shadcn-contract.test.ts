import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const AUTH_PRESENTATION_FILES = [
  "src/components/auth-form.tsx",
  "src/routes/auth.sign-in.tsx",
  "src/routes/auth.forgot-password.tsx",
  "src/routes/auth.reset-password.tsx",
  "src/routes/auth.verify-email-required.tsx",
  "src/routes/auth.verify-email.tsx",
  "src/routes/auth.magic-link.tsx",
  "src/routes/auth.oauth-complete.tsx",
];

describe("candidate auth shadcn contract", () => {
  it.each(AUTH_PRESENTATION_FILES)("%s has no legacy presentation imports", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");

    expect(source).not.toMatch(/@untitledui\/icons/);
    expect(source).not.toMatch(/@\/components\/base\//);
    expect(source).not.toMatch(/@\/components\/text/);
  });
});
