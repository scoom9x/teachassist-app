// @vitest-environment jsdom
import { it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import {
  parseSchoolCalendar,
  calendarICS,
  googleEventUrl,
} from "../src/schoolCalendar";
import { parseReports } from "../src/parser";
it("extracts nested months, multiple events, and today's bold date", () => {
  const events = parseSchoolCalendar(
    '<table><tr><td colspan="7"><b>September 2026</b></td></tr><tr><td valign="top"><font><b>28</b><div class="box">Day 1</div><div class="box">School meeting</div></font></td></tr></table><table><tr><td colspan="7">January 2027</td></tr><tr><td valign="top">4<div class="box">Return to school</div></td></tr></table>',
  );
  expect(events.map((e) => [e.date, e.title])).toEqual([
    ["2026-09-28", "School meeting"],
    ["2027-01-04", "Return to school"],
  ]);
  expect(() => parseSchoolCalendar("<h1>Log in</h1>")).toThrow();
});
it("exports all-day events across year boundaries and escapes calendar text", () => {
  const event = {
    id: "1",
    date: "2026-12-31",
    title: "Meeting, students; staff",
    notes: "One\nTwo",
  };
  const ics = calendarICS([event], "School");
  expect(ics).toContain("DTEND;VALUE=DATE:20270101");
  expect(ics).toContain("SUMMARY:Meeting\\, students\\; staff");
  expect(ics).toContain("DESCRIPTION:One\\nTwo");
  const url = new URL(googleEventUrl(event, "School"));
  expect(url.searchParams.get("dates")).toBe("20261231/20270101");
  expect(url.searchParams.get("text")).toBe(event.title);
});
it("finds the student's school calendar link without hardcoding a school", () => {
  const reports = parseReports(
    '<h1>Student Reports for test</h1><table><tr><th>Course Name</th></tr></table><a href="calendar_full.php?school_id=123">Full Year Calendar</a>',
  );
  expect(reports.calendarUrl).toBe(
    "https://ta.yrdsb.ca/live/students/calendar_full.php?school_id=123",
  );
});
const sample =
  "/Users/lenny/Downloads/Bayview Secondary School School Full Calendar.html";
it.skipIf(!existsSync(sample))("reads the supplied full school year", () => {
  const events = parseSchoolCalendar(readFileSync(sample, "utf8"));
  expect(events).toContainEqual(
    expect.objectContaining({ date: "2026-10-12", title: "Thanksgiving Day" }),
  );
  expect(events.length).toBeGreaterThan(10);
  expect(events.some((e) => e.date.startsWith("2027-06"))).toBe(true);
});
it("omits daily schedule labels while retaining real events", () => {
 const events = parseSchoolCalendar('<table><tr><td colspan="7">September 2026</td></tr><tr><td valign="top">28<div class="box">Day 1</div><div class="box">Day 2</div><div class="box">Picture Day</div></td></tr></table>');
 expect(events.map(e => e.title)).toEqual(["Picture Day"]);
});
