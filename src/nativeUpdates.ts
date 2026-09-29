import { registerPlugin } from "@capacitor/core";
import { native } from "./api";
import type { Snapshot } from "./storage";
export const GradeUpdates = registerPlugin<{
  configure(options: {
    minutes: number;
    notifications: boolean;
    hidden: boolean;
    username?: string;
    password?: string;
  }): Promise<void>;
  publish(options: {
    courses: {
      id: string;
      code: string;
      mark: number | null;
      midterm: number | null;
      final: number | null;
      assessments: { name: string; score: string; updated: string }[];
    }[];
    updated: string;
    notify: boolean;
    account: string;
  }): Promise<void>;
  permission(): Promise<{ granted: boolean }>;
  clear(): Promise<void>;
}>("GradeUpdates");
export async function publishGrades(snapshot: Snapshot, notify = false) {
  if (!native) return;
  await GradeUpdates.publish({
    courses: snapshot.reports.courses
      .filter((c) => !c.code.startsWith("LUNCH"))
      .map((c) => ({
        id: c.id,
        code: c.code,
        mark: c.mark,
        midterm: c.midterm,
        final: c.final ?? null,
        assessments: (snapshot.details[c.id]?.assessments ?? []).map((a) => ({
          name: a.name,
          score:
            a.scores
              .filter((s) => !s.excluded)
              .map((s) => `${s.category}: ${s.text}`)
              .join(" · ") || "Not graded",
          updated:
            [...(snapshot.changes ?? [])]
              .reverse()
              .find(
                (e) =>
                  e.course === c.code &&
                  (e.assignment === a.name ||
                    e.label.startsWith(`${a.name} · `)),
              )?.date ?? "",
        })),
      })),
    updated: snapshot.updated,
    notify,
    account: snapshot.username || snapshot.reports.student,
  });
}
export function updateInterval(value: number) {
  return Number.isFinite(value) && value >= 5
    ? Math.min(1440, Math.floor(value))
    : 0;
}
