// @vitest-environment jsdom
import { vi, expect, it, beforeEach } from "vitest";
const { fetchCourse } = vi.hoisted(() => ({ fetchCourse: vi.fn() }));
vi.mock("../src/api", () => ({
  fetchCourse,
  AuthError: class AuthError extends Error {},
}));
import { syncCourseReports } from "../src/sync";
import { AuthError } from "../src/api";
import { demoSnapshot } from "../src/demo";
beforeEach(() => {
  fetchCourse.mockReset();
});
it("requests every linked individual page and stores full details", async () => {
  const snapshot = demoSnapshot();
  const expected = snapshot.details;
  snapshot.details = {};
  fetchCourse.mockImplementation(
    async (url: string) =>
      expected[new URL(url).searchParams.get("subject_id")!],
  );
  const result = await syncCourseReports(snapshot);
  expect(fetchCourse.mock.calls.map((call) => call[0])).toEqual(
    snapshot.reports.courses.filter((c) => c.url).map((c) => c.url),
  );
  expect(Object.keys(result.snapshot.details)).toHaveLength(3);
  expect(result.snapshot.details["demo-1"].assessments).toHaveLength(3);
  expect(result.snapshot.details["demo-1"].categories).toHaveLength(4);
  expect(Object.keys(result.snapshot.detailUpdated)).toHaveLength(3);
  expect(result.warning).toBe("");
});
it("keeps cached details on a failed page and continues with other courses", async () => {
  const snapshot = demoSnapshot();
  const old = snapshot.details["demo-1"];
  fetchCourse
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(snapshot.details["demo-2"])
    .mockResolvedValueOnce(snapshot.details["demo-3"]);
  const result = await syncCourseReports(snapshot);
  expect(result.snapshot.details["demo-1"]).toBe(old);
  expect(result.snapshot.detailUpdated["demo-1"]).toBeUndefined();
  expect(result.snapshot.detailUpdated["demo-2"]).toBeTruthy();
  expect(result.warning).toContain("ENG3U1");
});
it("stops on session expiry instead of treating login HTML as a course", async () => {
  fetchCourse.mockRejectedValue(new AuthError("expired"));
  const result = await syncCourseReports(demoSnapshot());
  expect(fetchCourse).toHaveBeenCalledTimes(1);
  expect(result.warning).toContain("session expired");
});
it("rejects details returned for the wrong course", async () => {
  const snapshot = demoSnapshot();
  fetchCourse.mockResolvedValue({
    ...snapshot.details["demo-1"],
    code: "WRONG",
  });
  const result = await syncCourseReports(snapshot);
  expect(result.snapshot.detailUpdated).toEqual({});
  expect(result.warning).toContain("ENG3U1");
});
it("matches headingless OE details by subject and rejects mismatches", async () => {
  const snapshot = demoSnapshot();
  fetchCourse.mockImplementation(async (url: string) => ({
    code: "",
    subjectId: new URL(url).searchParams.get("subject_id"),
    format: "expectations",
    assessments: [],
    categories: [],
    generated: "",
  }));
  const result = await syncCourseReports(snapshot);
  expect(result.warning).toBe("");
  expect(Object.keys(result.snapshot.detailUpdated)).toHaveLength(3);
  fetchCourse.mockResolvedValue({
    code: "",
    subjectId: "wrong",
    assessments: [],
    categories: [],
  });
  expect((await syncCourseReports(snapshot)).warning).toContain(
    "Could not update",
  );
});
