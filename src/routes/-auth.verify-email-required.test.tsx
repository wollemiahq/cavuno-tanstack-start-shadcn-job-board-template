// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn(),
  navigate: vi.fn(),
  resendOtp: vi.fn(),
  verifyOtpCode: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useRouter: () => ({
      invalidate: mocks.invalidate,
      navigate: mocks.navigate,
    }),
  };
});

vi.mock("../server/auth", () => ({
  resendOtp: mocks.resendOtp,
  verifyOtpCode: mocks.verifyOtpCode,
}));

import { Route } from "./auth.verify-email-required";

const OriginalResizeObserver = globalThis.ResizeObserver;

beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterAll(() => {
  globalThis.ResizeObserver = OriginalResizeObserver;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("/auth/verify-email-required search contract", () => {
  it("validates a complete internal candidate destination", () => {
    const validate = Route.options.validateSearch;
    if (typeof validate !== "function") {
      throw new Error("The verification gate must validate its search parameters");
    }

    expect(validate({ returnTo: "/jobs?q=design&selectedJob=product-designer" })).toEqual({
      returnTo: "/jobs?q=design&selectedJob=product-designer",
    });
  });

  it("returns a verified candidate to the validated destination", async () => {
    const returnTo = "/jobs?q=design&selectedJob=product-designer";
    vi.spyOn(Route, "useSearch").mockReturnValue({ returnTo });
    mocks.verifyOtpCode.mockResolvedValue({ ok: true });
    const VerifyPage = Route.options.component;
    if (!VerifyPage) throw new Error("The verification route needs a component");

    const { container } = render(<VerifyPage />);
    fireEvent.change(container.querySelector('input[name="code"]')!, {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify email" }));

    await waitFor(() => {
      expect(mocks.verifyOtpCode).toHaveBeenCalledWith({
        data: { code: "123456" },
      });
      expect(mocks.invalidate).toHaveBeenCalledOnce();
      expect(mocks.navigate).toHaveBeenCalledWith({ href: returnTo });
    });
  });

  it("recovers when email verification rejects unexpectedly", async () => {
    vi.spyOn(Route, "useSearch").mockReturnValue({ returnTo: "/account" });
    mocks.verifyOtpCode.mockRejectedValue(new Error("network unavailable"));
    const VerifyPage = Route.options.component;
    if (!VerifyPage) throw new Error("The verification route needs a component");

    const { container } = render(<VerifyPage />);
    fireEvent.change(container.querySelector('input[name="code"]')!, {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify email" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Try again.",
    );
    expect(screen.getByRole("button", { name: "Verify email" })).toBeEnabled();
  });

  it("recovers when resending the verification code rejects unexpectedly", async () => {
    vi.spyOn(Route, "useSearch").mockReturnValue({ returnTo: "/account" });
    mocks.resendOtp.mockRejectedValue(new Error("network unavailable"));
    const VerifyPage = Route.options.component;
    if (!VerifyPage) throw new Error("The verification route needs a component");

    render(<VerifyPage />);
    fireEvent.click(screen.getByRole("button", { name: "Resend code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Try again.",
    );
    expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled();
  });

  it("keeps the destination when returning to sign in", () => {
    const returnTo = "/jobs?q=design&selectedJob=product-designer";
    vi.spyOn(Route, "useSearch").mockReturnValue({ returnTo });
    const VerifyPage = Route.options.component;
    if (!VerifyPage) throw new Error("The verification route needs a component");

    render(<VerifyPage />);

    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute(
      "href",
      `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
    );
  });
});
