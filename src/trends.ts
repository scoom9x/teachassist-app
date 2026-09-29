import type { Detail } from "./parser";
import type { Snapshot } from "./storage";
export interface CategorySample {
  date: string;
  values: Record<string, number | null>;
}
export interface TrendPoint {
  date: string;
  value: number | null;
  count?: number;
}
export function categoryValues(detail: Detail): CategorySample["values"] {
  return Object.fromEntries(
    detail.categories.map((category) => {
      const match = category.achievement.match(/(-?\d+(?:\.\d+)?)\s*%/);
      const value = match ? Number(match[1]) : null;
      return [
        category.name,
        value !== null && Number.isFinite(value) ? value : null,
      ];
    }),
  );
}
export function averageTrend(snapshot: Snapshot): TrendPoint[] {
  return snapshot.history.map((sample) => {
    if (sample.average) return { date: sample.date, ...sample.average };
    const marks = Object.entries(sample.marks)
      .filter(
        ([code, value]) =>
          !code.startsWith("LUNCH") &&
          typeof value === "number" &&
          Number.isFinite(value),
      )
      .map(([, value]) => value as number);
    return {
      date: sample.date,
      value: marks.length
        ? marks.reduce((sum, value) => sum + value, 0) / marks.length
        : null,
      count: marks.length,
    };
  });
}
export function courseTrends(
  snapshot: Snapshot,
  id: string,
): { name: string; points: TrendPoint[] }[] {
  const course = snapshot.reports.courses.find((course) => course.id === id);
  if (!course) return [];
  const recorded = snapshot.categoryHistory?.[id] ?? [];
  const detail = snapshot.details[id];
  const samples = recorded.length
    ? recorded
    : detail && snapshot.detailUpdated[id]
      ? [{ date: snapshot.detailUpdated[id], values: categoryValues(detail) }]
      : [];
  const categories = [
    ...new Set(samples.flatMap((sample) => Object.keys(sample.values))),
  ];
  return [
    {
      name: "Course mark",
      points: snapshot.history.map((sample) => ({
        date: sample.date,
        value: sample.courseMarks
          ? (sample.courseMarks[id] ?? null)
          : (sample.marks[course.code] ?? null),
      })),
    },
    ...categories.map((name) => ({
      name,
      points: samples.map((sample) => ({
        date: sample.date,
        value: sample.values[name] ?? null,
      })),
    })),
  ];
}
