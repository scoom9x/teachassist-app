import { TrendingUp } from "lucide-react";
import type { Course } from "./parser";
import { PrivacyValue } from "./PrivacyValue";
export function GradeOverview({
  average,
  courses,
  count,
  privateMarks,
  hypothetical,
  onTrends,
}: {
  average: number | null;
  courses: Course[];
  count: number;
  privateMarks: boolean;
  hypothetical: boolean;
  onTrends?: () => void;
}) {
  const mean = (key: "midterm" | "final") => {
    const values = courses.flatMap((c) => (c[key] != null ? [c[key]!] : []));
    return values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null;
  };
  const mark = (n: number | null) => (n === null ? "—" : `${n.toFixed(1)}%`);
  return (
    <section className="grade-overview" aria-label="Grade summary">
      <div className="grade-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="ring-track" cx="60" cy="60" r="52" />
          <circle
            className="ring-value"
            cx="60"
            cy="60"
            r="52"
            pathLength="100"
            strokeDasharray={`${privateMarks ? 0 : Math.max(0, Math.min(100, average ?? 0))} 100`}
          />
        </svg>
        <div>
          <strong>
            <PrivacyValue enabled={privateMarks} value={mark(average)} />
          </strong>
          <span>{hypothetical ? "What-if average" : "Current average"}</span>
        </div>
      </div>
      <div className="grade-summary-details">
        <span className="eyebrow">YOUR PROGRESS</span>
        <dl>
          {(
            [
              ["Midterm avg", hypothetical ? null : mean("midterm")],
              ["Final avg", hypothetical ? null : mean("final")],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <PrivacyValue enabled={privateMarks} value={mark(value)} />
              </dd>
            </div>
          ))}
          <div>
            <dt>Courses</dt>
            <dd>{courses.length}</dd>
          </div>
        </dl>
        <small>
          Average of {count} available marks. Unposted marks excluded.
        </small>
        {onTrends && (
          <button
            className="secondary summary-trends-button"
            disabled={hypothetical}
            onClick={onTrends}
          >
            <TrendingUp size={16} />
            Trends
          </button>
        )}
      </div>
    </section>
  );
}
