// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { overwriteGetLocale } from "@/paraglide/runtime";

import { ListingPagination } from "./listing-pagination";

beforeEach(() => {
  overwriteGetLocale(() => "en");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

afterEach(() => {
  cleanup();
  overwriteGetLocale(() => "en");
});

describe("ListingPagination — owned shadcn navigation", () => {
  it("renders nothing for one page and otherwise mounts the single shadcn pagination composition", () => {
    const { container, rerender } = render(
      <ListingPagination page={1} count={20} pageSize={20} onPageChange={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
    rerender(<ListingPagination page={2} count={60} pageSize={20} onPageChange={vi.fn()} />);

    const pagination = screen.getByRole("navigation", { name: "Pagination" });
    expect(pagination).toHaveAttribute("data-slot", "pagination");
    expect(within(pagination).getByText("2").closest("[aria-current='page']")).not.toBeNull();
    expect(within(pagination).getByLabelText(/previous page/i)).toBeEnabled();
    expect(within(pagination).getByLabelText(/next page/i)).toBeEnabled();
  });

  it("sends previous, numbered-page, and next choices through the URL-navigation callback", () => {
    const onPageChange = vi.fn();
    render(<ListingPagination page={2} count={80} pageSize={20} onPageChange={onPageChange} />);

    const pagination = screen.getByRole("navigation", { name: "Pagination" });
    fireEvent.click(within(pagination).getByLabelText(/previous page/i));
    fireEvent.click(within(pagination).getByText("4"));
    fireEvent.click(within(pagination).getByLabelText(/next page/i));

    expect(onPageChange.mock.calls).toEqual([[1], [4], [3]]);
  });
});
