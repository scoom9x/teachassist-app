import { useState } from "react";
import { loadBookingForm, submitBooking, cancelBooking } from "./api";
import type { BookingForm, parseAppointments } from "./appointments";
import { CalendarDays, Check, X } from "lucide-react";
import type { Appointment, AppointmentSlot } from "./appointments";
export function Appointments({
  date,
  slots,
  booked,
  onDate,
  onBook,
  onCancel,
  onUpdate,
  loading = false,
}: {
  loading?: boolean;
  onUpdate: (result: ReturnType<typeof parseAppointments>) => void;
  date: string;
  slots: AppointmentSlot[];
  booked: Appointment[];
  onDate: (date: string) => void;
  onBook: (slot: AppointmentSlot) => void;
  onCancel: (appointment: Appointment) => void;
}) {
  const [tab, setTab] = useState<"book" | "mine">("book");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<{
    slot: AppointmentSlot;
    form: BookingForm;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  async function run(action: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not update appointments.",
      );
    } finally {
      setPending(false);
    }
  }
  const byTeacher = slots.reduce<Record<string, AppointmentSlot[]>>(
    (groups, slot) => {
      (groups[slot.teacher] ??= []).push(slot);
      return groups;
    },
    {},
  );
  return (
    <div className="appointments-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">TEACH ASSIST / SCHOOL SERVICES</span>
          <h1>Appointments.</h1>
          <p className="muted">
            Choose a date to see available guidance appointment times.
          </p>
        </div>
        <CalendarDays size={42} />
      </div>
      <div
        className="appointment-tabs"
        role="tablist"
        aria-label="Appointments"
      >
        {(
          [
            ["book", "Book appointment"],
            ["mine", `My appointments (${booked.length})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`appointment-tab-${value}`}
            aria-selected={tab === value}
            aria-controls={`appointment-panel-${value}`}
            tabIndex={tab === value ? 0 : -1}
            disabled={pending}
            onClick={() => setTab(value)}
            onKeyDown={(event) => {
              if (
                ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "book"
                    : event.key === "End"
                      ? "mine"
                      : tab === "book"
                        ? "mine"
                        : "book";
                setTab(next);
                document.getElementById(`appointment-tab-${next}`)?.focus();
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {notice && (
        <p className="appointment-notice" role="status">
          <Check size={18} />
          {notice}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {(pending || loading) && (
        <p className="appointment-loading" role="status">
          Loading appointments…
        </p>
      )}
      <div
        key={tab}
        className="appointment-panel"
        role="tabpanel"
        id={`appointment-panel-${tab}`}
        aria-labelledby={`appointment-tab-${tab}`}
      >
        {tab === "book" && (
          <>
            <label className="appointment-date">
              Date
              <input
                disabled={pending || loading || !!booking}
                type="date"
                value={date}
                onChange={(e) => onDate(e.target.value)}
              />
            </label>

            {booking && (
              <form
                className="appointment-counselor"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    onUpdate(
                      await submitBooking(booking.form, reason, options),
                    );
                    setBooking(null);
                    setNotice("Appointment booked.");
                    setTab("mine");
                  });
                }}
              >
                <h2>Book {booking.slot.teacher}</h2>
                <p>
                  {date} · {booking.slot.time}
                </p>
                <label>
                  Reason{" "}
                  <select
                    required
                    disabled={pending}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  >
                    <option value="">Choose a reason</option>
                    {booking.form.reasons.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
                {booking.form.options.map((o) => (
                  <label
                    key={o.name}
                    style={{ display: "block", marginTop: 12 }}
                  >
                    <input
                      type="checkbox"
                      disabled={pending}
                      checked={options.includes(o.name)}
                      onChange={(e) =>
                        setOptions(
                          e.target.checked
                            ? [...options, o.name]
                            : options.filter((n) => n !== o.name),
                        )
                      }
                    />{" "}
                    {o.label}
                  </label>
                ))}
                <button type="submit" disabled={pending || !reason}>
                  Confirm booking
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setBooking(null)}
                >
                  Back
                </button>
              </form>
            )}
            <section className="appointment-slots">
              <h2>Open times</h2>
              {slots.length ? (
                Object.entries(byTeacher).map(([teacher, teacherSlots]) => (
                  <section className="appointment-counselor" key={teacher}>
                    <h3>{teacher}</h3>
                    <div className="appointment-times">
                      {teacherSlots.map((s, i) => (
                        <button
                          className="appointment-slot"
                          key={i}
                          disabled={pending || loading || !!booking}
                          onClick={() => {
                            if (!s.url) {
                              onBook(s);
                              setNotice("Appointment booked.");
                              setTab("mine");
                              return;
                            }
                            void run(async () => {
                              const form = await loadBookingForm(s.url);
                              setReason("");
                              setOptions([]);
                              setBooking({ slot: s, form });
                            });
                          }}
                        >
                          <strong>{s.time}</strong>
                          <Check size={18} /> Book
                        </button>
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <p className="empty">
                  {loading
                    ? "Checking availability…"
                    : date
                      ? "No open appointments for this date."
                      : "Choose a date to see open appointments."}
                </p>
              )}
            </section>
          </>
        )}
        {tab === "mine" && (
          <section className="appointment-booked">
            <h2>Your appointments</h2>
            <p className="muted">
              All appointments returned by TeachAssist, across dates.
            </p>
            {!booked.length && (
              <p className="empty">
                {loading
                  ? "Checking your appointments…"
                  : "You have no appointments booked yet."}
              </p>
            )}
            {[...booked]
              .sort((a, b) =>
                `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
              )
              .map((a, i) => (
                <article
                  key={a.cancelUrl || `${a.date}-${a.time}-${a.teacher}`}
                  style={{ animationDelay: `${Math.min(i, 5) * 45}ms` }}
                >
                  <div>
                    <strong>{a.teacher}</strong>
                    <span>
                      {a.date} · {a.time}
                    </span>
                  </div>
                  <button
                    className="danger"
                    disabled={pending || loading || !!booking}
                    onClick={() => {
                      if (!a.cancelUrl) {
                        onCancel(a);
                        setNotice("Appointment cancelled.");
                        return;
                      }
                      void run(async () => {
                        onUpdate(await cancelBooking(a.cancelUrl!));
                        setNotice("Appointment cancelled.");
                      });
                    }}
                  >
                    <X size={16} /> Cancel
                  </button>
                </article>
              ))}
          </section>
        )}
      </div>
    </div>
  );
}
