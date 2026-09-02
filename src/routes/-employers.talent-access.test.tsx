// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import type { ComponentProps } from "react";

import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";

import { renderRouted } from "@/test/render-routed";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EmployersTalentAccessView } from "./-employers.talent-access";

import { m } from "@/paraglide/messages";
import type { TalentAccessGrant } from "@/server/talent-access";
import type { Plan, TalentAccessCheckoutSession } from "@cavuno/board";

const talentPlan = {
  object: "plan",
  id: "plan-talent",
  name: "Talent access — monthly",
  description: "Reach candidates",
  purpose: "talent_access",
  kind: "subscription",
  billingInterval: "month",
  isRecommended: true,
  displayOrder: 1,
  invoiceOnly: false,
  publishTiming: "on_payment",
  netTermsDays: null,
  price: {
    currency: "usd",
    amountCents: 4900,
    stripePriceId: "price_talent",
  },
  featureSummary: {
    durationDays: 30,
    maxActiveJobs: 0,
    featuredSlots: 0,
    featureSelectionMode: "manual",
  },
} satisfies Plan;

const emptyGrant = {
  object: "talent_access",
  isEmployer: true,
  paywallActive: true,
  hasTalentAccess: false,
  hasUnlimitedUnlocks: false,
  accessModel: "paid_messaging",
  companyId: "company-acme",
  unlockCreditsRemaining: 0,
  messageCreditsRemaining: 0,
  hasUnlimitedMessages: false,
} satisfies TalentAccessGrant;

const kit = {
  object: "checkout_session",
  sessionId: "cs_talent",
  clientSecret: "secret",
  stripeAccountId: "acct_1",
  publishableKey: "pk_test",
  offerType: "recurring",
} satisfies TalentAccessCheckoutSession;

const mocks = {
  getTalentAccessGrant: vi.fn(),
  startCheckout: vi.fn(),
  upgrade: vi.fn(),
  openBillingPortal: vi.fn(),
  invalidate: vi.fn(),
  reportActionError: vi.fn(),
};

async function renderEmployers(options?: {
  sessionId?: string;
  viewer?: ComponentProps<typeof EmployersTalentAccessView>["viewer"];
  hasTalentAccess?: boolean;
}) {
  return await renderRouted(
    <EmployersTalentAccessView
      plans={[talentPlan]}
      salesLed={[]}
      seo={{ boardName: "Example Jobs" }}
      sessionId={options?.sessionId}
      viewer={
        options?.viewer ?? {
          kind: "employer",
          hasTalentAccess: options?.hasTalentAccess ?? false,
          companyId: "company-acme",
          companySlug: "acme-ventures",
        }
      }
      getTalentAccessGrantAction={mocks.getTalentAccessGrant}
      startCheckoutAction={mocks.startCheckout}
      upgradeAction={mocks.upgrade}
      openBillingPortalAction={mocks.openBillingPortal}
      invalidate={mocks.invalidate}
      reportActionError={mocks.reportActionError}
    />,
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("employer talent-access checkout", () => {
  it("starts embedded checkout for a signed-in employer without access", async () => {
    mocks.startCheckout.mockResolvedValue({ ok: true, data: kit });

    await renderEmployers();
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    await waitFor(() => {
      expect(mocks.startCheckout).toHaveBeenCalledWith({
        data: {
          planId: "plan-talent",
          returnPath: "/employers",
          companyId: "company-acme",
        },
      });
    });
    expect(screen.getByRole("heading", { name: "Complete your purchase" })).toBeVisible();
  });

  it("words a refusal from its code rather than the generic failure toast", async () => {
    // A buyer with two approved companies has no single company to charge, and
    // "something went wrong" would not tell them what to do about it.
    mocks.startCheckout.mockResolvedValue({
      ok: false,
      code: "company_required",
      message: "Choose a company before buying talent access.",
    });

    await renderEmployers();
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    await waitFor(() => {
      expect(mocks.reportActionError).toHaveBeenCalledWith(m.boardError_companyRequiredText());
    });
    expect(screen.queryByRole("heading", { name: "Complete your purchase" })).toBeNull();
  });

  it("polls the grant after a Stripe return until talent access lands", async () => {
    vi.useFakeTimers();
    mocks.getTalentAccessGrant
      .mockResolvedValueOnce(emptyGrant)
      .mockResolvedValueOnce({ ...emptyGrant, hasTalentAccess: true });
    mocks.invalidate.mockResolvedValue(undefined);

    await renderEmployers({ sessionId: "cs_talent" });
    expect(screen.getByText("Confirming your purchase…")).toBeVisible();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mocks.invalidate).toHaveBeenCalled();
  });

  it("upgrades in place when the employer already holds talent access", async () => {
    mocks.upgrade.mockResolvedValue({
      ok: true,
      data: { object: "talent_upgrade", ok: true },
    });
    mocks.invalidate.mockResolvedValue(undefined);

    await renderEmployers({ hasTalentAccess: true });
    fireEvent.click(screen.getByRole("button", { name: "Upgrade" }));

    await waitFor(() => {
      expect(mocks.upgrade).toHaveBeenCalledWith({
        data: { planId: "plan-talent", companyId: "company-acme" },
      });
      expect(mocks.startCheckout).not.toHaveBeenCalled();
    });
  });

  it("opens the company billing portal for an entitled employer", async () => {
    mocks.openBillingPortal.mockResolvedValue({
      ok: true,
      data: {
        object: "portal_session",
        url: "https://billing.example/session",
      },
    });
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "" },
    });

    await renderEmployers({ hasTalentAccess: true });
    fireEvent.click(screen.getByRole("button", { name: "Manage billing" }));

    await waitFor(() => {
      expect(mocks.openBillingPortal).toHaveBeenCalledWith({
        data: {
          companySlug: "acme-ventures",
          returnPath: "/employers",
        },
      });
      expect(window.location.href).toBe("https://billing.example/session");
    });

    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it("keeps anonymous viewers on the join path", async () => {
    await renderEmployers({ viewer: { kind: "anonymous" } });

    expect(screen.getByRole("link", { name: "Subscribe" })).toHaveAttribute(
      "href",
      "/auth/join?returnTo=%2Femployers",
    );
    expect(screen.queryByRole("button", { name: "Subscribe" })).toBeNull();
  });
});
