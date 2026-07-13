// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompanySearchControls } from "./company-search-controls";

const labels = {
  query: "Company name",
  queryPlaceholder: "Search companies…",
  market: "Market",
  allMarkets: "All markets",
  search: "Search",
};

const markets = [
  { slug: "technology", name: "Technology" },
  { slug: "healthcare", name: "Healthcare" },
];

afterEach(cleanup);

describe("CompanySearchControls", () => {
  it("submits the company query and exposes a non-native market filter", () => {
    const onSubmit = vi.fn();
    render(
      <CompanySearchControls
        query="acme"
        markets={markets}
        labels={labels}
        onSubmit={onSubmit}
        onMarketChange={vi.fn()}
      />,
    );

    const query = screen.getByRole("searchbox", { name: "Company name" });
    expect(query).toHaveValue("acme");
    expect(screen.getByRole("combobox", { name: "Market" }).tagName).toBe("BUTTON");

    fireEvent.change(query, { target: { value: "orbital" } });
    fireEvent.submit(query.closest("form") as HTMLFormElement);

    expect(onSubmit).toHaveBeenCalledWith("orbital");
  });

  it("restores the submitted query when browser history changes route state", () => {
    const { rerender } = render(
      <CompanySearchControls
        query="acme"
        markets={markets}
        labels={labels}
        onSubmit={vi.fn()}
        onMarketChange={vi.fn()}
      />,
    );

    rerender(
      <CompanySearchControls
        query="harborline"
        markets={markets}
        labels={labels}
        onSubmit={vi.fn()}
        onMarketChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("searchbox", { name: "Company name" })).toHaveValue("harborline");
  });

  it("preserves the typed company query when the market filter navigates", () => {
    const onMarketChange = vi.fn();
    render(
      <CompanySearchControls
        query="acme"
        markets={markets}
        labels={labels}
        onSubmit={vi.fn()}
        onMarketChange={onMarketChange}
      />,
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Company name" }), {
      target: { value: "orbital" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "Market" }));
    const technology = screen.getByRole("option", { name: "Technology" });
    fireEvent.pointerDown(technology, { pointerType: "mouse" });
    fireEvent.click(technology);

    expect(onMarketChange).toHaveBeenCalledWith("technology", "orbital");
  });
});
