import { useEffect, useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  Circle,
  ChevronDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Star,
  Plus,
  Download,
  RefreshCw,
} from "lucide-react";
import { fetchSchoolCalendar, native } from "./api";
import {
  calendarICS,
  googleEventUrl,
  localDate,
  parseSchoolCalendar,
  type SchoolEvent,
} from "./schoolCalendar";
import { Modal } from "./Modal";
interface Saved {
  events: SchoolEvent[];
  stars: string[];
  personal: SchoolEvent[];
  updated?: string;
}
const empty: Saved = { events: [], stars: [], personal: [] };
export function SchoolCalendar({
  url,
  school,
  account,
  refreshToken = 0,
}: {
  url?: string;
  school: string;
  account: string;
  refreshToken?: number;
}) {
  const storageKey = `teach-assist.calendar.v1:${account}:${url || school}`;
  const [saved, setSaved] = useState<Saved>(() => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "null");
      return value &&
        Array.isArray(value.events) &&
        Array.isArray(value.stars) &&
        Array.isArray(value.personal)
        ? value
        : empty;
    } catch {
      return empty;
    }
  });
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [month, setMonth] = useState(localDate().slice(0, 7)),
    [day, setDay] = useState(localDate()),
    [query, setQuery] = useState("");
  const [view, setView] = useState<"month" | "agenda" | "starred">("agenda");
  const [monthFilter, setMonthFilter] = useState("all");
  const [editing, setEditing] = useState<SchoolEvent | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  function save(next: Saved) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSaved(next);
    } catch {
      setError("Could not save calendar changes on this device.");
    }
  }
  useEffect(() => {
    if (!url || !native) return;
    let active = true;
    setBusy(true);
    setError("");
    fetchSchoolCalendar(url)
      .then((events) => {
        if (active)
          setSaved((current) => {
            const next = {
              ...current,
              events,
              updated: new Date().toISOString(),
            };
            try {
              localStorage.setItem(storageKey, JSON.stringify(next));
            } catch {
              setError(
                "Calendar loaded, but could not be cached on this device.",
              );
            }
            return next;
          });
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [url, storageKey, attempt, refreshToken]);
  const events = [
    ...saved.events.filter((e) => !/^Day\s+\d+$/i.test(e.title.trim())),
    ...saved.personal,
  ].sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
  );
  const starred = events.filter((e) => saved.stars.includes(e.id));
  const upcoming = events
    .filter((e) => e.date >= localDate() && !/^Day \d+$/.test(e.title))
    .slice(0, 2);
  const availableMonths = [
    ...new Set(events.map((event) => event.date.slice(0, 7))),
  ].sort();
  const visible = events.filter(
    (event) =>
      (view !== "starred" || saved.stars.includes(event.id)) &&
      (view === "month" && !query
        ? event.date === day
        : monthFilter === "all" || event.date.startsWith(monthFilter)) &&
      `${event.title} ${event.notes || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function shiftMonth(delta: number) {
    const d = new Date(`${month}-01T12:00:00`);
    d.setMonth(d.getMonth() + delta);
    setMonth(localDate(d).slice(0, 7));
    setDay(localDate(d));
  }
  function toggleStar(e: SchoolEvent) {
    save({
      ...saved,
      stars: saved.stars.includes(e.id)
        ? saved.stars.filter((id) => id !== e.id)
        : [...saved.stars, e.id],
    });
  }
  async function exportStarred() {
    setError("");
    try {
      const data = calendarICS(starred, school);
      if (native) {
        const { Filesystem, Directory, Encoding } =
          await import("@capacitor/filesystem");
        const { Share } = await import("@capacitor/share");
        const file = await Filesystem.writeFile({
          path: "school-events.ics",
          data,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({ title: "School events", files: [file.uri] });
      } else {
        const href = URL.createObjectURL(
          new Blob([data], { type: "text/calendar;charset=utf-8" }),
        );
        const a = document.createElement("a");
        a.href = href;
        a.download = "school-events.ics";
        a.click();
        setTimeout(() => URL.revokeObjectURL(href), 1000);
      }
      setNotice(
        "Calendar file ready. Import it in Google Calendar on a computer under Settings → Import & export.",
      );
    } catch {
      setError(
        "Export could not finish. You can also add each event using its Google Calendar link.",
      );
    }
  }
  const start = new Date(`${month}-01T12:00:00`).getDay();
  const days = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    0,
  ).getDate();
  return (
    <>
      <button
        className="dashboard-tile calendar-tile"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <span className="tile-top">
          <span className="eyebrow">04 / SCHOOL CALENDAR</span>
          <CalendarDays size={26} />
        </span>
        <h2>What’s coming up.</h2>
        <div className="calendar-preview">
          {upcoming.length ? (
            upcoming.map((e) => (
              <span key={e.id}>
                <b>{e.date.slice(5).replace("-", "/")}</b> {e.title}
              </span>
            ))
          ) : (
            <span>
              {busy
                ? "Loading school events…"
                : error
                  ? "Calendar unavailable · Open to retry"
                  : saved.updated
                    ? "No upcoming school events"
                    : "Open your school calendar"}
            </span>
          )}
        </div>
        <span className="tile-bottom">
          {starred.length} important events
          <span>
            View calendar <ArrowRight size={16} aria-hidden="true" />
          </span>
        </span>
      </button>
      {open && (
        <Modal
          title="School calendar"
          closeLabel="Close calendar"
          label={school || "YOUR SCHOOL YEAR"}
          onClose={() => setOpen(false)}
        >
          <div className="school-calendar">
            {view === "month" && (
              <div className="calendar-toolbar">
                <button
                  aria-label="Previous month"
                  onClick={() => shiftMonth(-1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <h3>
                  {new Date(`${month}-01T12:00:00`).toLocaleDateString(
                    undefined,
                    { month: "long", year: "numeric" },
                  )}
                </h3>
                <button aria-label="Next month" onClick={() => shiftMonth(1)}>
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => {
                    setMonth(localDate().slice(0, 7));
                    setDay(localDate());
                  }}
                >
                  Today
                </button>
                <button
                  aria-label="Refresh school calendar"
                  disabled={busy || !url || !native}
                  onClick={() => setAttempt((a) => a + 1)}
                >
                  <RefreshCw size={18} className={busy ? "spinning" : ""} />
                </button>
              </div>
            )}
            {error && <p role="alert">{error}</p>}
            {notice && <p role="status">{notice}</p>}
            {busy && <p role="status">Refreshing school events…</p>}
            <div className="calendar-controls">
              <div className="calendar-views">
                {(["month", "agenda", "starred"] as const).map((v) => (
                  <button
                    key={v}
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                  >
                    {v === "starred"
                      ? `Important (${starred.length})`
                      : v === "month"
                        ? "Month"
                        : "Agenda"}
                  </button>
                ))}
              </div>
              <input
                aria-label="Search calendar events"
                placeholder="Search events…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {view !== "month" && (
              <div className="calendar-year-filter">
                <label>
                  Month{" "}
                  <select
                    aria-label="Filter calendar by month"
                    value={monthFilter}
                    onChange={(event) => setMonthFilter(event.target.value)}
                  >
                    <option value="all">All months · full year</option>
                    {availableMonths.map((value) => (
                      <option key={value} value={value}>
                        {new Date(`${value}-01T12:00:00`).toLocaleDateString(
                          undefined,
                          { month: "long", year: "numeric" },
                        )}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  aria-label="Refresh school calendar"
                  disabled={busy || !url || !native}
                  onClick={() => setAttempt((a) => a + 1)}
                >
                  <RefreshCw size={18} className={busy ? "spinning" : ""} />
                </button>
              </div>
            )}
            {view === "month" && !query && (
              <div className="calendar-month">
                <div className="calendar-weekdays">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (d) => (
                      <span key={d}>{d}</span>
                    ),
                  )}
                </div>
                <div className="calendar-days">
                  {Array.from({ length: start }, (_, i) => (
                    <span key={`blank-${i}`} />
                  ))}
                  {Array.from({ length: days }, (_, i) => {
                    const date = `${month}-${String(i + 1).padStart(2, "0")}`;
                    const items = events.filter((e) => e.date === date);
                    return (
                      <button
                        key={date}
                        className={date === localDate() ? "today" : ""}
                        aria-pressed={day === date}
                        aria-label={`${date}, ${items.length} events`}
                        onClick={() => setDay(date)}
                      >
                        <span>{i + 1}</span>
                        <small>
                          {items.some((e) => saved.stars.includes(e.id)) ? (
                            <Star
                              size={12}
                              fill="currentColor"
                              aria-hidden="true"
                            />
                          ) : items.length ? (
                            <Circle
                              size={6}
                              fill="currentColor"
                              aria-hidden="true"
                            />
                          ) : (
                            ""
                          )}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="calendar-actions">
              <button
                onClick={() =>
                  setEditing({
                    id: crypto.randomUUID(),
                    date: day,
                    title: "",
                    notes: "",
                    personal: true,
                  })
                }
              >
                <Plus size={16} /> Add personal event
              </button>
              <button
                disabled={!starred.length}
                onClick={() => void exportStarred()}
              >
                <Download size={16} /> Export important
              </button>
            </div>
            <p className="muted">
              {query
                ? "Search results"
                : view === "month"
                  ? new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
                      dateStyle: "full",
                    })
                  : view === "starred"
                    ? "Important events · all dates"
                    : monthFilter === "all"
                      ? "Events across the full school year"
                      : "Events in the selected month"}
            </p>
            <div className="calendar-agenda">
              {!visible.length && (
                <p className="empty">
                  {view === "starred"
                    ? "Star events to keep them here and export them together."
                    : "No events to show."}
                </p>
              )}
              {visible.map((e) => (
                <article key={e.id}>
                  <button
                    className="calendar-star"
                    aria-label={`${saved.stars.includes(e.id) ? "Unmark" : "Mark"} ${e.title} as important`}
                    aria-pressed={saved.stars.includes(e.id)}
                    onClick={() => toggleStar(e)}
                  >
                    <Star
                      size={20}
                      fill={
                        saved.stars.includes(e.id) ? "currentColor" : "none"
                      }
                    />
                  </button>
                  <div>
                    <strong>{e.title}</strong>
                    <small>
                      {e.date} · All day{e.personal ? " · Personal" : ""}
                    </small>
                    {e.notes && <p>{e.notes}</p>}
                    <div className="calendar-event-actions">
                      <a
                        href={googleEventUrl(e, school)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Add to Google Calendar{" "}
                        <ExternalLink size={14} aria-hidden="true" />
                      </a>
                      {e.personal && (
                        <>
                          <button onClick={() => setEditing({ ...e })}>
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              save({
                                ...saved,
                                personal: saved.personal.filter(
                                  (p) => p.id !== e.id,
                                ),
                                stars: saved.stars.filter((id) => id !== e.id),
                              })
                            }
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {editing && (
              <form
                className="calendar-editor"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!editing.title.trim()) return;
                  save({
                    ...saved,
                    personal: [
                      ...saved.personal.filter((p) => p.id !== editing.id),
                      { ...editing, title: editing.title.trim() },
                    ],
                  });
                  setDay(editing.date);
                  setMonth(editing.date.slice(0, 7));
                  setView("month");
                  setQuery("");
                  setEditing(null);
                }}
              >
                <h3>
                  {saved.personal.some((e) => e.id === editing.id)
                    ? "Edit event"
                    : "New personal event"}
                </h3>
                <label>
                  Title
                  <input
                    required
                    maxLength={200}
                    value={editing.title}
                    onChange={(e) =>
                      setEditing({ ...editing, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Date
                  <input
                    required
                    type="date"
                    value={editing.date}
                    onChange={(e) =>
                      setEditing({ ...editing, date: e.target.value })
                    }
                  />
                </label>
                <label>
                  Notes
                  <textarea
                    value={editing.notes}
                    onChange={(e) =>
                      setEditing({ ...editing, notes: e.target.value })
                    }
                  />
                </label>
                <button type="submit">Save event</button>
                <button type="button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </form>
            )}
            <details className="calendar-help">
              <summary>
                <ChevronDown
                  className="disclosure-icon"
                  size={16}
                  aria-hidden="true"
                />
                Calendar source & Google Calendar export
              </summary>
              <p>
                Stars and personal events are saved on this device. School
                events refresh when you open the dashboard. Google Calendar
                links open an event for you to review and save; exports are
                copies, not a live sync. Set reminders and repeat rules in
                Google Calendar after saving.
              </p>
              <p>
                For bulk import, export important events, then open Google
                Calendar on a computer → Settings → Import & export.{" "}
                <a
                  href="https://support.google.com/calendar/answer/37118"
                  target="_blank"
                  rel="noreferrer"
                >
                  Import help <ExternalLink size={14} aria-hidden="true" />
                </a>
              </p>
              {saved.updated && (
                <p>Last loaded: {new Date(saved.updated).toLocaleString()}</p>
              )}
              {url && (
                <a href={url} target="_blank" rel="noreferrer">
                  Open school calendar{" "}
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              )}
              <label>
                Import a saved school calendar HTML
                <input
                  type="file"
                  accept=".html,.htm,text/html"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const events = parseSchoolCalendar(await file.text());
                      save({
                        ...saved,
                        events,
                        updated: new Date().toISOString(),
                      });
                      setError("");
                    } catch (error) {
                      setError(
                        error instanceof Error
                          ? error.message
                          : "Could not read calendar.",
                      );
                    }
                  }}
                />
              </label>
            </details>
          </div>
        </Modal>
      )}
    </>
  );
}
