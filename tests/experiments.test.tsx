// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { it, expect } from "vitest";
import { hypotheticalAverage, CourseExperiment } from "../src/CourseExperiment";
import { WhatIf } from "../src/WhatIf";
import { SemesterGroup } from "../src/SemesterGroup";
import { demoSnapshot } from "../src/demo";
it("calculates hypothetical courses without treating empty marks as zero", () => {
  expect(hypotheticalAverage([80, 90], ["100", "70"])).toBe(85);
  expect(hypotheticalAverage([80], [""])).toBeNull();
  expect(hypotheticalAverage([80], ["101"])).toBeNull();
  expect(hypotheticalAverage([], ["0"])).toBe(0);
});
it("keeps assumptions collapsed with incomplete inputs and toggles experiments", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(<WhatIf detail={demoSnapshot().details["demo-1"]} />),
  );
  await act(async () =>
    host.querySelector<HTMLInputElement>('[role="switch"]')!.click(),
  );
  expect(host.querySelector("details")!.open).toBe(false);
  await act(async () =>
    [...host.querySelectorAll("button")]
      .find((b) => b.textContent?.includes("Add assessment"))!
      .click(),
  );
  expect(host.querySelector("details")!.open).toBe(false);
  await act(async () => root.render(<CourseExperiment marks={[80, 90]} />));
  await act(async () =>
    host.querySelector<HTMLInputElement>('[role="switch"]')!.click(),
  );
  const add = [...host.querySelectorAll("button")].find((b) =>
    b.textContent?.includes("Add hypothetical course"),
  )!;
  await act(async () => add.click());
  await act(async () => add.click());
  expect(host.querySelectorAll("fieldset")).toHaveLength(2);
  await act(async () => root.unmount());
  host.remove();
});
it("keeps semester content mounted for animation but inert when collapsed", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () =>
    root.render(
      <SemesterGroup title="Semester 1" count={1}>
        <button>Math</button>
      </SemesterGroup>,
    ),
  );
  const toggle = host.querySelector("button")!;
  await act(async () => toggle.click());
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(host.querySelector(".semester-reveal")!.hasAttribute("inert")).toBe(
    true,
  );
  expect(host.textContent).toContain("Math");
  await act(async () => toggle.click());
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  await act(async () => root.unmount());
});
