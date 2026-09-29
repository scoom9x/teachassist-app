// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { it, expect, vi } from "vitest";
import { SchoolCalendar } from "../src/SchoolCalendarPanel";
vi.mock("../src/Modal", () => ({
  Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("../src/api", () => ({ native: false, fetchSchoolCalendar: vi.fn() }));
it("persists important events and shows Google Calendar links across views", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-28T12:00:00"));
  const key = "teach-assist.calendar.v1:test:Test school";
  localStorage.setItem(
    key,
    JSON.stringify({
      events: [{ id: "event", date: "2026-10-12", title: "Thanksgiving Day" }],
      personal: [],
      stars: [],
    }),
  );
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const button = (text: string) =>
    [...host.querySelectorAll("button")].find((b) =>
      b.textContent?.includes(text),
    )!;
  try {
    await act(async () =>
      root.render(<SchoolCalendar school="Test school" account="test" />),
    );
    await act(async () => button("View calendar").click());
    const input = host.querySelector<HTMLInputElement>(
      '[aria-label="Search calendar events"]',
    )!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, "Thanksgiving");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    // Search uses React change events; move month directly for a deterministic agenda check.
    await act(async () => button("Agenda").click());
    for (
      let i = 0;
      i < 12 && !host.querySelector(".calendar-agenda article");
      i++
    )
      await act(async () =>
        (
          host.querySelector('[aria-label="Next month"]') as HTMLButtonElement
        ).click(),
      );
    // Use the search-independent Important list after starring the visible school event.
    const star = host.querySelector<HTMLButtonElement>(
      '[aria-label="Mark Thanksgiving Day as important"]',
    );
    expect(star).not.toBeNull();
    await act(async () => star!.click());
    expect(JSON.parse(localStorage.getItem(key)!).stars).toEqual(["event"]);
    await act(async () => button("Important (1)").click());
    expect(host.querySelector(".calendar-agenda")?.textContent).toContain(
      "Thanksgiving Day",
    );
    expect(
      host.querySelector<HTMLAnchorElement>(".calendar-event-actions a")?.href,
    ).toContain("calendar.google.com");
    expect(button("Export important").disabled).toBe(false);
  } finally {
    await act(async () => root.unmount());
    host.remove();
    localStorage.removeItem(key);
    vi.useRealTimers();
  }
});

it("starts with the whole school year and filters months across the year boundary", async () => {
  const key = "teach-assist.calendar.v1:year:School";
  localStorage.setItem(
    key,
    JSON.stringify({
      events: [
        { id: "fall", date: "2026-09-30", title: "Fall event" },
        { id: "spring", date: "2027-06-20", title: "June event" },
      ],
      personal: [],
      stars: [],
    }),
  );
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () =>
    root.render(<SchoolCalendar school="School" account="year" />),
  );
  await act(async () =>
    host.querySelector<HTMLButtonElement>(".calendar-tile")!.click(),
  );
  expect(host.querySelectorAll(".calendar-agenda article")).toHaveLength(2);
  const filter = host.querySelector<HTMLSelectElement>(
    '[aria-label="Filter calendar by month"]',
  )!;
  await act(async () => {
    filter.value = "2027-06";
    filter.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(host.querySelectorAll(".calendar-agenda article")).toHaveLength(1);
  expect(host.querySelector(".calendar-agenda")?.textContent).toContain(
    "June event",
  );
  await act(async () => {
    filter.value = "all";
    filter.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(host.querySelectorAll(".calendar-agenda article")).toHaveLength(2);
  await act(async () => root.unmount());
  localStorage.removeItem(key);
});
