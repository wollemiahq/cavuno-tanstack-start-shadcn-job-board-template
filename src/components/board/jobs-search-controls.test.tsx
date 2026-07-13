// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

/**
 * JobsSearchControls — the keyword box is SUBMIT-ONLY (CAV-517).
 *
 * The operator complaint: the keyword `<Input>` pushed the URL on EVERY
 * keystroke ("or" → `?q=or` mid-type). The contract this locks:
 *   - typing the keyword updates only local state — it does NOT call
 *     `onChange` (the route's navigate), so the URL never moves per keystroke;
 *   - the URL is committed ONLY on form submit (Enter in the field or the
 *     Search button), carrying the typed keyword;
 *   - the box seeds from `filters.q` so a `?q=robotics` load shows "robotics";
 *   - the inline clear (the X inside the input) empties the field locally
 *     without navigating (submit-only still applies).
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ListingFilters } from "@cavuno/board/filters";

import { JobsSearchControls } from "./jobs-search-controls";

const locationSuggestion = {
  id: "place-sydney",
  slug: "sydney",
  name: "Sydney",
  contextLabel: "New South Wales, Australia",
};

afterEach(cleanup);

const searchbox = () => screen.getByRole("searchbox") as HTMLInputElement;

describe("JobsSearchControls — keyword is submit-only (CAV-517)", () => {
  it("typing the keyword does NOT navigate (no per-keystroke onChange)", () => {
    const onChange = vi.fn();
    render(<JobsSearchControls filters={{}} language="en" onChange={onChange} />);

    fireEvent.change(searchbox(), { target: { value: "ro" } });
    fireEvent.change(searchbox(), { target: { value: "rob" } });

    expect(searchbox().value).toBe("rob");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("submitting the form commits the typed keyword to the filters", () => {
    const onChange = vi.fn();
    const { container } = render(
      <JobsSearchControls filters={{}} language="en" onChange={onChange} />,
    );

    fireEvent.change(searchbox(), { target: { value: "robotics" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ q: "robotics" });
  });

  it("seeds the keyword box from filters.q on load", () => {
    const filters: ListingFilters = { q: "robotics" };
    render(<JobsSearchControls filters={filters} language="en" onChange={vi.fn()} />);

    expect(searchbox().value).toBe("robotics");
  });

  it("the inline clear empties the keyword field without navigating", () => {
    const onChange = vi.fn();
    render(<JobsSearchControls filters={{ q: "robotics" }} language="en" onChange={onChange} />);
    expect(searchbox().value).toBe("robotics");

    fireEvent.click(screen.getByLabelText("Clear search"));

    expect(searchbox().value).toBe("");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("JobsSearchControls — keyword and location share one submission", () => {
  it("uses one Rhea search surface for both fields and the filters", () => {
    const { container } = render(
      <JobsSearchControls
        filters={{}}
        language="en"
        onChange={vi.fn()}
        locationSuggestions={{
          suggestions: [],
          loading: false,
          onQueryChange: vi.fn(),
        }}
      />,
    );

    const form = container.querySelector("[data-slot='jobs-search-form']");
    expect(form).toHaveClass("bg-card");
    expect(form?.querySelector("[data-slot='input'][type='search']")).toBeInTheDocument();
    expect(form).toContainElement(screen.getByRole("combobox", { name: /location/i }));
  });

  it("commits both fields only when their shared form is submitted", () => {
    const onChange = vi.fn();
    const onSearchSubmit = vi.fn();
    const { container } = render(
      <JobsSearchControls
        filters={{}}
        language="en"
        onChange={onChange}
        onSearchSubmit={onSearchSubmit}
        locationSuggestions={{
          suggestions: [locationSuggestion],
          loading: false,
          onQueryChange: vi.fn(),
        }}
      />,
    );

    fireEvent.change(searchbox(), { target: { value: "product designer" } });
    fireEvent.change(screen.getByRole("combobox", { name: /location/i }), {
      target: { value: "Syd" },
    });
    fireEvent.mouseDown(screen.getByRole("option", { name: /Sydney/i }));

    expect(onChange).not.toHaveBeenCalled();
    expect(onSearchSubmit).not.toHaveBeenCalled();

    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    expect(onSearchSubmit).toHaveBeenCalledWith(
      { q: "product designer" },
      { slug: "sydney", name: "Sydney" },
    );
  });

  it("restores the committed location beside the committed keyword", () => {
    render(
      <JobsSearchControls
        filters={{ q: "product designer" }}
        language="en"
        onChange={vi.fn()}
        onSearchSubmit={vi.fn()}
        location={{ slug: "sydney", label: "Sydney" }}
        locationSuggestions={{
          suggestions: [],
          loading: false,
          onQueryChange: vi.fn(),
        }}
      />,
    );

    expect(searchbox().value).toBe("product designer");
    expect((screen.getByRole("combobox", { name: /location/i }) as HTMLInputElement).value).toBe(
      "Sydney",
    );
  });
});
