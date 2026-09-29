// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { parseBookingForm, parseAppointments } from "../src/appointments";

const sample = "/Users/lenny/Downloads/idk2.html";
it.skipIf(!existsSync(sample))(
  "parses the selected date, booked slot, and counselor groups",
  () => {
    const result = parseAppointments(readFileSync(sample, "utf8"));
    expect(result.date).toBe("2026-09-29");
    expect(result.booked[0]).toMatchObject({
      teacher: expect.stringContaining("Jarrett"),
      time: "13:20:00",
    });
    expect(
      result.slots.filter((slot) => slot.teacher.includes("Garito")),
    ).not.toHaveLength(0);
    expect(
      result.slots.filter((slot) => slot.teacher.includes("Jarrett")),
    ).not.toHaveLength(0);
  },
);

it("parses relative form actions, hidden fields, reason labels and checkbox values", () => {
  const form = parseBookingForm(
    `<form method="post" action="bookAppointment.php"><input type="hidden" name="dt" value="2026-09-29"><input type="radio" id="other" name="reason" value="9"><label for="other">Other</label><input type="checkbox" name="withParent" value="10"> Parent attending<input type="submit" name="submit" value="Submit Reason"></form>`,
    "https://ta.yrdsb.ca/live/students/bookAppointment.php?dt=2026-09-29",
  );
  expect(form.url).toBe(
    "https://ta.yrdsb.ca/live/students/bookAppointment.php",
  );
  expect(form.fields).toEqual({ dt: "2026-09-29", submit: "Submit Reason" });
  expect(form.reasons).toEqual([{ value: "9", label: "Other" }]);
  expect(form.options).toEqual([
    { name: "withParent", value: "10", label: "Parent attending" },
  ]);
});
it.skipIf(!existsSync("/Users/lenny/Downloads/bookAppointment.html"))(
  "parses the supplied real booking form",
  () => {
    const form = parseBookingForm(
      readFileSync("/Users/lenny/Downloads/bookAppointment.html", "utf8"),
      "https://ta.yrdsb.ca/live/students/bookAppointment.php",
    );
    expect(form.reasons).toHaveLength(9);
    expect(form.options.map((o) => o.value)).toEqual(["10", "100"]);
    expect(form.fields.submit).toBe("Submit Reason");
  },
);

it("resolves relative cancellation links in the students directory", () => {
  const result = parseAppointments(
    '<h1>Appointment Bookings on 2026-09-29</h1><h2>2026-09-29 10:10:00 : Counselor - <a href="bookAppointment.php?dt=2026-09-29&tm=10:10:00&id=5&action=cancel">cancel</a></h2>',
  );
  expect(new URL(result.booked[0].cancelUrl!).pathname).toBe(
    "/live/students/bookAppointment.php",
  );
});

it("extracts labels without using WebKit's crash-prone live labels collection", () => {
  const labelsGetter = vi
    .spyOn(HTMLInputElement.prototype, "labels", "get")
    .mockImplementation(() => {
      throw new Error(
        "Do not create a live LabelsNodeList on a detached document",
      );
    });
  try {
    const form = parseBookingForm(
      `<form method="post" action="bookAppointment.php">
      <input type="radio" id="reason:9" name="reason" value="9"><label for="reason:9">Other reason</label>
      <label><input type="checkbox" name="withParent" value="10">Parent attending</label>
      <input type="checkbox" name="online" value="100">Online meeting
    </form>`,
      "https://ta.yrdsb.ca/live/students/bookAppointment.php",
    );
    expect(form.reasons).toEqual([{ value: "9", label: "Other reason" }]);
    expect(form.options.map((option) => option.label)).toEqual([
      "Parent attending",
      "Online meeting",
    ]);
    expect(labelsGetter).not.toHaveBeenCalled();
  } finally {
    labelsGetter.mockRestore();
  }
});
it("extracts each booking separately when cancellation links share a heading", () => {
  const result =
    parseAppointments(`<h1>Appointment Bookings on 2026-09-28</h1><h2>
2026-09-29 10:10:00 : First Counselor - <a href="bookAppointment.php?dt=2026-09-29&tm=10:10:00&id=1&action=cancel">cancel</a><br>
2026-10-02 13:20:00 : Second Counselor - <a href="bookAppointment.php?dt=2026-10-02&tm=13:20:00&id=2&action=cancel">cancel</a></h2>`);
  expect(
    result.booked.map(({ date, time, teacher }) => ({ date, time, teacher })),
  ).toEqual([
    { date: "2026-09-29", time: "10:10:00", teacher: "First Counselor" },
    { date: "2026-10-02", time: "13:20:00", teacher: "Second Counselor" },
  ]);
});
