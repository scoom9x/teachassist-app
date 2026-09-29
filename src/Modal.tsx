import { type ReactNode } from "react";
import { useDialogMotion } from "./useDialogMotion";
import { X } from "lucide-react";
export function Modal({
  title,
  label,
  onClose,
  children,
  closeLabel = "Close weather",
}: {
  title: string;
  label: string;
  onClose: () => void;
  children: ReactNode;
  closeLabel?: string;
}) {
  const { ref, close } = useDialogMotion(true, onClose);
  return (
    <dialog
      ref={ref}
      className="assessment-dialog weather-dialog"
      aria-labelledby="weather-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClose={(e) => {
        if (!e.currentTarget.open) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            close();
        }
      }}
    >
      <header className="dialog-heading">
        <div>
          <span className="eyebrow">{label}</span>
          <h2 id="weather-title">{title}</h2>
        </div>
        <button autoFocus aria-label={closeLabel} onClick={close}>
          <X />
        </button>
      </header>
      {children}
    </dialog>
  );
}
