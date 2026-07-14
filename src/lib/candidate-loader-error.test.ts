import { describe, expect, it } from "vitest";

import { candidateLoaderError } from "./candidate-loader-error";

describe("candidateLoaderError", () => {
  it("classifies an unauthenticated server-function failure for sign-in continuity", () => {
    expect(candidateLoaderError(new Error("UNAUTHENTICATED"))).toBe("unauthenticated");
  });

  it("classifies an unverified candidate for verification continuity", () => {
    expect(candidateLoaderError(new Error("EMAIL_UNVERIFIED"))).toBe("email-unverified");
  });

  it("does not turn an unrelated service failure into an auth redirect", () => {
    expect(candidateLoaderError(new Error("Service unavailable"))).toBeNull();
  });

  it("does not classify non-error values", () => {
    expect(candidateLoaderError("UNAUTHENTICATED")).toBeNull();
  });
});
