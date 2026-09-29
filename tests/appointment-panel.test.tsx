// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { it, expect, vi } from "vitest";
import { Appointments } from "../src/AppointmentPanel";
it("shows bookings across dates in their own tab and switches there after demo booking", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const onBook = vi.fn();
  try {
    await act(async () =>
      root.render(
        <Appointments
          date="2026-09-28"
          slots={[{ teacher: "Counselor", time: "12:00", url: "" }]}
          booked={[
            { teacher: "Later", date: "2026-10-02", time: "13:00" },
            { teacher: "Earlier", date: "2026-09-29", time: "10:00" },
          ]}
          onBook={onBook}
          onCancel={vi.fn()}
          onDate={vi.fn()}
          onUpdate={vi.fn()}
        />,
      ),
    );
    expect(
      host.querySelector<HTMLInputElement>('input[type="date"]')?.value,
    ).toBe("2026-09-28");
    await act(async () =>
      (host.querySelector(".appointment-slot") as HTMLButtonElement).click(),
    );
    expect(onBook).toHaveBeenCalledOnce();
    expect(host.querySelector('[aria-selected="true"]')?.textContent).toBe(
      "My appointments (2)",
    );
    expect(
      [...host.querySelectorAll("article strong")].map((e) => e.textContent),
    ).toEqual(["Earlier", "Later"]);
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      "Appointment booked",
    );
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
