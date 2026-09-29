import { useState } from "react";
import { ArrowLeft, ChevronDown, Eye, TrendingUp } from "lucide-react";
import type { Snapshot } from "./storage";
import { averageTrend, courseTrends, type TrendPoint } from "./trends";
const timestamp = (date: string) =>
  new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
function TrendChart({ name, points }: { name: string; points: TrendPoint[] }) {
  const valid = points.filter(
    (point) => point.value !== null && Number.isFinite(Date.parse(point.date)),
  );
  const first = valid[0],
    last = valid.at(-1);
  const minTime = first ? Date.parse(first.date) : 0;
  const maxTime = last ? Date.parse(last.date) : 0;
  const x = (point: TrendPoint) =>
    maxTime === minTime
      ? 310
      : 48 + ((Date.parse(point.date) - minTime) / (maxTime - minTime)) * 528;
  const y = (value: number) => 178 - Math.max(0, Math.min(100, value)) * 1.5;
  // Missing marks break the line instead of implying a measured value.
  const path = points.reduce<{ d: string; connected: boolean }>(
    (acc, point) =>
      point.value === null || !Number.isFinite(Date.parse(point.date))
        ? { ...acc, connected: false }
        : {
            d: `${acc.d} ${acc.connected ? "L" : "M"}${x(point)},${y(point.value)}`,
            connected: true,
          },
    { d: "", connected: false },
  ).d;
  return (
    <section className="trend-card" data-part="trend-card">
      <header>
        <h2>{name}</h2>
        <strong>{last ? `${last.value!.toFixed(1)}%` : "—"}</strong>
      </header>
      {!valid.length ? (
        <p className="muted">
          No recorded marks yet. Refresh grades to start tracking.
        </p>
      ) : (
        <>
          <svg
            viewBox="0 0 620 215"
            role="img"
            aria-label={`${name}: ${valid.length} observations, latest ${last!.value!.toFixed(1)} percent`}
          >
            {[0, 25, 50, 75, 100].map((value) => (
              <g key={value}>
                <line
                  x1="48"
                  x2="576"
                  y1={y(value)}
                  y2={y(value)}
                  className="trend-grid"
                />
                <text x="36" y={y(value) + 4} textAnchor="end">
                  {value}%
                </text>
              </g>
            ))}
            <path d={path} className="trend-line" />
            {valid.map((point, index) => (
              <circle
                key={index}
                cx={x(point)}
                cy={y(point.value!)}
                r="4"
                className="trend-point"
              >
                <title>
                  {timestamp(point.date)}: {point.value!.toFixed(1)}%
                  {point.count !== undefined
                    ? ` across ${point.count} courses`
                    : ""}
                </title>
              </circle>
            ))}
            <text x="48" y="205">
              {new Date(first.date).toLocaleDateString()}
            </text>
            {maxTime !== minTime && (
              <text x="576" y="205" textAnchor="end">
                {new Date(last!.date).toLocaleDateString()}
              </text>
            )}
          </svg>
          <p className="muted">
            {valid.length < 2
              ? "First recorded mark. Refresh again later to see a trend."
              : `${(last!.value! - first.value!).toFixed(1)} percentage points since the first recorded mark.`}
          </p>
          <details className="trend-data">
            <summary>
              <ChevronDown
                size={16}
                className="disclosure-icon"
                aria-hidden="true"
              />
              Recorded marks
            </summary>
            <div className="trend-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Mark</th>
                    {valid.some((point) => point.count !== undefined) && (
                      <th>Courses</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[...valid].reverse().map((point, index) => (
                    <tr key={index}>
                      <td>{timestamp(point.date)}</td>
                      <td>{point.value!.toFixed(1)}%</td>
                      {point.count !== undefined && <td>{point.count}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
export function Trends({
  snapshot,
  courseId,
  privateMarks,
  onBack,
}: {
  snapshot: Snapshot;
  courseId: string | null;
  privateMarks: boolean;
  onBack: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const course = snapshot.reports.courses.find(
    (course) => course.id === courseId,
  );
  const series = courseId
    ? courseTrends(snapshot, courseId)
    : [{ name: "All-course average", points: averageTrend(snapshot) }];
  return (
    <section data-part="trends">
      <button className="back" onClick={onBack}>
        <ArrowLeft size={16} />
        Back
      </button>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{course?.code ?? "ALL COURSES"}</span>
          <h1>Trends.</h1>
          <p className="muted">
            {course
              ? "Course and category marks recorded over time."
              : "Unweighted average of available course marks at each refresh."}
          </p>
        </div>
        <TrendingUp size={32} aria-hidden="true" />
      </div>
      {privateMarks && !revealed ? (
        <button className="secondary" onClick={() => setRevealed(true)}>
          <Eye size={18} />
          Reveal trends
        </button>
      ) : (
        <>
          <div className="trends-grid">
            {series.map((series) => (
              <TrendChart key={series.name} {...series} />
            ))}
          </div>
          {courseId && series.length === 1 && (
            <p className="muted">
              Category trends (Knowledge, Thinking, Communication, Application,
              and other published sections) begin with your next course report
              refresh.
            </p>
          )}
          <p className="muted">
            Recorded refresh dates, not assessment dates. Unpublished marks are
            excluded. Earlier category marks that weren’t saved cannot be
            reconstructed.
          </p>
        </>
      )}
    </section>
  );
}
