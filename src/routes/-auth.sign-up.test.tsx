// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useRouter: () => ({ invalidate: mocks.invalidate }),
  };
});

vi.mock("../server/auth", () => ({ signUp: mocks.signUp }));
vi.mock("../server/queries", () => ({ getBoardContext: vi.fn() }));

import { Route } from "./auth.sign-up";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("/auth/sign-up search contract", () => {
  it("validates a complete internal candidate destination", () => {
    const validate = Route.options.validateSearch;
    if (typeof validate !== "function") {
      throw new Error("The candidate sign-up route must validate search");
    }

    expect(validate({ returnTo: "/jobs?q=design&selectedJob=product-designer" })).toEqual({
      returnTo: "/jobs?q=design&selectedJob=product-designer",
    });
  });

  it("keeps the destination in the post-registration verification action", async () => {
    const returnTo = "/jobs?q=design&selectedJob=product-designer";
    vi.spyOn(Route, "useSearch").mockReturnValue({ returnTo });
    vi.spyOn(Route, "useLoaderData").mockReturnValue({ boardName: "Cavuno Jobs" });
    mocks.signUp.mockResolvedValue({ ok: true });
    const SignUpPage = Route.options.component;
    if (!SignUpPage) throw new Error("The candidate sign-up route needs a component");

    render(<SignUpPage />);
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-horse" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    const action = await screen.findByRole("link", { name: "Go to my account" });
    const url = new URL(action.getAttribute("href")!, "https://board.example");
    expect(url.pathname).toBe("/auth/verify-email-required");
    expect(url.searchParams.get("returnTo")).toBe(returnTo);
  });
});
