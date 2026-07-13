// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { searchPlaces } = vi.hoisted(() => ({ searchPlaces: vi.fn() }));

vi.mock("../server/queries", () => ({ searchPlaces }));

import { useLocationSuggestions } from "./-use-location-suggestions";

beforeEach(() => {
  vi.useFakeTimers();
  searchPlaces.mockReset();
  searchPlaces.mockResolvedValue({ data: [] });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

describe("useLocationSuggestions — route-owned place loading", () => {
  it("waits for a meaningful query and debounces the Board request", async () => {
    const { result } = renderHook(() => useLocationSuggestions("en"));

    act(() => result.current.onQueryChange("L"));
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(searchPlaces).not.toHaveBeenCalled();

    act(() => result.current.onQueryChange("Lon"));
    await act(async () => vi.advanceTimersByTimeAsync(150));
    expect(searchPlaces).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(60));

    expect(searchPlaces).toHaveBeenCalledWith({ data: { q: "Lon", limit: 10 } });
  });
});
