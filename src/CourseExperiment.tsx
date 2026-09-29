import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ExperimentToggle } from "./ExperimentToggle";
export function hypotheticalAverage(
  existing: number[],
  additions: string[],
): number | null {
  if (
    additions.some(
      (v) =>
        v.trim() === "" ||
        !Number.isFinite(Number(v)) ||
        Number(v) < 0 ||
        Number(v) > 100,
    )
  )
    return null;
  const marks = [...existing, ...additions.map(Number)];
  return marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : null;
}
export function CourseExperiment({ marks }: { marks: number[] }) {
  const [enabled, setEnabled] = useState(false);
  const [rows, setRows] = useState<
    { id: number; name: string; mark: string }[]
  >([]);
  const [nextId, setNextId] = useState(1);
  const result = hypotheticalAverage(
    marks,
    rows.map((r) => r.mark),
  );
  const baseline = hypotheticalAverage(marks, []);
  return (
    <section className="what-if">
      <ExperimentToggle
        enabled={enabled}
        onChange={setEnabled}
        label="Experiment with hypothetical courses"
      />
      {enabled && (
        <div className="simulation-panel">
          <span className="eyebrow">SIMULATION · UNSAVED</span>
          <h2>What if I added courses?</h2>
          <p>
            Estimate your overall average by adding hypothetical courses to the{" "}
            {marks.length} currently graded courses. Each course counts equally.
            Real courses and history stay unchanged; drafts reset when you leave
            Grades.
          </p>
          {rows.map((row, index) => (
            <fieldset key={row.id}>
              <legend>Hypothetical course {index + 1}</legend>
              <div className="simulation-fields">
                <label>
                  Course name
                  <input
                    value={row.name}
                    onChange={(e) =>
                      setRows(
                        rows.map((r) =>
                          r.id === row.id ? { ...r, name: e.target.value } : r,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Course grade (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={row.mark}
                    onChange={(e) =>
                      setRows(
                        rows.map((r) =>
                          r.id === row.id ? { ...r, mark: e.target.value } : r,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  className="secondary"
                  aria-label={`Remove hypothetical course ${index + 1}`}
                  onClick={() => setRows(rows.filter((r) => r.id !== row.id))}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </fieldset>
          ))}
          <div className="simulation-actions">
            <button
              className="secondary"
              onClick={() => {
                setRows([
                  ...rows,
                  { id: nextId, name: `Course ${nextId}`, mark: "" },
                ]);
                setNextId(nextId + 1);
              }}
            >
              <Plus size={18} /> Add hypothetical course
            </button>
            <button className="secondary" onClick={() => setRows([])}>
              Reset simulation
            </button>
          </div>
          <div className="simulation-result" aria-live="polite">
            <span>Estimated overall average</span>
            {result === null ? (
              <p>Enter a grade from 0 to 100 for each hypothetical course.</p>
            ) : (
              <>
                <strong>{result.toFixed(1)}%</strong>
                {baseline !== null && (
                  <span>
                    Current average: {baseline.toFixed(1)}% ·{" "}
                    {result >= baseline ? "+" : ""}
                    {(result - baseline).toFixed(1)} percentage points
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
