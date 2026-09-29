// @vitest-environment jsdom
import { vi, it, expect, beforeEach } from "vitest";
const { get, post, clear } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  clear: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
  CapacitorHttp: { get, post },
  CapacitorCookies: { clearAllCookies: clear },
}));
import { login, loginUrl, fetchCourse, AuthError } from "../src/api";
beforeEach(() => {
  get.mockReset();
  post.mockReset();
});
it("encodes reserved credential characters without changing them", () => {
  const u = new URL(loginUrl("a&b", "p?#= +"));
  expect(u.searchParams.get("username")).toBe("a&b");
  expect(u.searchParams.get("password")).toBe("p?#= +");
  expect(u.searchParams.get("submit")).toBe("login");
});
it("detects the returned login form", async () => {
  get.mockResolvedValue({
    status: 200,
    data: '<input name="username"><input name="password">',
    headers: {},
  });
  await expect(login("test", "invalid")).rejects.toBeInstanceOf(AuthError);
});
it("rejects redirects to another origin before requesting it", async () => {
  get.mockResolvedValue({
    status: 302,
    headers: { Location: "https://evil.test/" },
  });
  await expect(login("test", "invalid")).rejects.toThrow(
    "unsupported redirect",
  );
  expect(get).toHaveBeenCalledTimes(1);
});
it("follows same-site redirects and recognizes reports", async () => {
  get
    .mockResolvedValueOnce({
      status: 302,
      headers: { Location: "/live/students/listReports.php?student_id=2" },
    })
    .mockResolvedValueOnce({
      status: 200,
      headers: {},
      data: "<h1>Student Reports for test</h1><table><tr><th>Course Name</th></tr></table>",
    });
  await expect(login("test", "test")).resolves.toMatchObject({
    student: "test",
    courses: [],
  });
  expect(clear).toHaveBeenCalled();
});
it("detects session expiry on a course request", async () => {
  get.mockResolvedValue({
    status: 200,
    headers: {},
    data: '<input name="username"><input name="password">',
  });
  await expect(
    fetchCourse(
      "https://ta.yrdsb.ca/live/students/viewReport.php?subject_id=1",
    ),
  ).rejects.toBeInstanceOf(AuthError);
});
it("does not leak request URLs or credentials in network errors", async () => {
  get.mockRejectedValue(new Error("url with password"));
  await expect(login("test", "secret")).rejects.toThrow(
    "Check your connection",
  );
});
it("fetches OE reports and associates a headingless report with the requested subject", async () => {
  get.mockResolvedValue({
    status: 200,
    headers: {},
    data: "<table><tr><th>By Overall Expectation</th><th>Progress</th><th>Mark</th></tr></table>",
  });
  await expect(
    fetchCourse(
      "https://ta.yrdsb.ca/live/students/viewReportOE.php?subject_id=42",
    ),
  ).resolves.toMatchObject({ subjectId: "42", format: "expectations" });
});
it.each([
  "https://evil.test/live/students/viewReportOE.php",
  "https://ta.yrdsb.ca/live/students/viewReportOE.php/extra",
])("rejects unsupported report address %s", async (url) => {
  await expect(fetchCourse(url)).rejects.toThrow("Invalid report address");
  expect(get).not.toHaveBeenCalled();
});

const slotUrl =
  "https://ta.yrdsb.ca/live/students/bookAppointment.php?dt=2026-09-29&tm=10:10:00&id=5073&school_id=7";
