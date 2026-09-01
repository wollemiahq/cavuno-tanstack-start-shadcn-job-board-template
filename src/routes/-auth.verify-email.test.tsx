// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = {
  getSeoBase: vi.fn().mockResolvedValue({
    boardName: "Acme Board",
    language: "en",
    origin: "https://board.example",
  }),
  verifyEmail: vi.fn(),
  getSessionUser: vi.fn(),
};

import { loadVerifyEmail, VerifyEmailView } from "./-auth.verify-email";
import { Route } from "./auth.verify-email";

function verifyEmailLoader(token: string, returnTo: string) {
  return loadVerifyEmail(
    { token, returnTo },
    {
      getSeoBase: mocks.getSeoBase,
      getSessionUserStrict: mocks.getSessionUser,
      verifyEmail: mocks.verifyEmail,
    },
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("/auth/verify-email search contract", () => {
  it("maps a rejecting loader to the invalid card instead of throwing", async () => {
    mocks.verifyEmail.mockRejectedValue(new Error("token consumed"));
    const result = await verifyEmailLoader("tok", "/account");
    expect(result).toMatchObject({ status: "invalid", returnTo: "/account" });
  });

  it("validates a supplied candidate destination with the token", () => {
    const validate = Route.options.validateSearch;
    if (!validate) {
      throw new Error("The email verification route must validate search");
    }
    if ("parse" in validate) {
      expect(
        validate.parse({
          token: "one-time-token",
          returnTo: "/jobs?q=design&selectedJob=product-designer",
        }),
      ).toEqual({
        token: "one-time-token",
        returnTo: "/jobs?q=design&selectedJob=product-designer",
      });
      return;
    }
    if ("~standard" in validate) {
      throw new Error("The email verification route uses an unexpected schema");
    }

    expect(
      validate({
        token: "one-time-token",
        returnTo: "/jobs?q=design&selectedJob=product-designer",
      }),
    ).toEqual({
      token: "one-time-token",
      returnTo: "/jobs?q=design&selectedJob=product-designer",
    });
  });

  it("offers the validated destination after successful verification", () => {
    const returnTo = "/jobs?q=design&selectedJob=product-designer";
    render(<VerifyEmailView status="verified" returnTo={returnTo} />);

    expect(screen.getByRole("link", { name: "Go to my account" })).toHaveAttribute(
      "href",
      returnTo,
    );
  });

  it("uses same-browser employer session truth after consuming the token", async () => {
    mocks.verifyEmail.mockResolvedValue({ ok: true });
    mocks.getSessionUser
      .mockResolvedValueOnce({
        id: "employer-1",
        role: "employer",
        emailVerified: false,
      })
      .mockResolvedValueOnce({
        id: "employer-1",
        role: "employer",
        emailVerified: true,
      });
    await expect(verifyEmailLoader("one-time-token", "/jobs?q=design")).resolves.toMatchObject({
      status: "verified",
      returnTo: "/employers/dashboard",
    });
  });

  it("keeps the safe candidate fallback for anonymous verification", async () => {
    mocks.verifyEmail.mockResolvedValue({ ok: true });
    mocks.getSessionUser.mockResolvedValue(null);
    await expect(
      verifyEmailLoader("one-time-token", "https://attacker.example/phish"),
    ).resolves.toMatchObject({
      status: "verified",
      returnTo: "/account",
    });
  });

  it("does not infer the token subject from an unrelated verified session", async () => {
    mocks.verifyEmail.mockResolvedValue({ ok: true });
    mocks.getSessionUser.mockResolvedValue({
      id: "other-employer",
      role: "employer",
      emailVerified: true,
    });
    await expect(verifyEmailLoader("candidate-token", "/account")).resolves.toMatchObject({
      status: "verified",
      returnTo: "/account",
    });
    expect(mocks.getSessionUser).toHaveBeenCalledOnce();
  });

  it("still shows the missing-token card when SEO context throws", async () => {
    mocks.getSeoBase.mockRejectedValue(new Error("seo unavailable"));
    await expect(verifyEmailLoader("", "/account")).resolves.toMatchObject({
      status: "missing-token",
    });
  });

  it("still verifies a valid token when the session profile probe throws", async () => {
    mocks.getSessionUser.mockRejectedValue(new Error("profile unavailable"));
    mocks.verifyEmail.mockResolvedValue({ ok: true });
    await expect(verifyEmailLoader("one-time-token", "/account")).resolves.toMatchObject({
      status: "verified",
      returnTo: "/account",
    });
    expect(mocks.verifyEmail).toHaveBeenCalledOnce();
  });

  it("renders the verified card, not the route error title, after a successful verify", () => {
    render(<VerifyEmailView status="verified" returnTo="/account" />);
    expect(screen.getByRole("heading", { name: "Email verified" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Something went wrong" })).not.toBeInTheDocument();
  });
});
