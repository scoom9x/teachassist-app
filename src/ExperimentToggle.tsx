import { FlaskConical } from "lucide-react";
export function ExperimentToggle({
  enabled,
  onChange,
  label = "Experiment with grades",
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <label className="experiment-toggle">
      <FlaskConical size={19} />
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch-track" aria-hidden="true" />
    </label>
  );
}
