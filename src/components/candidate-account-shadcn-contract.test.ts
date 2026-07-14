import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const CANDIDATE_ACCOUNT_FILES = [
  "src/routes/account.tsx",
  "src/routes/account.saved.tsx",
  "src/routes/account.access.tsx",
  "src/routes/me.applications.tsx",
  "src/routes/me.alerts.tsx",
  "src/routes/settings.tsx",
  "src/components/profile-form.tsx",
  "src/components/avatar-upload.tsx",
  "src/components/resume-upload.tsx",
  "src/components/experience-section.tsx",
  "src/components/education-section.tsx",
  "src/components/skills-section.tsx",
  "src/components/languages-section.tsx",
  "src/components/danger-zone.tsx",
  "src/components/alert-manager.tsx",
  "src/components/notification-settings.tsx",
  "src/components/board/job-card.tsx",
];

const CANDIDATE_MUTATION_FILES = [
  "src/routes/account.saved.tsx",
  "src/routes/me.applications.tsx",
  "src/components/experience-section.tsx",
  "src/components/education-section.tsx",
  "src/components/skills-section.tsx",
  "src/components/languages-section.tsx",
  "src/components/alert-manager.tsx",
  "src/components/notification-settings.tsx",
];

const CANDIDATE_TEXTAREA_FILES = [
  "src/components/profile-form.tsx",
  "src/components/experience-section.tsx",
  "src/components/education-section.tsx",
];

describe("candidate account shadcn contract", () => {
  it.each(CANDIDATE_ACCOUNT_FILES)("%s has no legacy presentation imports", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");

    expect(source).not.toMatch(/@untitledui\/icons/);
    expect(source).not.toMatch(/@\/components\/base\//);
    expect(source).not.toMatch(/@\/components\/text/);
    expect(source).not.toMatch(/@\/utils\/cx/);

    if (file.startsWith("src/routes/")) {
      expect(source).toContain("staticData: { ownsMain: true }");
      expect(source).toContain("pendingComponent: CandidateRoutePendingPage");
      expect(source).toContain("errorComponent: CandidateRouteErrorPage");
    }
  });

  it.each(CANDIDATE_MUTATION_FILES)("%s exposes recoverable mutation feedback", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");

    expect(source).toContain("CandidateActionFeedback");
  });

  it.each(CANDIDATE_TEXTAREA_FILES)("%s uses the owned shadcn textarea", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");

    expect(source).toContain('from "@/components/ui/textarea"');
    expect(source).not.toMatch(/<textarea\b/);
    expect(source).toMatch(/<Textarea\b/);
  });

  it("keeps LLM-facing account, auth, and form patterns aligned with shadcn/Base UI", () => {
    for (const file of [
      "docs/patterns/account-shell.md",
      "docs/patterns/auth-page.md",
      "docs/patterns/form-page.md",
    ]) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source).not.toContain("Untitled UI");
      expect(source).toMatch(/shadcn|Base UI/);
    }
  });
});
