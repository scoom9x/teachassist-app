import { change } from "./history";
import type { Snapshot } from "./storage";
export function demoSnapshot(): Snapshot {
  const courses = [
    {
      id: "demo-1",
      code: "ENG3U1",
      name: "English",
      block: "P1",
      room: "214",
      mark: 88.5,
      midterm: 85,
    },
    {
      id: "demo-2",
      code: "MCR3U1",
      name: "Functions",
      block: "P2",
      room: "208",
      mark: 91.2,
      midterm: 89,
    },
    {
      id: "demo-3",
      code: "SBI3U1",
      name: "Biology",
      block: "P3",
      room: "112",
      mark: 84,
      midterm: 82,
    },
    {
      id: "demo-4",
      code: "AVI3M1",
      name: "Visual Arts",
      block: "P4",
      room: "106",
      mark: null,
      midterm: 90,
    },
  ].map((c) => ({
    ...c,
    dates: "2026-09-08 ~ 2027-01-29",
    url:
      c.mark === null
        ? null
        : `https://ta.yrdsb.ca/live/students/viewReport.php?subject_id=${c.id}`,
    status:
      c.mark === null
        ? "Please see your teacher for your current mark."
        : "Report available",
  }));
  return {
    reports: {
      student: "Demo student",
      school: "Newmarket High School",
      courses,
    },
    updated: new Date().toISOString(),
    history: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 7 * 86400000).toISOString(),
      marks: Object.fromEntries(
        courses.map((c) => [
          c.code,
          c.mark === null ? null : c.mark - (6 - i) * 0.8,
        ]),
      ),
      courseMarks: Object.fromEntries(
        courses.map((c) => [
          c.id,
          c.mark === null ? null : c.mark - (6 - i) * 0.8,
        ]),
      ),
    })),
    categoryHistory: Object.fromEntries(
      courses
        .filter((c) => c.url)
        .map((c) => [
          c.id,
          Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 7 * 86400000).toISOString(),
            values: {
              "Knowledge / Understanding": 90 - (6 - i) * 1.2,
              Thinking: 86 - (6 - i) * 0.5,
              Communication: 92 - (6 - i) * 0.6,
              Application: 86 + (6 - i) * 0.4,
            },
          })),
        ]),
    ),
    changes: [
      change(
        "ENG3U1",
        "Current grade",
        "86%",
        "88.5%",
        new Date(Date.now() - 86400000).toISOString(),
      ),
      change(
        "SBI3U1",
        "Current grade",
        "85.5%",
        "84%",
        new Date(Date.now() - 3600000).toISOString(),
      ),
      change(
        "MCR3U1",
        "Reflection & response · Knowledge / Understanding",
        "16 / 20 = 80% weight=1",
        "17 / 20 = 85% weight=1",
      ),
      change(
        "ENG3U1",
        "Unit 2 · Putting it into practice · Added",
        "—",
        "New assessment · 80%",
      ),
    ],
    detailUpdated: {},
    details: Object.fromEntries(
      courses
        .filter((c) => c.url)
        .map((c) => [
          c.id,
          {
            code: c.code,
            generated: "",
            categories: [
              {
                name: "Knowledge / Understanding",
                weighting: "25%",
                courseWeighting: "17.5%",
                achievement: "90%",
              },
              {
                name: "Thinking",
                weighting: "25%",
                courseWeighting: "17.5%",
                achievement: "86%",
              },
              {
                name: "Communication",
                weighting: "25%",
                courseWeighting: "17.5%",
                achievement: "92%",
              },
              {
                name: "Application",
                weighting: "25%",
                courseWeighting: "17.5%",
                achievement: "86%",
              },
            ],
            assessments: [
              "Unit 1 · Making connections",
              "Reflection & response",
              "Unit 2 · Putting it into practice",
            ].map((name, i) => ({
              name,
              comment:
                i === 0
                  ? "Clear ideas and thoughtful connections. Keep it up."
                  : "",
              scores: [
                {
                  category: "Knowledge / Understanding",
                  text: `${18 - i} / 20 = ${90 - i * 5}% weight=1`,
                  excluded: false,
                },
                {
                  category: "Thinking",
                  text: "86 / 100 = 86% weight=1",
                  excluded: false,
                },
                {
                  category: "Application",
                  text: "86 / 100 = 86% weight=1",
                  excluded: false,
                },
                {
                  category: "Communication",
                  text: "9 / 10 = 90% weight=1",
                  excluded: false,
                },
              ],
            })),
          },
        ]),
    ),
  };
}
