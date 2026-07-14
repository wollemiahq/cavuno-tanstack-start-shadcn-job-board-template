// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AccessGrant, PaywallOffer } from "@cavuno/board";

const mocks = vi.hoisted(() => ({
  getAccessGrant: vi.fn(),
  getPaywallOffers: vi.fn(),
  invalidate: vi.fn(),
  openBillingPortal: vi.fn(),
  startCheckout: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, useRouter: () => ({ invalidate: mocks.invalidate }) };
});

vi.mock("../server/paywall", () => ({
  getAccessGrant: mocks.getAccessGrant,
  getPaywallOffers: mocks.getPaywallOffers,
  openBillingPortal: mocks.openBillingPortal,
  startCheckout: mocks.startCheckout,
}));

import { AccessPage, Route } from "./account.access";

const grant = {
  object: "access_grant",
  hasAccess: false,
  status: null,
  offerType: null,
  offerKey: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
} satisfies AccessGrant;

const offer = {
  object: "paywall_offer",
  offerKey: "monthly",
  label: "Monthly access",
  billingLabel: "per month",
  amountCents: 1200,
  currency: "usd",
  offerType: "recurring",
  intervalUnit: "month",
  intervalCount: 1,
  isDefault: true,
} satisfies PaywallOffer;

const annualOffer = {
  ...offer,
  offerKey: "annual",
  label: "Annual access",
  billingLabel: "per year",
  amountCents: 12000,
  intervalUnit: "year",
  isDefault: false,
} satisfies PaywallOffer;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("candidate access actions", () => {
  it("disables every offer while checkout is starting", async () => {
    vi.spyOn(Route, "useLoaderData").mockReturnValue({
      grant,
      offers: [offer, annualOffer],
    });
    vi.spyOn(Route, "useSearch").mockReturnValue({ session_id: undefined });
    let rejectCheckout!: (reason?: unknown) => void;
    mocks.startCheckout.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectCheckout = reject;
        }),
    );

    render(<AccessPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "Choose" })[0]!);

    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }

    await act(async () => {
      rejectCheckout(new Error("checkout unavailable"));
    });
  });

  it("shows a recoverable alert and re-enables checkout when session creation fails", async () => {
    vi.spyOn(Route, "useLoaderData").mockReturnValue({ grant, offers: [offer] });
    vi.spyOn(Route, "useSearch").mockReturnValue({ session_id: undefined });
    mocks.startCheckout.mockRejectedValue(new Error("checkout unavailable"));

    render(<AccessPage />);
    fireEvent.click(screen.getByRole("button", { name: "Choose" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
      expect(screen.getByRole("button", { name: "Choose" })).toBeEnabled();
    });
  });

  it("shows a recoverable alert and re-enables the billing portal after failure", async () => {
    vi.spyOn(Route, "useLoaderData").mockReturnValue({
      grant: { ...grant, hasAccess: true, status: "active", offerType: "recurring" },
      offers: [],
    });
    vi.spyOn(Route, "useSearch").mockReturnValue({ session_id: undefined });
    mocks.openBillingPortal.mockRejectedValue(new Error("portal unavailable"));

    render(<AccessPage />);
    fireEvent.click(screen.getByRole("button", { name: "Manage subscription" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
      expect(screen.getByRole("button", { name: "Manage subscription" })).toBeEnabled();
    });
  });

  it("turns a rejected grant poll into visible feedback with a refresh action", async () => {
    vi.useFakeTimers();
    vi.spyOn(Route, "useLoaderData").mockReturnValue({ grant, offers: [] });
    vi.spyOn(Route, "useSearch").mockReturnValue({ session_id: "checkout-session" });
    mocks.getAccessGrant.mockRejectedValue(new Error("grant unavailable"));

    render(<AccessPage />);
    expect(screen.getByText("Confirming your purchase…")).toBeVisible();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
    expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
  });
});