const bookingForm = {
  url: slotUrl,
  fields: {
    dt: "2026-09-29",
    tm: "10:10:00",
    id: "5073",
    school_id: "7",
    submit: "Submit Reason",
  },
  reasons: [{ value: "9", label: "Other" }],
  options: [{ name: "online", value: "100", label: "Online" }],
};
import { loadBookingForm, submitBooking, cancelBooking } from "../src/api";
it("submits the reason and checked options using the native session and verifies the booked slot", async () => {
  post.mockResolvedValue({
    status: 200,
    headers: {},
    data: `<h1>Appointment Bookings on 2026-09-29</h1><h2>2026-09-29 10:10:00 : Counselor - <a href="${slotUrl}&action=cancel">cancel</a></h2>`,
  });
  await expect(
    submitBooking(bookingForm, "9", ["online"]),
  ).resolves.toMatchObject({ booked: [{ time: "10:10:00" }] });
  const fields = new URLSearchParams(post.mock.calls[0][0].data);
  expect(fields.get("reason")).toBe("9");
  expect(fields.get("online")).toBe("100");
  expect(fields.get("withParent")).toBeNull();
  expect(fields.get("submit")).toBe("Submit Reason");
});
it("does not report an unconfirmed booking as successful", async () => {
  post.mockResolvedValue({
    status: 200,
    headers: {},
    data: "<h1>Appointment Bookings on 2026-09-29</h1>Slot unavailable",
  });
  await expect(submitBooking(bookingForm, "9", [])).rejects.toThrow(
    "not confirmed",
  );
});
it("detects expired sessions when opening the reason form", async () => {
  get.mockResolvedValue({
    status: 200,
    headers: {},
    data: '<input name="username"><input name="password">',
  });
  await expect(loadBookingForm(slotUrl)).rejects.toBeInstanceOf(AuthError);
});
it("verifies cancellation and rejects unexpected responses", async () => {
  get.mockResolvedValueOnce({
    status: 200,
    headers: {},
    data: "<h1>Appointment Bookings on 2026-09-29</h1>",
  });
  await expect(
    cancelBooking(slotUrl + "&action=cancel"),
  ).resolves.toMatchObject({ booked: [] });
  get.mockResolvedValueOnce({
    status: 200,
    headers: {},
    data: "Something went wrong",
  });
  await expect(cancelBooking(slotUrl + "&action=cancel")).rejects.toThrow(
    "not confirmed",
  );
});
it("rejects invalid reasons before sending a booking", async () => {
  await expect(submitBooking(bookingForm, "42", [])).rejects.toThrow(
    "Choose a reason",
  );
  expect(post).not.toHaveBeenCalled();
});

import { parseReports } from "../src/parser";
import { fetchAppointments } from "../src/api";
it.each([
  "bookAppointment.php",
  "./bookAppointment.php",
  "/live/students/bookAppointment.php",
  "https://ta.yrdsb.ca/live/students/bookAppointment.php",
])("loads a selected date from report form action %s", async (action) => {
  const reports = parseReports(
    `<h1>Student Reports for test</h1><table><tr><th>Course Name</th></tr></table><form action="${action}?school_id=7"><input name="student_id" value="42"><input name="inputDate" value="2026-09-28"></form>`,
  );
  get.mockResolvedValue({
    status: 200,
    headers: {},
    data: '<h1>Appointment Bookings on 2026-09-29</h1><div class="box"><h3>Counselor</h3><a href="bookAppointment.php?dt=2026-09-29&tm=10:10:00&id=5&school_id=7">@ 10:10:00</a></div>',
  });
  const result = await fetchAppointments(reports.appointmentUrl!, "2026-09-29");
  const requested = new URL(get.mock.calls[0][0].url);
  expect(requested.pathname).toBe("/live/students/bookAppointment.php");
  expect(Object.fromEntries(requested.searchParams)).toEqual({
    school_id: "7",
    student_id: "42",
    inputDate: "2026-09-29",
  });
  expect(result.slots[0].url).toBe(
    "https://ta.yrdsb.ca/live/students/bookAppointment.php?dt=2026-09-29&tm=10:10:00&id=5&school_id=7",
  );
});
it("does not accept an off-site appointment form", () => {
  const reports = parseReports(
    '<h1>Student Reports for test</h1><table><tr><th>Course Name</th></tr></table><form action="https://evil.test/bookAppointment.php"></form>',
  );
  expect(reports.appointmentUrl).toBeUndefined();
});
