// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getJob } = vi.hoisted(() => ({ getJob: vi.fn() }));

vi.mock("../server/queries", () => ({ getJob }));

import { useSelectedJob } from "./-use-selected-job";

function job(slug: string) {
  return { id: `id-${slug}`, slug, title: slug };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

beforeEach(() => getJob.mockReset());
afterEach(cleanup);

describe("useSelectedJob", () => {
  it("loads the URL-selected job and preserves the previous pane during transition", async () => {
    getJob.mockResolvedValueOnce(job("first-job"));
    const nextJob = deferred<ReturnType<typeof job>>();
    getJob.mockReturnValueOnce(nextJob.promise);

    const { result, rerender } = renderHook(({ slug }) => useSelectedJob(slug), {
      initialProps: { slug: "first-job" as string | undefined },
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.job?.slug).toBe("first-job");

    rerender({ slug: "second-job" });
    await waitFor(() => expect(result.current.status).toBe("loading"));
    expect(result.current.job?.slug).toBe("first-job");

    await act(async () => nextJob.resolve(job("second-job")));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.job?.slug).toBe("second-job");
  });

  it("exposes a recoverable error and retries the same selection", async () => {
    getJob
      .mockRejectedValueOnce(new Error("Temporary outage"))
      .mockResolvedValueOnce(job("first-job"));

    const { result } = renderHook(() => useSelectedJob("first-job"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(getJob).toHaveBeenCalledTimes(2);
  });

  it("does not fetch when mobile has no pane selection", () => {
    const { result } = renderHook(() => useSelectedJob(undefined));

    expect(result.current.status).toBe("idle");
    expect(getJob).not.toHaveBeenCalled();
  });
});
