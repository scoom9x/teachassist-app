import type { Course, Detail, Reports } from "./parser";
export interface Change {
  assignment?: string;
  date: string;
  course: string;
  label: string;
  before: string;
  after: string;
  direction: "up" | "down" | "changed";
}
export function change(
  course: string,
  label: string,
  before: string,
  after: string,
  date = new Date().toISOString(),
): Change {
  const percent = (value: string) => {
    const match = value.match(/(-?\d+(?:\.\d+)?)\s*%/);
    return match ? Number(match[1]) : null;
  };
  const a = percent(before),
    b = percent(after);
  return {
    date,
    course,
    label,
    before,
    after,
    direction:
      a !== null && b !== null && a !== b ? (b > a ? "up" : "down") : "changed",
  };
}
export function reportChanges(
  before: Reports | undefined,
  after: Reports,
): Change[] {
  if (!before) return [];
  return after.courses.flatMap((course) => {
    const old = before.courses.find((c) => c.id === course.id);
    if (!old) return [change(course.code, "Course added", "—", course.name)];
    return (["mark", "midterm", "final"] as const).flatMap((key) => {
      const a = old[key] ?? null,
        b = course[key] ?? null;
      return a === b
        ? []
        : [
            change(
              course.code,
              {
                mark: "Current grade",
                midterm: "Midterm grade",
                final: "Final grade",
              }[key],
              a === null ? "Unavailable" : `${a}%`,
              b === null ? "Unavailable" : `${b}%`,
            ),
          ];
    });
  });
}
export function detailChanges(
  course: Course,
  before: Detail | undefined,
  after: Detail,
): Change[] {
  if (!before) return [];
  const events: Change[] = [];
  // Pair duplicate titles by their occurrence within the report.
  const remaining = [...before.assessments];
  for (const assessment of after.assessments) {
    const index = remaining.findIndex((a) => a.name === assessment.name);
    const old = index < 0 ? undefined : remaining.splice(index, 1)[0];
    const scores = (a: typeof assessment) =>
      a.scores
        .map(
          (s) => `${s.category}: ${s.text}${s.excluded ? " (excluded)" : ""}`,
        )
        .join("; ");
    if (!old)
      events.push(
        change(
          course.code,
          `${assessment.name} · Added`,
          "—",
          scores(assessment) || "Not graded",
        ),
      );
    else {
      for (
        let i = 0;
        i < Math.max(old.scores.length, assessment.scores.length);
        i++
      ) {
        const a = old.scores[i],
          b = assessment.scores[i];
        const value = (s: typeof a) =>
          s ? `${s.text}${s.excluded ? " (excluded)" : ""}` : "Unavailable";
        if (JSON.stringify(a) !== JSON.stringify(b))
          events.push(
            change(
              course.code,
              `${assessment.name} · ${b?.category ?? a?.category}`,
              value(a),
              value(b),
            ),
          );
      }
      if (old.comment !== assessment.comment)
        events.push(
          change(
            course.code,
            `${assessment.name} · Feedback`,
            old.comment || "No feedback",
            assessment.comment || "No feedback",
          ),
        );
    }
  }
  for (const old of remaining)
    events.push(
      change(
        course.code,
        `${old.name} · Removed`,
        "In report",
        "Removed from report",
      ),
    );
  for (const category of after.categories) {
    const old = before.categories.find((c) => c.name === category.name);
    if (old && JSON.stringify(old) !== JSON.stringify(category))
      events.push(
        change(
          course.code,
          `${category.name} · Category`,
          `${old.achievement} (weight ${old.weighting}, course ${old.courseWeighting})`,
          `${category.achievement} (weight ${category.weighting}, course ${category.courseWeighting})`,
        ),
      );
  }
  for (const summary of after.gradeSummaries ?? []) {
    const old = before.gradeSummaries?.find((s) => s.label === summary.label);
    if (old && old.mark !== summary.mark)
      events.push(
        change(course.code, summary.label, `${old.mark}%`, `${summary.mark}%`),
      );
  }
  return events.map((event) => ({
    ...event,
    assignment: [...after.assessments, ...before.assessments].find((a) =>
      event.label.startsWith(`${a.name} · `),
    )?.name,
  }));
}
