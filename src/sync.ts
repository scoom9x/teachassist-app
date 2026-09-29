import { categoryValues } from "./trends";
import { detailChanges } from "./history";
import { AuthError, fetchCourse } from "./api";
import type { Course, Detail } from "./parser";
import type { Snapshot } from "./storage";

export function withCourseDetail(
  snapshot: Snapshot,
  course: Course,
  detail: Detail,
): Snapshot {
  if (
    detail.code
      ? detail.code !== course.code
      : !detail.subjectId || detail.subjectId !== course.id
  )
    throw new Error("The returned report does not match this course.");
  const date = new Date().toISOString();
  const previous =
    snapshot.categoryHistory?.[course.id] ??
    (snapshot.details[course.id] && snapshot.detailUpdated[course.id]
      ? [
          {
            date: snapshot.detailUpdated[course.id],
            values: categoryValues(snapshot.details[course.id]),
          },
        ]
      : []);
  return {
    ...snapshot,
    categoryHistory: {
      ...snapshot.categoryHistory,
      [course.id]: [
        ...previous,
        { date, values: categoryValues(detail) },
      ].slice(-1000),
    },
    changes: [
      ...(snapshot.changes ?? []),
      ...detailChanges(course, snapshot.details[course.id], detail),
    ],
    details: { ...snapshot.details, [course.id]: detail },
    detailUpdated: {
      ...snapshot.detailUpdated,
      [course.id]: date,
    },
  };
}

/** Reuse the authenticated native cookie session for each linked report. */
export async function syncCourseReports(
  snapshot: Snapshot,
  progress?: (message: string) => void,
) {
  let next = snapshot;
  const failures: string[] = [];
  const courses = snapshot.reports.courses.filter((c) => c.url);
  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    progress?.(
      `Loading course reports ${i + 1}/${courses.length} · ${course.code}`,
    );
    try {
      next = withCourseDetail(next, course, await fetchCourse(course.url!));
    } catch (error) {
      failures.push(course.code);
      if (error instanceof AuthError) {
        failures.push(...courses.slice(i + 1).map((c) => c.code));
        return {
          snapshot: next,
          warning:
            "Your session expired while loading course reports. Sign in again. Previously saved details were kept.",
        };
      }
    }
  }
  return {
    snapshot: next,
    warning: failures.length
      ? `Could not update reports for ${failures.join(", ")}. Previously saved details were kept; open a course to retry.`
      : "",
  };
}
