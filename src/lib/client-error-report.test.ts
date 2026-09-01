// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CLIENT_ERROR_PATH,
  reportClientError,
  resetClientErrorReports,
} from "./client-error-report";

describe("reportClientError", () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  const sendBeacon = vi.fn().mockReturnValue(false);

  beforeEach(() => {
    fetchMock.mockClear();
    sendBeacon.mockClear();
    sendBeacon.mockReturnValue(false);
    resetClientErrorReports();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", {
      ...navigator,
      sendBeacon,
    });
    window.history.replaceState({}, "", "/talent?selectedTalent=ruth-chebet");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs a same-origin keepalive payload and prefers sendBeacon", () => {
    sendBeacon.mockReturnValue(true);
    const error = Object.assign(new Error("Invalid time value"), {
      name: "RangeError",
    });

    reportClientError(error);

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon).toHaveBeenCalledWith(CLIENT_ERROR_PATH, expect.any(Blob));
    const blob = sendBeacon.mock.calls[0]?.[1];
    expect(blob).toBeInstanceOf(Blob);
    if (blob instanceof Blob) {
      expect(blob.type).toBe("application/json");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to keepalive fetch when sendBeacon is unavailable", () => {
    const error = Object.assign(new Error("Invalid time value"), {
      name: "RangeError",
    });

    reportClientError(error);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      CLIENT_ERROR_PATH,
      expect.objectContaining({
        method: "POST",
        keepalive: true,
        credentials: "same-origin",
        body: expect.stringMatching(
          /"name":"RangeError".*"message":"Invalid time value".*"path":"\/talent"/s,
        ),
      }),
    );
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        body: expect.stringContaining(`"host":"${window.location.host}"`),
      }),
    );
  });

  it("dedupes the same crash so a render loop cannot flood the Worker", () => {
    const error = Object.assign(new Error("Maximum update depth exceeded"), {
      name: "Error",
    });

    reportClientError(error);
    reportClientError(error);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
