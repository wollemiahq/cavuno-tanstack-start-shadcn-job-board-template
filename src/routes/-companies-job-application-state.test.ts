import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getBoardContext,
  getCompany,
  getJob,
  getSeoBase,
  getSessionUser,
  getSimilarJobs,
  myApplicationForJob,
} = vi.hoisted(() => ({
  getBoardContext: vi.fn(),
  getCompany: vi.fn(),
  getJob: vi.fn(),
  getSeoBase: vi.fn(),
  getSessionUser: vi.fn(),
  getSimilarJobs: vi.fn(),
  myApplicationForJob: vi.fn(),
}));

vi.mock("../server/queries", () => ({
  getBoardContext,
  getCompany,
  getJob,
  getSeoBase,
  getSimilarJobs,
  subscribeJobAlert: vi.fn(),
}));

vi.mock("../server/account", () => ({
  getSessionUser,
  saveJob: vi.fn(),
}));

vi.mock("../server/applications", () => ({
  applyToJob: vi.fn(),
  myApplicationForJob,
}));

import { Route } from "./companies.$companySlug.jobs.$jobSlug";

beforeEach(() => {
  getJob.mockReset();
  getBoardContext.mockReset();
  getSessionUser.mockReset();
  getSimilarJobs.mockReset();
  getCompany.mockReset();
  getSeoBase.mockReset();
  myApplicationForJob.mockReset();
  getJob.mockResolvedValue({ id: "job-1", slug: "platform-engineer" });
  getBoardContext.mockResolvedValue({ name: "Board" });
  getSessionUser.mockResolvedValue({ emailVerified: true });
  getSimilarJobs.mockResolvedValue({ data: [] });
  getCompany.mockResolvedValue(null);
  getSeoBase.mockResolvedValue({ origin: "https://board.example" });
  myApplicationForJob.mockResolvedValue({ id: "application-1" });
});

describe("full job application state", () => {
  it("loads prior application state for a verified returning candidate", async () => {
    const loader = Route.options.loader;
    if (typeof loader !== "function") throw new Error("Expected a route loader");

    const data = await loader({
      params: { companySlug: "acme", jobSlug: "platform-engineer" },
    } as never);

    expect(myApplicationForJob).toHaveBeenCalledWith({
      data: { jobSlug: "platform-engineer" },
    });
    expect(data).toMatchObject({ alreadyApplied: true });
  });

  it("does not request private application state for an unverified viewer", async () => {
    getSessionUser.mockResolvedValue({ emailVerified: false });

    const loader = Route.options.loader;
    if (typeof loader !== "function") throw new Error("Expected a route loader");
    const data = await loader({
      params: { companySlug: "acme", jobSlug: "platform-engineer" },
    } as never);

    expect(myApplicationForJob).not.toHaveBeenCalled();
    expect(data).toMatchObject({ alreadyApplied: false });
  });

  it("keeps a valid public job available when private application state fails", async () => {
    myApplicationForJob.mockRejectedValue(new Error("Private state unavailable"));

    const loader = Route.options.loader;
    if (typeof loader !== "function") throw new Error("Expected a route loader");
    const data = await loader({
      params: { companySlug: "acme", jobSlug: "platform-engineer" },
    } as never);

    expect(data).toMatchObject({
      job: { slug: "platform-engineer" },
      alreadyApplied: false,
    });
  });
});
