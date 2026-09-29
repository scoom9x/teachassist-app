// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { act } from "react";
import { demoSnapshot } from "../src/demo";
const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  save: vi.fn(),
  publish: vi.fn(),
  configure: vi.fn(),
  get: vi.fn(),
}));
vi.mock("../src/SchoolWeather", () => ({ SchoolWeather: () => null }));
vi.mock("../src/api", async (original) => ({
  ...(await original<typeof import("../src/api")>()),
  native: true,
  login: mocks.login,
}));
vi.mock("../src/nativeUpdates", () => ({
  publishGrades: mocks.publish,
  GradeUpdates: { configure: mocks.configure },
}));
vi.mock("../src/storage", async (original) => ({
  ...(await original<typeof import("../src/storage")>()),
  readSnapshot: async () => ({ ...demoSnapshot(), username: "student" }),
  readCredentials: async () => ({ username: "student", password: "test" }),
  saveSnapshot: mocks.save,
}));
vi.mock("../src/sync", async (original) => ({
  ...(await original<typeof import("../src/sync")>()),
  syncCourseReports: async (snapshot: unknown) => ({ snapshot, warning: "" }),
}));
vi.mock("@capacitor/preferences", () => ({
  Preferences: { get: mocks.get, set: vi.fn() },
}));
it("restores the last page, refreshes on startup, and polls at the saved interval", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.scrollTo = vi.fn();
  vi.useFakeTimers();
  mocks.get.mockResolvedValue({
    value: JSON.stringify({ pollMinutes: 5, notifications: false }),
  });
  mocks.login.mockResolvedValue(demoSnapshot().reports);
  mocks.publish.mockResolvedValue(undefined);
  mocks.configure.mockResolvedValue(undefined);
  localStorage.setItem(
    "teach-assist.last-page:student",
    JSON.stringify({ page: "grades" }),
  );
  document.body.innerHTML = '<div id="root"></div>';
  await act(async () => {
    await import("../src/main");
  });
  expect(document.querySelector("main")?.textContent).toContain(
    "Grades & assignments",
  );
  expect(mocks.login).toHaveBeenCalledTimes(1);
  expect(mocks.save).toHaveBeenCalled();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(299999);
  });
  expect(mocks.login).toHaveBeenCalledTimes(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(mocks.login).toHaveBeenCalledTimes(2);
  vi.useRealTimers();
});
