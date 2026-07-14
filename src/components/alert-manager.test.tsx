// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Alert } from "@cavuno/board";

const mocks = vi.hoisted(() => ({
  createMyAlert: vi.fn(),
  deleteMyAlert: vi.fn(),
  invalidate: vi.fn(),
  updateMyAlert: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, useRouter: () => ({ invalidate: mocks.invalidate }) };
});

vi.mock("../server/account", () => ({
  createMyAlert: mocks.createMyAlert,
  deleteMyAlert: mocks.deleteMyAlert,
  updateMyAlert: mocks.updateMyAlert,
}));

import { AlertManager } from "./alert-manager";

const alert = {
  id: "alert-1",
  object: "alert",
  label: "Frontend roles",
  frequency: "weekly",
  isActive: true,
  filters: {
    jobFunctions: ["Engineering"],
    seniorityLevels: [],
    remoteOptions: ["remote"],
    placeIds: [],
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
  },
  lastSentAt: null,
} satisfies Alert;

const secondAlert = {
  ...alert,
  id: "alert-2",
  label: "Design roles",
} satisfies Alert;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AlertManager", () => {
  it("prevents duplicate deletes, then shows a retryable error without invalidating", async () => {
    let rejectDelete: (error: Error) => void = () => undefined;
    mocks.deleteMyAlert.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectDelete = reject;
        }),
    );
    render(<AlertManager alerts={[alert, secondAlert]} />);

    const [deleteButton, otherDeleteButton] = screen.getAllByRole("button", { name: "Delete" });
    fireEvent.click(deleteButton);
    fireEvent.click(deleteButton);

    expect(mocks.deleteMyAlert).toHaveBeenCalledTimes(1);
    expect(deleteButton).toBeDisabled();
    expect(otherDeleteButton).toBeDisabled();

    rejectDelete(new Error("network unavailable"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
      expect(deleteButton).toBeEnabled();
    });
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
});
