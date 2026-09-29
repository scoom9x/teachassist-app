// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { act } from "react";
vi.mock("../src/SchoolWeather", () => ({ SchoolWeather: () => null }));
vi.mock("../src/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/storage")>()),
  readSnapshot: async () => null,
  readCredentials: async () => null,
}));
it("opens demo history and toggles navigation on narrow screens", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.scrollTo = vi.fn();
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  Object.defineProperty(window, "innerWidth", {
    value: 390,
    configurable: true,
  });
  document.body.innerHTML = '<div id="root"></div>';
  await act(async () => {
    await import("../src/main");
  });
  const click = async (text: string) => {
    const button = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes(text),
    );
    expect(button).toBeTruthy();
    await act(async () => button!.click());
  };
  await click("Explore the demo");
  expect(
    document.querySelector(".app-shell")?.classList.contains("sidebar-closed"),
  ).toBe(true);
  await act(async () =>
    (
      document.querySelector(
        '[aria-label="Expand sidebar"]',
      ) as HTMLButtonElement
    ).click(),
  );
  expect(
    document.querySelector(".app-shell")?.classList.contains("sidebar-open"),
  ).toBe(true);
  await click("Actions");
  expect(document.querySelector(".actions-popover")?.textContent).toContain(
    "Refresh all",
  );
  await click("Actions");
  await click("History");
  expect(document.querySelector("main")?.textContent).toContain("Increased");
  expect(document.querySelector("main")?.textContent).toContain("Decreased");
  expect(
    document.querySelector(".app-shell")?.classList.contains("sidebar-closed"),
  ).toBe(true);
  expect(document.body.textContent).not.toContain("Local workspace");
  expect(document.querySelector(".avatar")).toBeNull();
  await click("Grades");
  expect(document.querySelector(".topbar")?.textContent).toContain(
    "Last updated",
  );
  await click("Actions");
  expect(document.querySelector(".actions-popover")?.textContent).toContain(
    "Refresh grades",
  );
  expect(document.querySelector("main")?.textContent).not.toContain(
    "SAVED ON THIS DEVICE",
  );
  const courseCount = document.querySelectorAll(".course-card").length;
  await act(async () =>
    document.querySelector<HTMLInputElement>('[role="switch"]')!.click(),
  );
  expect(document.querySelectorAll(".editable-course")).toHaveLength(
    courseCount,
  );
  await click("Add course");
  expect(document.querySelectorAll(".editable-course")).toHaveLength(
    courseCount + 1,
  );
  await act(async () =>
    document.querySelector<HTMLButtonElement>(".remove-course")!.click(),
  );
  expect(document.querySelectorAll(".editable-course")).toHaveLength(
    courseCount,
  );
  await act(async () =>
    document.querySelector<HTMLInputElement>('[role="switch"]')!.click(),
  );
  expect(document.querySelectorAll(".editable-course")).toHaveLength(0);
  expect(document.querySelectorAll(".course-card")).toHaveLength(courseCount);
  expect(document.querySelector("main")?.textContent).toContain("English");
  await act(async () =>
    document
      .querySelector<HTMLButtonElement>('[aria-label^="Notifications"]')!
      .click(),
  );
  expect(
    document.querySelectorAll(".notification-item.unread").length,
  ).toBeGreaterThan(0);
  await click("New assignment added");
  expect(document.querySelector(".history-filter")?.textContent).toContain(
    "Unit 2 · Putting it into practice",
  );
  expect(document.querySelectorAll(".history-entry")).toHaveLength(1);
  await act(async () =>
    document
      .querySelector<HTMLButtonElement>('[aria-label^="Notifications"]')!
      .click(),
  );
  expect(document.querySelectorAll(".notification-item.read")).toHaveLength(1);
  await click("Mark all as read");
  expect(document.querySelectorAll(".notification-item.unread")).toHaveLength(
    0,
  );
});
