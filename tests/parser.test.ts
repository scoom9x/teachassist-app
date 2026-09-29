// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { parseReports, parseDetail, safeUrl, isLoginPage } from "../src/parser";
const listing = `<h1>Student Reports for test-student</h1><h2>Test school</h2><table><tr><th>Course Name</th><th>Date</th><th>Mark</th></tr><tr><td>ENG3U1-1 : English<br>Block: P1 - rm. 201</td><td>2026-01-30 ~ 2026-06-24</td><td><span>MIDTERM MARK: 85%</span><a href="/live/students/viewReport.php?subject_id=1&student_id=2">current mark = 87.5%</a></td></tr><tr><td>ART3U1-1 : Art<br>Block: P2 - rm. 202</td><td>dates</td><td>See teacher</td></tr></table>`;
const course = `<h2>ENG3U1-1</h2><table><tr><th>Assignment</th><td>Knowledge</td><td>Thinking</td></tr><tr><td rowspan="2">Essay &amp; reflection</td><td><table><tr><td>9 / 10 = 90%<br>weight=2</td></tr></table></td><td><table><tr><td bgcolor="#ffaaaa">0 / 10 = 0% weight=1</td></tr></table></td></tr><tr><td colspan="2">Good work</td></tr></table><table><tr><td><table><tr><th>Category</th><th>Weighting</th><th>Course Weighting</th><th>Student Achievement</th></tr><tr><td>Knowledge</td><td>25%</td><td>17.5%</td><td>90%</td></tr><tr><td colspan="2">Final/Culminating</td><td>30%</td><td>0%</td></tr></table></td></tr></table>`;
describe("reports parser", () => {
  it("extracts listing fields and leaves unavailable marks null", () => {
    const r = parseReports(listing);
    expect(r.student).toBe("test-student");
    expect(r.courses[0]).toMatchObject({
      code: "ENG3U1-1",
      name: "English",
      mark: 87.5,
      midterm: 85,
      block: "P1",
      room: "201",
    });
    expect(r.courses[1].url).toBeNull();
    expect(r.courses[1].mark).toBeNull();
  });
  it("rejects login pages and unrelated successful HTTP responses", () => {
    expect(isLoginPage('<input name="username"><input name="password">')).toBe(
      true,
    );
    expect(() => parseReports("<h1>Maintenance</h1>")).toThrow();
  });
  it("does not trust off-site report links", () => {
    expect(safeUrl("https://evil.test/")).toBeNull();
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(
      parseReports(
        listing.replace(
          "/live/students/viewReport.php",
          "https://evil.test/viewReport.php",
        ),
      ).courses[0].url,
    ).toBeNull();
  });
  it("parses nested score tables, comments, exclusions and summary colspans", () => {
    const r = parseDetail(course);
    expect(r.assessments).toHaveLength(1);
    expect(r.assessments[0].name).toBe("Essay & reflection");
    expect(r.assessments[0].comment).toBe("Good work");
    expect(r.assessments[0].scores[1].excluded).toBe(true);
    expect(r.categories).toHaveLength(2);
    expect(r.categories[1]).toMatchObject({
      name: "Final/Culminating",
      weighting: "—",
      courseWeighting: "30%",
      achievement: "0%",
    });
  });
});
// External private samples are read only when available, never bundled or copied into the repo.
const root = "/Volumes/ESD-USB/teach assists/Alexander Mackenzie High School/1";
describe.skipIf(!existsSync(root))("supplied saved reports", () => {
  it("reads five courses and three available report links", () => {
    const r = parseReports(
      readFileSync(`${root}/Student Reports.html`, "utf8"),
    );
    expect(r.courses).toHaveLength(5);
    expect(r.courses.filter((c) => c.url)).toHaveLength(3);
    expect(r.courses.find((c) => c.code === "PAF3O1-2")?.mark).toBe(77.1);
  });
  for (const code of ["PAF3O1-2", "ESLBO1-1"])
    it(`reads ${code} assignments and categories`, () => {
      const r = parseDetail(
        readFileSync(
          `${root}/${code}/Student Report for 440079729.html`,
          "utf8",
        ),
      );
      expect(r.code).toBe(code);
      expect(r.gradeSummaries).toContainEqual({
        label: "Term",
        mark: code === "PAF3O1-2" ? 77.1 : 89,
      });
      expect(r.assessments).toHaveLength(code === "PAF3O1-2" ? 9 : 26);
      expect(r.categories.length).toBeGreaterThan(4);
      expect(r.categories[0].name).toMatch(/Knowledge/);
    });
});

