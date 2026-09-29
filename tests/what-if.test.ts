import { expect, it } from "vitest";
import { initialCategories, project } from "../src/gradeProjection";
import { demoSnapshot } from "../src/demo";
it("combines multiple assessments in their weighted categories", () => {
  const categories = [
    {
      name: "Knowledge",
      average: "80",
      existingWeight: "2",
      courseWeight: "70",
    },
    { name: "Final", average: "90", existingWeight: "1", courseWeight: "30" },
  ];
  const result = project(categories, [
    {
      id: 1,
      name: "A",
      category: "Knowledge",
      earned: "100",
      outOf: "100",
      weight: "1",
    },
    {
      id: 2,
      name: "B",
      category: "Knowledge",
      earned: "60",
      outOf: "100",
      weight: "1",
    },
    {
      id: 3,
      name: "C",
      category: "Final",
      earned: "10",
      outOf: "20",
      weight: "1",
    },
  ]);
  expect(result).toEqual({ baseline: 83, projected: 77 });
});
it("normalizes active shares and allows a previously ungraded section", () => {
  const categories = [
    { name: "Other", average: "", existingWeight: "0", courseWeight: "30" },
  ];
  expect(
    project(categories, [
      {
        id: 1,
        name: "A",
        category: "Other",
        earned: "8",
        outOf: "10",
        weight: "2",
      },
    ])?.projected,
  ).toBe(80);
  expect(
    project(categories, [
      {
        id: 1,
        name: "A",
        category: "Other",
        earned: "8",
        outOf: "0",
        weight: "2",
      },
    ]),
  ).toBeNull();
  expect(project([{ ...categories[0], existingWeight: "" }], [])).toBeNull();
});
it("does not mutate saved data or invent missing OE weights", () => {
  const detail = demoSnapshot().details["demo-1"];
  const original = JSON.stringify(detail);
  const categories = initialCategories(detail);
  expect(categories[0].existingWeight).toBe("3");
  categories[0].average = "50";
  expect(JSON.stringify(detail)).toBe(original);
  expect(
    initialCategories({ ...detail, format: "expectations" })[0].existingWeight,
  ).toBe("");
});
