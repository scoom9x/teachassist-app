import { useState, type ReactNode } from "react";
export function PrivacyValue({
  value,
  enabled,
  label = "Tap to reveal mark",
}: {
  value: ReactNode;
  enabled: boolean;
  label?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  if (!enabled || revealed) return <>{value}</>;
  return (
    <span
      role="button"
      tabIndex={0}
      className="privacy-value"
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setRevealed(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          setRevealed(true);
        }
      }}
    >
      <span aria-hidden="true">••••</span>
      <small>Tap to reveal</small>
    </span>
  );
}
