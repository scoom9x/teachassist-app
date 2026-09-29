import { schoolFromDocument } from "./schools";
export const ORIGIN = "https://ta.yrdsb.ca";
export interface Course {
  id: string;
  code: string;
  name: string;
  block: string;
  room: string;
  dates: string;
  mark: number | null;
  midterm: number | null;
  final?: number | null;
  url: string | null;
  status: string;
}
export interface Reports {
  student: string;
  school: string;
  courses: Course[];
  appointmentUrl?: string;
  calendarUrl?: string;
}
export interface Assessment {
  name: string;
  comment: string;
  scores: { category: string; text: string; excluded: boolean }[];
}
export interface Detail {
  subjectId?: string;
  format?: "expectations";
  code: string;
  gradeSummaries?: { label: string; mark: number }[];
  assessments: Assessment[];
  categories: {
    name: string;
    weighting: string;
    courseWeighting: string;
    achievement: string;
  }[];
  generated: string;
}
const text = (el: Element | null | undefined) =>
  el?.textContent?.replace(/\s+/g, " ").trim() ?? "";
const percent = (s: string) => {
  const m = s.match(/(-?\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) : null;
};
export function documentFrom(html: string) {
  return new DOMParser().parseFromString(html, "text/html");
}
export function safeUrl(
  raw: string,
  base = ORIGIN + "/live/students/listReports.php",
): string | null {
  try {
    const u = new URL(raw, base);
    return u.origin === ORIGIN && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
}
export function reportUrl(raw: string): string | null {
  const url = safeUrl(raw);
  return url &&
    /^\/live\/students\/viewReport(?:OE)?\.php$/.test(new URL(url).pathname)
    ? url
    : null;
}
export function isLoginPage(html: string) {
  const d = documentFrom(html);
  return (
    !!d.querySelector('input[name="username"]') &&
    !!d.querySelector('input[name="password"]')
  );
}
export function parseReports(html: string): Reports {
  const d = documentFrom(html);
  const heading = [...d.querySelectorAll("h1")].find((h) =>
    /^Student Reports\s+for\s+/i.test(text(h)),
  );
  const table = [...d.querySelectorAll("table")].find((t) =>
    [...t.querySelectorAll("th")].some((h) => text(h) === "Course Name"),
  );
  if (!heading || !table || isLoginPage(html))
    throw new Error("This is not a recognized student reports page.");
  const courses = [...table.rows]
    .filter((r) => r.cells.length === 3 && r.cells[0].tagName === "TD")
    .map((row, index) => {
      const [info, dates, marks] = [...row.cells];
      const full = text(info);
      const match = full.match(
        /^([^:]+):\s*(.*?)\s*Block:\s*(.*?)\s*-\s*rm\.\s*(.*)$/i,
      );
      const link = [...marks.querySelectorAll("a[href]")].find((a) =>
        reportUrl(a.getAttribute("href") ?? ""),
      );
      const url = link ? reportUrl(link.getAttribute("href")!) : null;
      return {
        id: url
          ? (new URL(url).searchParams.get("subject_id") ?? String(index))
          : `unavailable-${index}`,
        code: match?.[1].trim() ?? full.split(":")[0],
        name: match?.[2] ?? "",
        block: match?.[3] ?? "",
        room: match?.[4] ?? "",
        dates: text(dates),
        mark: percent(
          text(marks).match(/current mark\s*=\s*[\d.]+\s*%/i)?.[0] ??
            text(link),
        ),
        final: percent(
          text(marks).match(/FINAL MARK:\s*[\d.]+\s*%/i)?.[0] ?? "",
        ),
        midterm: percent(
          text(marks).match(/MIDTERM MARK:\s*[\d.]+%/i)?.[0] ?? "",
        ),
        url,
        status: url
          ? "Report available"
          : "Please see your teacher for your current mark.",
      };
    });
  const appointmentForm = d.querySelector(
    'form[action*="bookAppointment.php"]',
  );
  const appointmentUrl = appointmentForm
    ? (() => {
        const address = safeUrl(appointmentForm.getAttribute("action") ?? "");
        if (
          !address ||
          new URL(address).pathname !== "/live/students/bookAppointment.php"
        )
          return undefined;
        const url = new URL(address);
        const params = new URLSearchParams(url.search);
        appointmentForm
          .querySelectorAll<HTMLInputElement>("input[name]")
          .forEach((input) => params.set(input.name, input.value));
        url.search = params.toString();
        return url.href;
      })()
    : undefined;
  return {
    student: text(heading).replace(/^Student Reports\s+for\s+/i, ""),
    school: schoolFromDocument(d),
    courses,
    appointmentUrl,
    calendarUrl: (() => {
      const href = d
        .querySelector('a[href*="calendar_full.php"]')
        ?.getAttribute("href");
      const url = href && safeUrl(href);
      return url && new URL(url).pathname === "/live/students/calendar_full.php"
        ? url
        : undefined;
    })(),
  };
}
export function parseDetail(html: string, sourceUrl?: string): Detail {
  const d = documentFrom(html);
  const expectations = [...d.querySelectorAll("table")].find(
    (t) => text(t.rows[0]?.cells[0]) === "By Overall Expectation",
  );
  if (expectations && !isLoginPage(html))
    return parseExpectations(
      d,
      expectations,
      sourceUrl ?? html.match(/saved from url=\(\d+\)(https:[^\s<>]+)/)?.[1],
    );
  const table = [...d.querySelectorAll("table")].find(
    (t) => t.rows[0] && text(t.rows[0].cells[0]) === "Assignment",
  );
  if (!table || isLoginPage(html))
    throw new Error(
      "The course report format was not recognized. Your saved report has been kept.",
    );
  const labels = [...table.rows[0].cells].slice(1).map(text);
  const rows = [...table.rows];
  const assessments = rows
    .slice(1)
    .filter((r) => r.cells.length === labels.length + 1)
    .map((row) => ({
      name: text(row.cells[0]),
      comment:
        row.cells[0].rowSpan > 1 &&
        row.nextElementSibling?.children.length === 1
          ? text(row.nextElementSibling)
          : "",
      scores: [...row.cells]
        .slice(1)
        .flatMap((cell, i) => {
          // A category can contain several independently weighted scores.
          const nested = [...cell.querySelectorAll("td")].filter(
            (c) => !c.querySelector("td"),
          );
          return (nested.length ? nested : [cell]).map((score) => ({
            category: labels[i],
            text: text(score),
            excluded:
              /\bno weight\b|\bweight\s*=\s*0(?:\.0+)?(?![\d.])/i.test(
                text(score),
              ) ||
              [cell, score].some((e) =>
                /^(ffaaaa|999999)$/i.test(
                  (e.getAttribute("bgcolor") ?? "").replace("#", ""),
                ),
              ),
          }));
        })
        .filter((s) => s.text),
    }));
  const summary = [...d.querySelectorAll("table")].find(
    (t) =>
      t.rows[0] &&
      [...t.rows[0].cells].some(
        (c) => c.tagName === "TH" && text(c) === "Student Achievement",
      ),
  );
  const categories = summary
    ? [...summary.rows].slice(1).map((row) => {
        const cells = [...row.cells];
        return {
          name: text(cells[0]),
          weighting: cells.length === 4 ? text(cells[1]) : "—",
          courseWeighting: text(cells.at(-2)),
          achievement: text(cells.at(-1)),
        };
      })
    : [];
  const gradeSummaries = [...d.querySelectorAll("tr")].flatMap((row) => {
    const cells = [...row.cells];
    if (cells.length !== 2 || !/^\d+(?:\.\d+)?\s*%$/.test(text(cells[0])))
      return [];
    const label = text(cells[1]);
    if (!label || label.length > 80) return [];
    return [{ label, mark: percent(text(cells[0]))! }];
  });
  return {
    gradeSummaries,
    code: text(d.querySelector("h2")),
    assessments,
    categories,
    generated:
      text(d.body).match(/report generated on ([\d/]+\s+[\d:]+)/i)?.[1] ?? "",
  };
}

function parseExpectations(
  d: Document,
  table: HTMLTableElement,
  source?: string,
): Detail {
  const url = source && reportUrl(source);
  const assessments: Assessment[] = [];
  for (const tasks of d.querySelectorAll("table")) {
    const headers = [...(tasks.rows[0]?.cells ?? [])].map(text);
    const task = headers[0] === "Task Name";
    const individual =
      headers[0] === "Recorded Time" && headers[1] === "Overall Expectation";
    if (!task && !individual) continue;
    const expectation = headers.indexOf(
      task ? "Expectation" : "Overall Expectation",
    );
    const score = headers.indexOf(task ? "Mark" : "Level");
    const weight = headers.indexOf("Weight");
    const feedback = headers.indexOf("Feedback");
    const section = text(tasks.previousElementSibling);
    for (const row of [...tasks.rows].slice(1)) {
      const cells = [...row.cells];
      if (cells.length <= weight || !text(cells[0])) continue;
      const name = individual
        ? `${section} · ${text(cells[0])}`
        : text(cells[0]);
      let assessment = assessments.find((a) => a.name === name);
      if (!assessment) {
        assessment = { name, comment: "", scores: [] };
        assessments.push(assessment);
      }
      const comment = text(cells[feedback]);
      if (comment && !assessment.comment.includes(comment))
        assessment.comment += `${assessment.comment ? "\n" : ""}${comment}`;
      const value = text(cells[score]);
      const denominator = score + 1 < weight ? text(cells[score + 1]) : "";
      const weighting = text(cells[weight]);
      assessment.scores.push({
        category: expectation >= 0 ? text(cells[expectation]) : section,
        text: [value, denominator, weighting ? `weight=${weighting}` : ""]
          .filter(Boolean)
          .join(" "),
        excluded: weighting === "0",
      });
    }
  }
  return {
    code:
      [...d.querySelectorAll("h1,h2")]
        .map(text)
        .find((s) => /^[A-Z]{3}[A-Z0-9]{3}-\d+$/.test(s)) ?? "",
    subjectId: url
      ? (new URL(url).searchParams.get("subject_id") ?? undefined)
      : undefined,
    format: "expectations",
    assessments,
    categories: [...table.rows]
      .slice(1)
      .filter((r) => r.cells.length === 3 && text(r.cells[0]))
      .map((r) => ({
        name: text(r.cells[0]),
        weighting:
          text(r.cells[2]).match(/total weight:\s*([\d.]+)/i)?.[1] ?? "—",
        courseWeighting: "—",
        achievement:
          text(r.cells[2]).match(/[\d.]+\s*%/)?.[0] ?? "Not marked yet",
      })),
    generated: "",
  };
}

/** Semester follows the course start month, never the end date. */
export function courseSemester(dates: string): 1 | 2 | null {
  const match = dates.trim().match(/^\d{4}[-/](\d{2})[-/]\d{2}/);
  if (!match) return null;
  const month = Number(match[1]);
  if (month < 1 || month > 12) return null;
  return month === 8 || month === 9 ? 1 : 2;
}

/** Final marks supersede current marks, without replacing the stored current value. */
export const courseMark = (course: Course) => course.final ?? course.mark;