import { courseSemester } from "../src/parser";
describe("course semester from start date", () => {
  it.each(["08", "09"])("classifies month %s as semester 1", (month) => {
    expect(courseSemester(`2026-${month}-01 ~ 2027-01-31`)).toBe(1);
  });
  it.each(["01", "02", "03", "04", "05", "06", "07", "10", "11", "12"])(
    "classifies month %s as semester 2",
    (month) => {
      expect(courseSemester(`2026-${month}-01 ~ 2026-09-30`)).toBe(2);
    },
  );
  it("does not invent a semester when the start date is missing or invalid", () => {
    expect(courseSemester("")).toBeNull();
    expect(courseSemester("2026-13-01")).toBeNull();
  });
});

describe("overall expectation reports", () => {
  it("keeps the precise listing mark and OE report address", () => {
    const r = parseReports(
      listing
        .replace("viewReport.php", "viewReportOE.php")
        .replace("87.5%", "96.3%"),
    );
    expect(r.courses[0]).toMatchObject({ id: "1", mark: 96.3, midterm: 85 });
    expect(r.courses[0].url).toContain("/viewReportOE.php?");
  });
  it("reads marks even when no report link is available", () => {
    expect(
      parseReports(listing.replace(/<a[^>]*>(.*?)<\/a>/, "$1")).courses[0].mark,
    ).toBe(87.5);
  });
  it("reads expectation marks, grouped tasks, feedback and zero weights", () => {
    const html = `<h1></h1><table><tr><th>By Overall Expectation</th><th>Progress</th><th>Mark</th></tr><tr><td colspan="3">Creating</td></tr><tr><td>A1. Creative process</td><td><script>throw new Error('never execute')</script></td><td>87.3%<br>(total weight: 13)</td></tr><tr><td>A2. Conventions</td><td></td><td>(total weight: 0)</td></tr></table><h2>Assessment Tasks</h2><table><tr><th>Task Name</th><th>Expectation</th><th>Mark</th><th></th><th>Weight</th><th>Feedback</th><th></th></tr><tr><td>Scene</td><td>A1.</td><td>88</td><td>/ 100</td><td>5</td><td>Good work</td></tr><tr><td>Scene</td><td>A2.</td><td>90</td><td>/ 100</td><td>0</td><td></td></tr></table><h2>Individualized Observations</h2><table><tr><th>Recorded Time</th><th>Overall Expectation</th><th>Level</th><th>Weight</th><th></th></tr><tr><td>2026-09-01</td><td>A1.</td><td>4</td><td>2</td><td></td></tr></table><h2>Final Culminating Task</h2><table><tr><th>Task Name</th><th>Mark</th><th>Weight</th><th>Feedback</th></tr><tr><td>Final scene</td><td>95%</td><td>30</td><td>Excellent</td></tr></table>`;
    const r = parseDetail(
      html,
      "https://ta.yrdsb.ca/live/students/viewReportOE.php?subject_id=1",
    );
    expect(r.subjectId).toBe("1");
    expect(r.code).toBe("");
    expect(r.categories).toHaveLength(2);
    expect(r.categories[0]).toMatchObject({
      achievement: "87.3%",
      weighting: "13",
    });
    expect(r.categories[1].achievement).toBe("Not marked yet");
    expect(r.assessments).toHaveLength(3);
    expect(r.assessments[0]).toMatchObject({
      name: "Scene",
      comment: "Good work",
    });
    expect(r.assessments[0].scores).toEqual([
      { category: "A1.", text: "88 / 100 weight=5", excluded: false },
      { category: "A2.", text: "90 / 100 weight=0", excluded: true },
    ]);
    expect(r.assessments[1].scores[0].text).toBe("4 weight=2");
    expect(r.assessments[2].comment).toBe("Excellent");
  });
});
const oeSample =
  "/Volumes/ESD-USB/teach assists/Newmarket High School[Weird Formatting!]/Weird Guy/ADA1O1-1/viewReportOE.html";
