import { expect, it } from "vitest";
import { demoSnapshot } from "../src/demo";
import { detailChanges, reportChanges } from "../src/history";
import { withCourseDetail } from "../src/sync";

it("tracks grade direction and unavailable grades without inventing a decrease", () => {
  const before = demoSnapshot().reports;
  const after = structuredClone(before);
  after.courses[0].mark = 90;
  after.courses[1].mark = 89;
  after.courses[2].mark = null;
  expect(reportChanges(before, after).map((c) => c.direction)).toEqual([
    "up",
    "down",
    "changed",
  ]);
  expect(reportChanges(before, before)).toEqual([]);
  expect(reportChanges(undefined, after)).toEqual([]);
});
it("records score, feedback, added and removed assessments; ignores generation dates", () => {
  const snapshot = demoSnapshot();
  const course = snapshot.reports.courses[0];
  const before = snapshot.details[course.id];
  const after = structuredClone(before);
  after.generated = "new date";
  expect(detailChanges(course, before, after)).toEqual([]);
  after.assessments[0].scores[0].text = "19 / 20 = 95% weight=1";
  after.assessments[0].comment = "Updated feedback";
  after.assessments.pop();
  after.assessments.push({ name: "New task", comment: "", scores: [] });
  const changes = detailChanges(course, before, after);
  expect(changes).toHaveLength(4);
  expect(changes[0].direction).toBe("up");
  const saved = withCourseDetail(snapshot, course, after);
  expect(saved.changes).toHaveLength(snapshot.changes!.length + 4);
  expect(withCourseDetail(saved, course, after).changes).toEqual(saved.changes);
});
