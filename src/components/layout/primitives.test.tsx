// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Bleed } from "./bleed";
import { Box } from "./box";
import { Container } from "./container";
import { Grid } from "./grid";
import { Stack } from "./stack";

afterEach(cleanup);

describe("layout primitives", () => {
  it("Box chooses semantic HTML and forwards non-visual native attributes", () => {
    render(
      <Box
        as="section"
        id="candidate-summary"
        aria-label="Candidate summary"
        data-test="candidate-summary"
        padding={{ base: "4", md: "8" }}
        background="card"
        border="all"
        radius="xl"
      >
        Summary
      </Box>,
    );

    const section = screen.getByRole("region", { name: "Candidate summary" });
    expect(section).toHaveAttribute("id", "candidate-summary");
    expect(section).toHaveAttribute("data-test", "candidate-summary");
    expect(section).toHaveTextContent("Summary");
  });

  it("Stack can express a responsive semantic list without changing its children", () => {
    render(
      <Stack
        as="ul"
        aria-label="Search filters"
        direction={{ base: "column", md: "row" }}
        gap={{ base: "2", md: "4" }}
        align={{ base: "stretch", md: "center" }}
        justify="between"
        wrap="wrap"
      >
        <li>Location</li>
        <li>Job type</li>
      </Stack>,
    );

    const list = screen.getByRole("list", { name: "Search filters" });
    expect(list.tagName).toBe("UL");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("Grid preserves list semantics for responsive result matrices", () => {
    render(
      <Grid as="ol" aria-label="Companies" columns={{ base: 1, sm: 2, lg: 3 }} gap="5">
        <li>Acme</li>
        <li>Globex</li>
      </Grid>,
    );

    expect(screen.getByRole("list", { name: "Companies" }).tagName).toBe("OL");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("Container and Bleed retain the caller-selected landmarks", () => {
    render(
      <Container
        as="nav"
        width="content"
        gutter={{ base: "4", md: "8" }}
        aria-label="Company navigation"
      >
        <Bleed as="section" aria-label="Sponsored jobs">
          Sponsored content
        </Bleed>
      </Container>,
    );

    expect(screen.getByRole("navigation", { name: "Company navigation" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Sponsored jobs" })).toHaveTextContent(
      "Sponsored content",
    );
  });
});

/**
 * `pnpm run typecheck` checks test files, so these rejected calls keep the
 * layout seam token-backed. The function is never run.
 */
function _typeContract() {
  return (
    <>
      {/* @ts-expect-error — layout primitives deliberately have no className escape hatch. */}
      <Box className="p-7">No bypass</Box>
      {/* @ts-expect-error — inline style is the same undocumented geometry escape hatch. */}
      <Stack style={{ gap: 7 }}>No bypass</Stack>
      {/* @ts-expect-error — responsive objects need an explicit mobile-first base. */}
      <Stack direction={{ md: "row" }}>Missing base</Stack>
      {/* @ts-expect-error — arbitrary spacing values are outside the token scale. */}
      <Box padding="7">No arbitrary spacing</Box>
      {/* @ts-expect-error — the generic matrix deliberately stops at four columns. */}
      <Grid columns={5}>Too many columns</Grid>
      {/* @ts-expect-error — main is owned by PageContent, not a primitive. */}
      <Container as="main">Duplicate main</Container>
      <Bleed data-test="valid-bleed">Valid</Bleed>
    </>
  );
}

void _typeContract;
