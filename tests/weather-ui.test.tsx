// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
const { loadWeather } = vi.hoisted(() => ({ loadWeather: vi.fn() }));
vi.mock("../src/weather", async (original) => ({
  ...(await original<typeof import("../src/weather")>()),
  loadWeather,
}));
import { SchoolWeather } from "../src/SchoolWeather";
it("keeps the school card compact and opens a detailed seven-day precipitation forecast", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    queueMicrotask(() => this.dispatchEvent(new Event("close")));
  };
  loadWeather.mockResolvedValue({
    temperature: 18,
    feelsLike: 17,
    code: 3,
    wind: 12,
    humidity: 70,
    precipitation: 0.2,
    high: 20,
    low: 10,
    rain: 30,
    time: 1790611200,
    days: Array.from({ length: 7 }, (_, i) => ({
      time: 1790568000 + i * 86400,
      high: 20,
      low: 10,
      code: 3,
      precipitation: 1.5,
      chance: 30,
    })),
  });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <React.StrictMode>
        <SchoolWeather schoolName="Newmarket H.S." />
      </React.StrictMode>,
    ),
  );
  expect(container.textContent).toContain("Newmarket High School");
  expect(container.textContent).toContain("18°C");
  expect(container.querySelector("dialog")).toBeNull();
  expect(container.textContent).not.toContain("Humidity");
  await act(async () =>
    container.querySelector<HTMLButtonElement>(".school-tile")!.click(),
  );
  expect(container.querySelector("dialog")?.hasAttribute("open")).toBe(true);
  expect(container.querySelectorAll(".forecast-day")).toHaveLength(7);
  expect(container.textContent).toContain("0.2 mm");
  expect(container.textContent).toContain("30% chance");
  expect(container.textContent).toContain("Humidity");
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>('[aria-label="Close weather"]')!
      .click(),
  );
  expect(container.querySelector("dialog")).toBeNull();
  await act(async () => root.unmount());
  container.remove();
});
