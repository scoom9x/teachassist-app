import { useDialogMotion } from "./useDialogMotion";
import { useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import type { Detail, Assessment } from "./parser";
import { PrivacyValue } from "./PrivacyValue";
export function expectationCode(name: string) {
  return (
    name
      .trim()
      .match(/^([A-Z]+\d+)\b/i)?.[1]
      .toUpperCase() ?? ""
  );
}
export function contributingAssessments(
  detail: Detail,
  name: string,
): Assessment[] {
  const code = expectationCode(name);
  return detail.assessments
    .map((a) => ({
      ...a,
      scores: a.scores.filter((s) =>
        detail.format === "expectations"
          ? !!code && expectationCode(s.category) === code
          : s.category.replace(/\s/g, "").toLowerCase() ===
            name.replace(/\s/g, "").toLowerCase(),
      ),
    }))
    .filter((a) => a.scores.length);
}
export function CourseCategories({
  detail,
  blurMarks = false,
}: {
  detail: Detail;
  blurMarks?: boolean;
}) {
  const [selected, setSelected] = useState<Detail["categories"][number] | null>(
    null,
  );
  const { ref: dialog, close } = useDialogMotion(!!selected, () =>
    setSelected(null),
  );
  const assessments = selected
    ? contributingAssessments(detail, selected.name)
    : [];
  return (
    <section className="course-breakdown">
      <div className="section-heading">
        <div>
          <h2>
            {detail.format === "expectations"
              ? "Overall expectations"
              : "Category breakdown"}
          </h2>
          <p className="muted">Select a section to explore its assessments.</p>
        </div>
      </div>
      <div
        className={`category-grid ${detail.format === "expectations" ? "expectation-grid" : ""}`}
      >
        {detail.categories.map((c, i) => {
          const code =
            detail.format === "expectations" ? expectationCode(c.name) : "";
          const count = contributingAssessments(detail, c.name).length;
          return (
            <button
              className={`category category-button color-${i % 4}`}
              key={c.name}
              onClick={() => setSelected(c)}
              aria-haspopup="dialog"
            >
              <span className="category-heading">
                <b>{code || c.name}</b>
                <ArrowUpRight size={18} />
              </span>
              {code && (
                <span className="expectation-description">
                  {c.name.replace(/^[A-Z]+\d+\.?\s*:?\s*/i, "")}
                </span>
              )}
              <strong>
                <PrivacyValue enabled={blurMarks} value={c.achievement} />
              </strong>
              <small>
                {detail.format === "expectations"
                  ? `Total weight: ${c.weighting}`
                  : `${c.weighting} category · ${c.courseWeighting} course weight`}
              </small>
              <span className="assessment-count">
                {count} assessment{count === 1 ? "" : "s"} · View details
              </span>
            </button>
          );
        })}
      </div>
      <dialog
        ref={dialog}
        className="assessment-dialog"
        aria-labelledby="expectation-title"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClose={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const box = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < box.left ||
              e.clientX > box.right ||
              e.clientY < box.top ||
              e.clientY > box.bottom
            )
              close();
          }
        }}
      >
        {selected && (
          <>
            <header className="dialog-heading">
              <div>
                <span className="eyebrow">
                  {detail.format === "expectations"
                    ? "OVERALL EXPECTATION"
                    : "CATEGORY"}
                </span>
                <h2 id="expectation-title">{selected.name}</h2>
                <p>
                  <PrivacyValue
                    enabled={blurMarks}
                    value={selected.achievement}
                  />{" "}
                  · {assessments.length} linked assessments
                </p>
              </div>
              <button autoFocus aria-label="Close assessments" onClick={close}>
                <X size={22} />
              </button>
            </header>
            <div className="dialog-assessments">
              {assessments.length ? (
                assessments.map((a, i) => (
                  <article key={i} className="contribution">
                    <h3>{a.name}</h3>
                    <div className="contribution-scores">
                      {a.scores.map((s, j) => (
                        <div
                          key={j}
                          className={
                            s.excluded
                              ? "contribution-score excluded"
                              : "contribution-score"
                          }
                        >
                          <strong>
                            <PrivacyValue
                              enabled={blurMarks}
                              value={s.text.split(/weight\s*=/i)[0]}
                            />
                          </strong>
                          <span>
                            {s.excluded
                              ? "Excluded · does not contribute"
                              : `Weight ${s.text.match(/weight\s*=\s*([\d.]+)/i)?.[1] ?? "not provided"}`}
                          </span>
                        </div>
                      ))}
                    </div>
                    {a.comment && (
                      <p className="assessment-feedback">{a.comment}</p>
                    )}
                  </article>
                ))
              ) : (
                <p className="empty-expectation">
                  No assessments are listed for this section yet.
                </p>
              )}
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
