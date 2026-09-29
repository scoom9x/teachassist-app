// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { demoSnapshot } from "../src/demo";
import { averageTrend, courseTrends } from "../src/trends";
import { withCourseDetail } from "../src/sync";
import { snapshotFor } from "../src/storage";
import { Trends } from "../src/TrendsPage";
it("averages available marks without counting lunch or missing values", () => {
  const snapshot = demoSnapshot();
  snapshot.history = [
    {
      date: snapshot.updated,
      marks: { ENG: 80, MAT: 90, ART: null, LUNCH: 100 },
    },
  ];
  expect(averageTrend(snapshot)[0]).toMatchObject({ value: 85, count: 2 });
  snapshot.history[0].marks = { ENG: null };
  expect(averageTrend(snapshot)[0].value).toBeNull();
});
it("records finals and duplicate course codes separately in new overall samples", () => {
  const snapshot = demoSnapshot();
  const course = snapshot.reports.courses[0];
  snapshot.reports.courses = [
    { ...course, id: "one", mark: 70, final: 80 },
    { ...course, id: "two", mark: 90 },
  ];
  const next = snapshotFor(snapshot.reports, null);
  expect(averageTrend(next)[0]).toMatchObject({ value: 85, count: 2 });
  expect(courseTrends(next, "one")[0].points[0].value).toBe(80);
});
it("saves category samples and preserves them through report refreshes without inventing older values", () => {
  const snapshot = demoSnapshot();
  snapshot.categoryHistory = {};
  const course = snapshot.reports.courses[0];
  const detail = structuredClone(snapshot.details[course.id]);
  detail.categories[0].achievement = "Unavailable";
  const next = withCourseDetail(snapshot, course, detail);
  const category = courseTrends(next, course.id).find(
    (series) => series.name === detail.categories[0].name,
  )!;
  expect(category.points).toHaveLength(1);
  expect(category.points[0].value).toBeNull();
  expect(snapshotFor(next.reports, next).categoryHistory).toEqual(
    next.categoryHistory,
  );
  expect(
    snapshotFor({ ...next.reports, student: "Another student" }, next)
      .categoryHistory,
  ).toEqual({});
});
it("keeps trend marks out of the page until privacy is explicitly revealed", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () =>
    root.render(
      <Trends
        snapshot={demoSnapshot()}
        courseId={null}
        privateMarks
        onBack={vi.fn()}
      />,
    ),
  );
  expect(host.querySelector(".trend-card")).toBeNull();
  await act(async () =>
    [...host.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Reveal trends"))!
      .click(),
  );
  expect(host.querySelector(".trend-card svg")).not.toBeNull();
  await act(async () => root.unmount());
});
