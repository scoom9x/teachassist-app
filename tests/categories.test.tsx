// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { it, expect, vi } from "vitest";
import {
  CourseCategories,
  contributingAssessments,
} from "../src/CourseCategories";
import type { Detail } from "../src/parser";
const detail: Detail = {
  code: "TEST",
  format: "expectations",
  generated: "",
  categories: [
    {
      name: "C1. : Practices",
      achievement: "90%",
      weighting: "2",
      courseWeighting: "—",
    },
    {
      name: "C2. : Context",
      achievement: "Not marked yet",
      weighting: "0",
      courseWeighting: "—",
    },
  ],
  assessments: [
    {
      name: "Scene",
      comment: "Feedback",
      scores: [
        { category: "C1.", text: "90 / 100 weight=2", excluded: false },
        { category: "C10.", text: "80 / 100 weight=3", excluded: false },
      ],
    },
    {
      name: "Diagnostic",
      comment: "",
      scores: [{ category: "C1.", text: "80 / 100 weight=0", excluded: true }],
    },
  ],
};
it("matches exact expectation codes and preserves exclusion state", () => {
  const result = contributingAssessments(detail, "C1. : Practices");
  expect(result).toHaveLength(2);
  expect(result[0].scores).toHaveLength(1);
  expect(result[1].scores[0].excluded).toBe(true);
  expect(contributingAssessments(detail, "C2. : Context")).toEqual([]);
});
it("opens a section popup, shows matching scores, closes, and handles empty sections", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<CourseCategories detail={detail} />));
  await act(async () =>
    container.querySelector<HTMLButtonElement>("button")!.click(),
  );
  const dialog = container.querySelector("dialog")!;
  expect(dialog.hasAttribute("open")).toBe(true);
  expect(dialog.textContent).toContain("Scene");
  expect(dialog.textContent).toContain("Excluded · does not contribute");
  expect(dialog.textContent).not.toContain("weight=3");
  await act(async () =>
    dialog.querySelector<HTMLButtonElement>("button")!.click(),
  );
  expect(dialog.hasAttribute("open")).toBe(false);
  await act(async () =>
    container
      .querySelectorAll<HTMLButtonElement>(".category-button")[1]
      .click(),
  );
  expect(dialog.textContent).toContain("No assessments are listed");
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