it.skipIf(!existsSync(oeSample))(
  "reads the supplied OE report without a course heading",
  () => {
    const r = parseDetail(readFileSync(oeSample, "utf8"));
    expect(r.subjectId).toBe("709380");
    expect(r.categories).toHaveLength(9);
    expect(r.categories[0].achievement).toBe("87.3%");
    expect(r.assessments.flatMap((a) => a.scores)).toHaveLength(24);
    expect(
      r.assessments.find((a) => a.name === "Character Backstory")?.scores[0]
        .excluded,
    ).toBe(true);
  },
);

import { courseMark } from "../src/parser";
describe("published final marks", () => {
  it("keeps current, midterm and final marks distinct", () => {
    const r = parseReports(
      listing.replace(
        "<span>MIDTERM MARK: 85%</span>",
        "<span>MIDTERM MARK: 85%</span><span>FINAL MARK: 92%</span>",
      ),
    );
    expect(r.courses[0]).toMatchObject({ mark: 87.5, midterm: 85, final: 92 });
    expect(courseMark(r.courses[0])).toBe(92);
    expect(courseMark({ ...r.courses[0], final: 0 })).toBe(0);
    expect(courseMark({ ...r.courses[0], final: undefined })).toBe(87.5);
  });
  it("reads final marks without links and does not invent a current mark", () => {
    const html = listing.replace(
      /<a[^>]*>.*?<\/a>/,
      "<span>FINAL MARK: 74%</span>",
    );
    expect(parseReports(html).courses[0]).toMatchObject({
      mark: null,
      midterm: 85,
      final: 74,
      url: null,
    });
    expect(parseReports(html).courses[1].final).toBeNull();
  });
});
describe("multiple scores per category", () => {
  it("preserves each score and its own exclusion, including no weight and zero weight", () => {
    const html = `<h2>TEST-1</h2><table><tr><th>Assignment</th><td>Thinking</td></tr><tr><td>Task</td><td><table><tr><td>75% weight=0.07</td></tr><tr><td bgcolor="#ffaaaa">55% weight=0.07</td></tr><tr><td>80% no weight</td></tr><tr><td>90% weight=0.00</td></tr></table></td></tr></table>`;
    const scores = parseDetail(html).assessments[0].scores;
    expect(scores).toHaveLength(4);
    expect(scores.map((s) => s.excluded)).toEqual([false, true, true, true]);
    expect(scores.every((s) => s.category === "Thinking")).toBe(true);
  });
});
const finalSample = "/Users/lenny/Downloads/Student Reports final.html";
it.skipIf(!existsSync(finalSample))(
  "reads the supplied listing with final marks",
  () => {
    const r = parseReports(readFileSync(finalSample, "utf8"));
    expect(r.courses).toHaveLength(4);
    expect(r.courses.find((c) => c.code === "SCH4U1-3")).toMatchObject({
      midterm: 77,
      final: 33,
      mark: null,
      url: null,
    });
    expect(r.courses.find((c) => c.code === "ENG4U1-6")).toMatchObject({
      midterm: 71,
      final: 74,
    });
  },
);
const uniqueSample = "/Users/lenny/Downloads/personal unique.html";
it.skipIf(!existsSync(uniqueSample))(
  "reads the supplied report's split scores and unweighted diagnostic",
  () => {
    const r = parseDetail(readFileSync(uniqueSample, "utf8"));
    expect(r.code).toBe("HZT4U1-3");
    expect(r.assessments).toHaveLength(8);
    expect(r.gradeSummaries).toContainEqual({ label: "Term", mark: 71.7 });
    expect(r.assessments[0].scores.every((s) => s.excluded)).toBe(true);
    const thinking = r.assessments
      .find((a) => a.name === "Ethical TED Talk")!
      .scores.filter((s) => s.category === "Thinking");
    expect(thinking.map((s) => s.text)).toEqual([
      "7.5 / 10 = 75% weight=0.07",
      "5.5 / 10 = 55% weight=0.07",
    ]);
    expect(thinking.every((s) => !s.excluded)).toBe(true);
    expect(
      r.assessments.find((a) => a.name === "Truman Show Film Analysis")
        ?.comment,
    ).toContain("Feedback:");
    expect(
      r.assessments
        .find((a) => a.name === "Investigation Assignment")
        ?.scores.every((s) => s.excluded),
    ).toBe(true);
  },
);
