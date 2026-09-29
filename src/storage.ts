import { reportChanges, type Change } from "./history";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import { Preferences } from "@capacitor/preferences";
import { native } from "./api";
import type { CategorySample } from "./trends";
import { courseMark } from "./parser";
import type { Detail, Reports } from "./parser";
export interface Snapshot {
  categoryHistory?: Record<string, CategorySample[]>;
  changes?: Change[];
  readNotifications?: string[];
  username?: string;
  reports: Reports;
  details: Record<string, Detail>;
  updated: string;
  detailUpdated: Record<string, string>;
  history: {
    date: string;
    marks: Record<string, number | null>;
    courseMarks?: Record<string, number | null>;
    average?: { value: number | null; count: number };
  }[];
}
const KEY = "teach-assist.snapshot.v1";
const LOGIN = "teach-assist.credentials.v1";
export async function readSnapshot(): Promise<Snapshot | null> {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) return null;
  try {
    const s = JSON.parse(value);
    return s.reports?.courses && s.details && s.detailUpdated && s.history
      ? s
      : null;
  } catch {
    return null;
  }
}
export async function saveSnapshot(s: Snapshot) {
  await Preferences.set({ key: KEY, value: JSON.stringify(s) });
}
export async function deleteSnapshot() {
  await Preferences.remove({ key: KEY });
}
export async function saveCredentials(username: string, password: string) {
  if (!native) throw new Error("Secure login storage requires the native app.");
  await SecureStorage.set(LOGIN, { username, password }, false, false);
}
export async function readCredentials(): Promise<{
  username: string;
  password: string;
} | null> {
  if (!native) return null;
  const value = await SecureStorage.get(LOGIN, false, false);
  return value &&
    typeof value === "object" &&
    "username" in value &&
    "password" in value
    ? (value as { username: string; password: string })
    : null;
}
export async function forgetCredentials() {
  if (native) await SecureStorage.remove(LOGIN, false);
}
export function snapshotFor(
  reports: Reports,
  previous: Snapshot | null,
): Snapshot {
  const own = previous?.reports.student === reports.student ? previous : null;
  const updated = new Date().toISOString();
  const available = reports.courses
    .filter((course) => !course.code.startsWith("LUNCH"))
    .map(courseMark)
    .filter((mark): mark is number => mark !== null && Number.isFinite(mark));
  return {
    reports,
    readNotifications: own?.readNotifications ?? [],
    username: own?.username,
    updated,
    changes: [...(own?.changes ?? []), ...reportChanges(own?.reports, reports)],
    categoryHistory: own?.categoryHistory ?? {},
    details: own?.details ?? {},
    detailUpdated: own?.detailUpdated ?? {},
    history: [
      ...(own?.history ?? []),
      {
        date: updated,
        average: {
          value: available.length
            ? available.reduce((sum, value) => sum + value, 0) /
              available.length
            : null,
          count: available.length,
        },
        courseMarks: Object.fromEntries(
          reports.courses.map((c) => [c.id, courseMark(c)]),
        ),
        marks: Object.fromEntries(
          reports.courses.map((c) => [c.code, courseMark(c)]),
        ),
      },
    ].slice(-1000),
  };
}
