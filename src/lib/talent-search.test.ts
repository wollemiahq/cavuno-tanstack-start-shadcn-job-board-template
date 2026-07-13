import { describe, expect, it } from "vitest";

import {
  parseTalentSearch,
  talentListingLoaderDeps,
  talentSearchSubmission,
} from "./talent-search";

describe("parseTalentSearch", () => {
  it("keeps only trimmed Talent listing and selection state", () => {
    expect(
      parseTalentSearch({
        q: "  product researcher  ",
        skill: "  accessibility  ",
        cursor: "  next-page-token  ",
        selectedTalent: "  ada-lovelace  ",
        query: "company-only query",
        page: "3",
      }),
    ).toEqual({
      q: "product researcher",
      skill: "accessibility",
      cursor: "next-page-token",
      selectedTalent: "ada-lovelace",
    });
  });

  it("drops blank and non-string URL values", () => {
    expect(
      parseTalentSearch({
        q: "  ",
        skill: 42,
        cursor: null,
        selectedTalent: ["ada-lovelace"],
      }),
    ).toEqual({
      q: undefined,
      skill: undefined,
      cursor: undefined,
      selectedTalent: undefined,
    });
  });
});

describe("talentListingLoaderDeps", () => {
  it("keeps listing inputs while excluding the selected detail pane", () => {
    const first = talentListingLoaderDeps(
      parseTalentSearch({
        q: "researcher",
        skill: "accessibility",
        cursor: "next-page-token",
        selectedTalent: "first-candidate",
      }),
    );
    const second = talentListingLoaderDeps(
      parseTalentSearch({
        q: "researcher",
        skill: "accessibility",
        cursor: "next-page-token",
        selectedTalent: "second-candidate",
      }),
    );

    expect(first).toEqual({
      q: "researcher",
      skill: "accessibility",
      cursor: "next-page-token",
    });
    expect(first).toEqual(second);
    expect(first).not.toHaveProperty("selectedTalent");
  });
});

describe("talentSearchSubmission", () => {
  it("canonicalizes the submitted filters and clears pagination plus selection", () => {
    expect(
      talentSearchSubmission(
        {
          q: "designer",
          skill: "Figma",
          cursor: "next-page-token",
          selectedTalent: "ada-lovelace",
        },
        {
          q: "  product researcher  ",
          skill: "  accessibility  ",
        },
      ),
    ).toEqual({
      q: "product researcher",
      skill: "accessibility",
      cursor: undefined,
      selectedTalent: undefined,
    });
  });

  it("removes blank submitted filters together with stale result state", () => {
    expect(
      talentSearchSubmission(
        {
          q: "designer",
          skill: "Figma",
          cursor: "next-page-token",
          selectedTalent: "ada-lovelace",
        },
        { q: "  ", skill: "" },
      ),
    ).toEqual({
      q: undefined,
      skill: undefined,
      cursor: undefined,
      selectedTalent: undefined,
    });
  });
});
