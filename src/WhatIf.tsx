import { ChevronDown } from "lucide-react";
import { ExperimentToggle } from "./ExperimentToggle";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Detail } from "./parser";
import {
  initialCategories,
  project,
  type Hypothetical,
} from "./gradeProjection";
export function WhatIf({ detail }: { detail: Detail }) {
  const [enabled, setEnabled] = useState(false);
  const [categories, setCategories] = useState(() => initialCategories(detail));
  const [rows, setRows] = useState<Hypothetical[]>([]);
  const [nextId, setNextId] = useState(1);
  const result = project(categories, rows);
  function add() {
    setRows([
      ...rows,
      {
        id: nextId,
        name: `Assessment ${nextId}`,
        category: categories[0]?.name ?? "",
        earned: "",
        outOf: "100",
        weight: "1",
      },
    ]);
    setNextId(nextId + 1);
  }
  return (
    <section className="what-if">
      <ExperimentToggle enabled={enabled} onChange={setEnabled} />
      {enabled && (
        <div className="simulation-panel">
          <span className="eyebrow">SIMULATION · UNSAVED</span>
          <h2>What if?</h2>
          <p>
            Add several hypothetical scores to see their combined effect. Saved
            grades and history stay unchanged. Drafts reset when you leave this
            page.
          </p>
          <p>
            This estimate uses weighted category averages. Review the current
            averages, total existing assessment weights, and course shares
            below.{" "}
            {detail.format === "expectations" &&
              "Overall-expectation reports require you to enter the model weights; teacher judgments and level conversions may differ."}{" "}
            Ungraded categories can start at existing weight 0.
          </p>
          <details>
            <summary>
              <ChevronDown
                className="disclosure-icon"
                size={16}
                aria-hidden="true"
              />
              Review calculation assumptions
            </summary>
            {categories.map((c, i) => (
              <fieldset key={c.name}>
                <legend>{c.name}</legend>
                <div className="simulation-fields">
                  {(
                    [
                      ["average", "Current average (%)"],
                      ["existingWeight", "Existing assessment weight"],
                      ["courseWeight", "Course share (%)"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        type="number"
                        min="0"
                        max={key === "existingWeight" ? undefined : 100}
                        step="any"
                        value={c[key]}
                        onChange={(e) =>
                          setCategories(
                            categories.map((v, j) =>
                              j === i ? { ...v, [key]: e.target.value } : v,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </details>
          {!categories.length && (
            <p>No category weights are available for this report.</p>
          )}
          {rows.map((row, i) => (
            <fieldset key={row.id}>
              <legend>Hypothetical assessment {i + 1}</legend>
              <div className="simulation-fields">
                <label>
                  Name
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
                  Category / expectation
                  <select
                    value={row.category}
                    onChange={(e) =>
                      setRows(
                        rows.map((r) =>
                          r.id === row.id
                            ? { ...r, category: e.target.value }
                            : r,
                        ),
                      )
                    }
                  >
                    {categories.map((c) => (
                      <option key={c.name}>{c.name}</option>
                    ))}
                  </select>
                </label>
                {(
                  [
                    ["earned", "Mark earned"],
                    ["outOf", "Out of"],
                    ["weight", "Assessment weight"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      min={key === "earned" ? 0 : 0.01}
                      step="any"
                      value={row[key]}
                      onChange={(e) =>
                        setRows(
                          rows.map((r) =>
                            r.id === row.id
                              ? { ...r, [key]: e.target.value }
                              : r,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
                <button
                  className="secondary"
                  aria-label={`Remove assessment ${i + 1}`}
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
              disabled={!categories.length}
              onClick={add}
            >
              <Plus size={18} /> Add assessment
            </button>
            <button
              className="secondary"
              onClick={() => {
                setRows([]);
                setCategories(initialCategories(detail));
              }}
            >
              Reset simulation
            </button>
          </div>
          <div className="simulation-result" aria-live="polite">
            {result ? (
              <>
                <span>
                  Estimated grade with {rows.length} added assessment
                  {rows.length === 1 ? "" : "s"}
                </span>
                <strong>{result.projected.toFixed(1)}%</strong>
                <span>
                  Model baseline: {result.baseline.toFixed(1)}% ·{" "}
                  {result.projected >= result.baseline ? "+" : ""}
                  {(result.projected - result.baseline).toFixed(1)} percentage
                  points
                </span>
              </>
            ) : (
              <p>
                Enter valid marks and model weights to calculate an estimate.
                Scores must be between 0 and “Out of”; assessment weights must
                be positive.
              </p>
            )}
          </div>
          <small>
            Course shares are normalized across categories with marks. This is
            an estimate, not an official or predicted teacher-reported grade.
          </small>
        </div>
      )}
    </section>
  );
}
