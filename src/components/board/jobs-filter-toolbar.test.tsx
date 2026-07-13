// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JobsFilterToolbar } from "./jobs-filter-toolbar";

afterEach(cleanup);

const labels = {
  workplace: "Workplace",
  anyWorkplace: "Any workplace",
  employmentType: "Type",
  anyEmploymentType: "Any type",
  seniority: "Seniority",
  allFilters: "All filters",
  filters: "Filters",
  sheetDescription: "Narrow the jobs shown in these results.",
  reset: "Reset",
  apply: "Apply filters",
  cancel: "Cancel",
};

const options = {
  workplace: [
    { value: "remote", label: "Remote" },
    { value: "hybrid", label: "Hybrid" },
  ],
  employmentType: [
    { value: "full-time", label: "Full-time" },
    { value: "part-time", label: "Part-time" },
  ],
  seniority: [
    { value: "junior", label: "Junior" },
    { value: "senior", label: "Senior" },
  ],
};

describe("JobsFilterToolbar", () => {
  it("commits a desktop workplace selection immediately", () => {
    const onApply = vi.fn();

    render(
      <JobsFilterToolbar
        labels={labels}
        options={options}
        value={{ employmentType: "full-time", seniority: ["senior"] }}
        onApply={onApply}
        onReset={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Workplace" }));
    const remoteOption = screen.getByRole("option", { name: "Remote" });
    fireEvent.pointerDown(remoteOption, { pointerType: "mouse" });
    fireEvent.click(remoteOption);

    expect(onApply).toHaveBeenCalledWith({
      workplace: "remote",
      employmentType: "full-time",
      seniority: ["senior"],
    });
  });

  it("shows the active selection count and offers an immediate desktop reset", () => {
    const onReset = vi.fn();

    render(
      <JobsFilterToolbar
        labels={labels}
        options={options}
        value={{
          workplace: "remote",
          employmentType: "full-time",
          seniority: ["junior", "senior"],
        }}
        onApply={vi.fn()}
        onReset={onReset}
      />,
    );

    expect(within(screen.getByRole("button", { name: /All filters/ })).getByText("4")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("keeps every mobile filter in a draft until Apply", () => {
    const onApply = vi.fn();

    render(
      <JobsFilterToolbar
        labels={labels}
        options={options}
        value={{}}
        onApply={onApply}
        onReset={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    const sheet = screen.getByRole("dialog", { name: "Filters" });

    fireEvent.click(within(sheet).getByRole("combobox", { name: "Workplace" }));
    const hybridOption = screen.getByRole("option", { name: "Hybrid" });
    fireEvent.pointerDown(hybridOption, { pointerType: "mouse" });
    fireEvent.click(hybridOption);

    fireEvent.click(within(sheet).getByRole("combobox", { name: "Type" }));
    const partTimeOption = screen.getByRole("option", { name: "Part-time" });
    fireEvent.pointerDown(partTimeOption, { pointerType: "mouse" });
    fireEvent.click(partTimeOption);

    fireEvent.click(within(sheet).getByRole("checkbox", { name: "Senior" }));
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.click(within(sheet).getByRole("button", { name: "Apply filters" }));
    expect(onApply).toHaveBeenCalledWith({
      workplace: "hybrid",
      employmentType: "part-time",
      seniority: ["senior"],
    });
  });

  it("discards All filters edits when the sheet is cancelled", () => {
    const onApply = vi.fn();

    render(
      <JobsFilterToolbar
        labels={labels}
        options={options}
        value={{ workplace: "remote", seniority: ["senior"] }}
        onApply={onApply}
        onReset={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /All filters/ }));
    let sheet = screen.getByRole("dialog", { name: "All filters" });
    fireEvent.click(within(sheet).getByRole("checkbox", { name: "Junior" }));
    fireEvent.click(within(sheet).getByRole("button", { name: "Cancel" }));

    expect(onApply).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /All filters/ }));
    sheet = screen.getByRole("dialog", { name: "All filters" });
    expect(
      within(sheet).getByRole("checkbox", { name: "Junior" }).getAttribute("aria-checked"),
    ).toBe("false");
    expect(
      within(sheet).getByRole("checkbox", { name: "Senior" }).getAttribute("aria-checked"),
    ).toBe("true");
  });
});
