import { ChevronDown } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export function PreferenceHelp({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="preference-help">
      <summary aria-label={`About ${label}`}>
        <ChevronDown className="disclosure-icon" size={16} aria-hidden="true" />
        About this setting
      </summary>
      <p>{children}</p>
    </details>
  );
}

export function PreferenceSwitch({
  label,
  checked,
  disabled = false,
  onChange,
  children,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="preference-row">
      <label className="preference-switch">
        <span>{label}</span>
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="preference-track" aria-hidden="true" />
      </label>
      <PreferenceHelp label={label}>{children}</PreferenceHelp>
    </div>
  );
}

const intervals = [0, 5, 10, 15, 30, 60, 120, 240, 360, 720, 1440];
export function RefreshInterval({
  value,
  onChange,
}: {
  value: number;
  onChange: (minutes: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const position = intervals.reduce(
    (best, minutes, index) =>
      Math.abs(minutes - value) < Math.abs(intervals[best] - value)
        ? index
        : best,
    0,
  );
  function commit() {
    if (!draft.trim() || !Number.isFinite(Number(draft))) {
      setDraft(String(value));
      return;
    }
    const number = Number(draft);
    const next =
      number <= 0 ? 0 : Math.max(5, Math.min(1440, Math.round(number)));
    setDraft(String(next));
    if (next !== value) onChange(next);
  }
  return (
    <div className="preference-row">
      <div className="preference-heading">
        <label htmlFor="refresh-scale">Automatic grade refresh</label>
        <output>{value === 0 ? "Off" : `Every ${value} min`}</output>
      </div>
      <div className="refresh-interval">
        <div className="refresh-scale">
          <input
            id="refresh-scale"
            type="range"
            min="0"
            max={intervals.length - 1}
            step="1"
            value={position}
            aria-valuetext={value === 0 ? "Off" : `Every ${value} minutes`}
            onChange={(event) =>
              onChange(intervals[Number(event.target.value)])
            }
          />
          <div aria-hidden="true">
            <span>Off</span>
            <span>1 hour</span>
            <span>24 hours</span>
          </div>
        </div>
        <label className="refresh-number">
          <input
            aria-label="Refresh interval in minutes"
            type="number"
            inputMode="numeric"
            min="0"
            max="1440"
            step="1"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commit();
                event.currentTarget.blur();
              }
            }}
          />
          <span>min</span>
        </label>
      </div>
      <PreferenceHelp label="Automatic grade refresh">
        Set 0 to turn off, or 5–1,440 minutes. Requires a saved login.
        Background timing depends on your phone; Android checks at least 15
        minutes apart. Battery restrictions or force-quitting may pause updates.
      </PreferenceHelp>
    </div>
  );
}
