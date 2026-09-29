// @vitest-environment jsdom
import { vi, it, expect } from "vitest";
const { set } = vi.hoisted(() => ({ set: vi.fn() }));
vi.mock("../src/api", () => ({ native: false }));
vi.mock("@aparajita/capacitor-secure-storage", () => ({
  SecureStorage: { set },
}));
import { snapshotFor, saveCredentials, readCredentials } from "../src/storage";
it("never uses the unencrypted web credential fallback", async () => {
  await expect(saveCredentials("user", "secret")).rejects.toThrow("native app");
  expect(set).not.toHaveBeenCalled();
  expect(await readCredentials()).toBeNull();
});
it("separates cached reports and history when switching accounts", () => {
  const first = snapshotFor(
    { student: "A", school: "School", courses: [] },
    null,
  );
  first.details.secret = {
    code: "private",
    assessments: [],
    categories: [],
    generated: "",
  };
  const second = snapshotFor(
    { student: "B", school: "School", courses: [] },
    first,
  );
  expect(second.details).toEqual({});
  expect(second.history).toHaveLength(1);
});
it("bounds retained grade snapshots", () => {
  const report = { student: "A", school: "School", courses: [] };
  let snapshot = snapshotFor(report, null);
  for (let i = 0; i < 1005; i++) snapshot = snapshotFor(report, snapshot);
  expect(snapshot.history).toHaveLength(1000);
});
