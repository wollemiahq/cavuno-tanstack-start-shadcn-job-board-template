import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clientErrorIngestUrl,
  matchClientErrorIngest,
  resetClientErrorIngestRateLimit,
  STARTER_OUCH_LOG_NAME,
} from "./client-error-ingest";
import { CLIENT_ERROR_PATH } from "./client-error-report";

describe("clientErrorIngestUrl", () => {
  it("sends production Board API traffic to the app ingest, not api.cavuno.com", () => {
    expect(clientErrorIngestUrl("https://api.cavuno.com")).toBe(
      "https://cavuno.com/api/board-client-error",
    );
  });

  it("keeps local Board API traffic on the same origin", () => {
    expect(clientErrorIngestUrl("http://localhost:3000/api")).toBe(
      "http://localhost:3000/api/board-client-error",
    );
  });
});

describe("matchClientErrorIngest", () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
  const warn = vi.fn();

  beforeEach(() => {
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    warn.mockClear();
    resetClientErrorIngestRateLimit();
    vi.stubGlobal("fetch", fetchMock);
    // Replace the suite-wide "unexpected console.warn" stub from setup.ts.
    console.warn = warn;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ignores unrelated paths", async () => {
    const response = await matchClientErrorIngest(new Request("https://preview.example/talent"), {
      apiUrl: "https://api.cavuno.com",
      board: "pk_test",
    });
    expect(response).toBeNull();
  });

  it("forwards a valid report and stays silent on success", async () => {
    const waited: Promise<void>[] = [];
    const response = await matchClientErrorIngest(
      new Request(`https://preview-abc.cavuno.app${CLIENT_ERROR_PATH}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "RangeError",
          message: "Invalid time value",
          path: "/talent",
          host: "preview-abc.cavuno.app",
        }),
      }),
      { apiUrl: "https://api.cavuno.com", board: "pk_test" },
      (promise) => {
        waited.push(promise);
      },
    );

    expect(response?.status).toBe(204);
    await Promise.all(waited);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://cavuno.com/api/board-client-error",
      expect.objectContaining({
        method: "POST",
        body: expect.stringMatching(/"publishableKey":"pk_test".*"name":"RangeError"/s),
      }),
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it(`console.warns ${STARTER_OUCH_LOG_NAME} when the platform ingest is down`, async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const waited: Promise<void>[] = [];
    await matchClientErrorIngest(
      new Request(`https://preview-abc.cavuno.app${CLIENT_ERROR_PATH}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "RangeError",
          message: "Invalid time value",
          path: "/talent",
          host: "preview-abc.cavuno.app",
        }),
      }),
      { apiUrl: "https://api.cavuno.com", board: "pk_test" },
      (promise) => {
        waited.push(promise);
      },
    );
    await Promise.all(waited);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`"name":"${STARTER_OUCH_LOG_NAME}"`));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"preview":true'));
  });
});
