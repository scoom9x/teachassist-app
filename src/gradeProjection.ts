import type { Detail } from "./parser";
export interface ModelCategory {
  name: string;
  average: string;
  existingWeight: string;
  courseWeight: string;
}
export interface Hypothetical {
  id: number;
  name: string;
  category: string;
  earned: string;
  outOf: string;
  weight: string;
}
const number = (s: string) => (s.trim() === "" ? NaN : Number(s));
const percent = (s: string) => s.match(/(-?\d+(?:\.\d+)?)\s*%/)?.[1] ?? "";
const normalized = (s: string) => s.replace(/\s/g, "").toLowerCase();
export function initialCategories(detail: Detail): ModelCategory[] {
  return detail.categories.map((c) => {
    const scores = detail.assessments
      .flatMap((a) => a.scores)
      .filter(
        (s) => !s.excluded && normalized(s.category) === normalized(c.name),
      );
    const weights = scores.map(
      (s) => s.text.match(/weight\s*=\s*(\d+(?:\.\d+)?)/i)?.[1],
    );
    return {
      name: c.name,
      average: percent(c.achievement),
      existingWeight:
        detail.format === "expectations"
          ? ""
          : scores.length && weights.every(Boolean)
            ? String(weights.reduce((sum, w) => sum + Number(w), 0))
            : "",
      courseWeight: percent(c.courseWeighting) || percent(c.weighting),
    };
  });
}
export function project(
  categories: ModelCategory[],
  additions: Hypothetical[],
): { baseline: number; projected: number } | null {
  if (!categories.length) return null;
  if (
    additions.some((a) => {
      const earned = number(a.earned),
        outOf = number(a.outOf),
        weight = number(a.weight);
      return (
        ![earned, outOf, weight].every(Number.isFinite) ||
        outOf <= 0 ||
        earned < 0 ||
        earned > outOf ||
        weight <= 0
      );
    })
  )
    return null;
  let before = 0,
    after = 0,
    beforeWeight = 0,
    afterWeight = 0;
  for (const c of categories) {
    const average = number(c.average),
      existing = number(c.existingWeight),
      share = number(c.courseWeight);
    if (!Number.isFinite(share) || share < 0 || share > 100) return null;
    if (!share) continue;
    if (
      !Number.isFinite(existing) ||
      existing < 0 ||
      (existing > 0 &&
        (!Number.isFinite(average) || average < 0 || average > 100))
    )
      return null;
    let total = existing > 0 ? average * existing : 0,
      weight = existing;
    for (const a of additions.filter((a) => a.category === c.name)) {
      const earned = number(a.earned),
        outOf = number(a.outOf),
        w = number(a.weight);
      if (
        ![earned, outOf, w].every(Number.isFinite) ||
        outOf <= 0 ||
        earned < 0 ||
        earned > outOf ||
        w <= 0
      )
        return null;
      total += (earned / outOf) * 100 * w;
      weight += w;
    }
    if (existing > 0) {
      before += average * share;
      beforeWeight += share;
    }
    if (weight > 0) {
      after += (total / weight) * share;
      afterWeight += share;
    }
  }
  if (
    !afterWeight ||
    additions.some((a) => !categories.some((c) => c.name === a.category))
  )
    return null;
  return {
    baseline: beforeWeight ? before / beforeWeight : 0,
    projected: after / afterWeight,
  };
}
