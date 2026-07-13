// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSearchSelection } from "./use-search-selection";

function setDesktop(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(min-width: 48rem)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function Harness({
  selectedJob,
  jobSlugs = ["first-job", "second-job"],
  onReplace = vi.fn(),
  onPush = vi.fn(),
}: {
  selectedJob?: string;
  jobSlugs?: string[];
  onReplace?: (jobSlug: string) => void;
  onPush?: (jobSlug: string) => void;
}) {
  const selection = useSearchSelection({
    selectedId: selectedJob,
    resultIds: jobSlugs,
    onReplace,
    onPush,
  });

  return (
    <div>
      <output data-testid="selected-job">{selection.selectedId}</output>
      <div
        ref={(node) => {
          selection.detailRef.current = node;
          if (node) node.scrollTo = vi.fn();
        }}
        data-testid="detail-pane"
      />
      <a
        href="/companies/acme/jobs/second-job"
        onClick={(event) => selection.onResultActivate(event, "second-job")}
      >
        Second job
      </a>
    </div>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useSearchSelection", () => {
  it("replaces an absent or invalid desktop selection with the first result", async () => {
    setDesktop(true);
    const onReplace = vi.fn();

    render(<Harness selectedJob="removed-job" onReplace={onReplace} />);

    await waitFor(() => expect(onReplace).toHaveBeenCalledWith("first-job"));
    expect(onReplace).toHaveBeenCalledTimes(1);
  });

  it("pushes an explicit desktop selection and resets only the detail pane", () => {
    setDesktop(true);
    const onPush = vi.fn();

    render(<Harness selectedJob="first-job" onPush={onPush} />);
    const detailPane = screen.getByTestId("detail-pane");

    fireEvent.click(screen.getByRole("link", { name: "Second job" }));

    expect(onPush).toHaveBeenCalledWith("second-job");
    expect(detailPane.scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  it("leaves modified activation to the canonical anchor", () => {
    setDesktop(true);
    const onPush = vi.fn();

    render(<Harness selectedJob="first-job" onPush={onPush} />);
    const detailPane = screen.getByTestId("detail-pane");

    fireEvent.click(screen.getByRole("link", { name: "Second job" }), {
      metaKey: true,
    });

    expect(onPush).not.toHaveBeenCalled();
    expect(detailPane.scrollTo).not.toHaveBeenCalled();
  });

  it("does not inject a selection or intercept activation on mobile", async () => {
    setDesktop(false);
    const onReplace = vi.fn();
    const onPush = vi.fn();

    render(<Harness onReplace={onReplace} onPush={onPush} />);

    expect(screen.getByTestId("selected-job").textContent).toBe("");
    await waitFor(() => expect(onReplace).not.toHaveBeenCalled());

    fireEvent.click(screen.getByRole("link", { name: "Second job" }));
    expect(onPush).not.toHaveBeenCalled();
  });
});
