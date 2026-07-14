// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type {
  OverallSalaryVM,
  SalaryFaqVM,
  SalaryRailVM,
  SeniorityTableVM,
} from "@/board/salary-view-model";

import {
  OverallSalaryCard,
  SalaryEmptyState,
  SalaryFaq,
  SalaryRail,
  SenioritySalaryTable,
} from "./salary-sections";

afterEach(cleanup);

const overall: OverallSalaryVM = {
  headlineLabel: "Average salary",
  headlineValue: "$120,000–$160,000",
  perYearSuffix: "/ yr",
  stats: [
    { label: "25th percentile", value: "$110,000" },
    { label: "Median", value: "$140,000", emphasis: true },
    { label: "Based on", value: "12 jobs" },
  ],
};

const seniority: SeniorityTableVM = {
  headers: {
    level: "Experience level",
    avg: "Average",
    baseline: "Board average",
    diff: "vs board",
  },
  rows: [
    {
      key: "senior",
      level: "Senior",
      avg: "$150,000–$180,000",
      baseline: "$140,000–$170,000",
      diff: { text: "+6%", positive: true },
    },
    {
      key: "principal",
      level: "Principal",
      avg: "$175,000–$205,000",
      baseline: "—",
      diff: null,
    },
  ],
};

const rail: SalaryRailVM = {
  title: "Top companies",
  items: [
    {
      name: "Acme Robotics",
      href: "/companies/acme-robotics/salaries",
      range: "$130,000–$175,000",
      jobCountLabel: "7 jobs",
      logoPath: null,
    },
    {
      name: "Long Range Labs",
      href: "/companies/long-range-labs/salaries",
      range: "$125,000–$168,000",
      jobCountLabel: "3 jobs",
      logoPath: "https://cdn.example/long-range-labs.png",
    },
  ],
};

const faq: SalaryFaqVM = {
  heading: "Frequently asked questions",
  items: [
    {
      q: "What affects the salary range?",
      a: "Experience, location, and role scope all contribute.",
    },
  ],
};

function closestOwnedCard(element: HTMLElement) {
  return element.matches("[data-slot='card']")
    ? element
    : (element.closest("[data-slot='card']") ?? element.querySelector("[data-slot='card']"));
}

describe("salary sections — owned shadcn presentation", () => {
  it("renders every resolved salary metric in a theme-owned Card", () => {
    render(<OverallSalaryCard vm={overall} />);

    for (const label of ["Average salary", "25th percentile", "Median", "Based on"]) {
      expect(closestOwnedCard(screen.getByText(label))).not.toBeNull();
    }
    expect(screen.getByText("$120,000–$160,000")).toBeVisible();
    expect(screen.getByText("/ yr")).toBeVisible();
  });

  it("uses the owned shadcn Table while preserving honest missing comparisons", () => {
    const { container } = render(<SenioritySalaryTable vm={seniority} />);

    const table = container.querySelector("table[data-slot='table']");
    expect(table).not.toBeNull();
    expect(
      within(table as HTMLElement).getByRole("columnheader", { name: "Experience level" }),
    ).toBeVisible();
    const principalRow = within(table as HTMLElement).getByRole("row", { name: /Principal/ });
    expect(principalRow).toHaveTextContent("$175,000–$205,000");
    expect(principalRow).toHaveTextContent("—");
  });

  it("keeps every salary rail item a real crawlable anchor backed by an owned Card", () => {
    const { container } = render(<SalaryRail vm={rail} />);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/companies/acme-robotics/salaries",
      "/companies/long-range-labs/salaries",
    ]);
    for (const link of links) {
      expect(closestOwnedCard(link)).not.toBeNull();
    }
    expect(container.querySelectorAll("[data-slot='avatar']")).toHaveLength(2);
    expect(screen.getByText("AR")).toBeVisible();
  });

  it("renders FAQs as semantic question-answer pairs on owned Cards", () => {
    render(<SalaryFaq vm={faq} />);

    const question = screen.getByText("What affects the salary range?");
    expect(question.tagName).toBe("DT");
    expect(screen.getByText("Experience, location, and role scope all contribute.").tagName).toBe(
      "DD",
    );
    expect(closestOwnedCard(question)).not.toBeNull();
  });

  it("uses the shared shadcn Empty composition without inventing salary data", () => {
    render(
      <SalaryEmptyState
        title="No salary data yet"
        description="Salary figures appear after matching jobs are published."
      />,
    );

    const title = screen.getByText("No salary data yet");
    const empty = title.closest("[data-slot='empty']");
    expect(empty).not.toBeNull();
    expect(
      within(empty as HTMLElement).getByText(
        "Salary figures appear after matching jobs are published.",
      ),
    ).toBeVisible();
    expect(empty).not.toHaveTextContent("$0");
  });
});
