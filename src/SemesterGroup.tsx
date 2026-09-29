import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
export function SemesterGroup({
  title,
  count,
  children,
  onSelect,
}: {
  title: string;
  count: number;
  children: ReactNode;
  onSelect?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <section
      className={`sidebar-semester ${open ? "semester-open" : "semester-closed"}`}
    >
      <div className="semester-heading-controls">
        <button
          aria-label={
            onSelect ? `${open ? "Collapse" : "Expand"} ${title}` : undefined
          }
          className="semester-toggle"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
        >
          <ChevronRight size={16} />
          {!onSelect && (
            <>
              <span>{title}</span>
              <small>{count}</small>
            </>
          )}
        </button>
        {onSelect && (
          <button className="semester-link" onClick={onSelect}>
            {title}
            <small>{count}</small>
          </button>
        )}
      </div>
      <div
        className="semester-reveal"
        id={id}
        inert={!open}
        aria-hidden={!open}
      >
        <div className="semester-clip">
          <div className="semester-courses">{children}</div>
        </div>
      </div>
    </section>
  );
}
