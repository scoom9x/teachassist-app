export interface AppointmentSlot {
  teacher: string;
  time: string;
  url: string;
}
export interface Appointment {
  teacher: string;
  date: string;
  time: string;
  cancelUrl?: string;
}
export function parseAppointments(html: string): {
  slots: AppointmentSlot[];
  booked: Appointment[];
  date: string;
} {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const heading =
    doc
      .querySelector("h1")
      ?.textContent?.match(/on (\d{4}-\d{2}-\d{2})/i)?.[1] ?? "";
  const slots: AppointmentSlot[] = [
    ...doc.querySelectorAll('a[href*="bookAppointment.php"]'),
  ].flatMap((a) => {
    const href = a.getAttribute("href") ?? "";
    if (!href.includes("dt=") || href.includes("action=cancel")) return [];
    const box = a.closest("div.box")?.querySelector("h3")
      ? a.closest("div.box")
      : a.parentElement?.parentElement?.closest("div.box");
    const teacher =
      box?.querySelector("h3")?.textContent?.trim() ?? "Appointment";
    return [
      {
        teacher,
        time: a.textContent?.replace("@", "").trim() ?? "",
        url: appointmentUrl(href),
      },
    ];
  });
  const booked: Appointment[] = [
    ...doc.querySelectorAll('a[href*="action=cancel"]'),
  ].map((a) => {
    // Multiple bookings can share one heading. Only read the text before
    // this cancellation link, then select its last dated entry.
    const range = doc.createRange();
    range.selectNodeContents(a.parentElement!);
    range.setEndBefore(a);
    const text = range.toString();
    const match = [
      ...text.matchAll(
        /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s*:\s*([^\n]*?)\s*-\s*(?=cancel|$)/gi,
      ),
    ].at(-1);
    return {
      date: match?.[1] ?? heading,
      time: match?.[2] ?? "",
      teacher: match?.[3]?.trim() ?? "Appointment",
      cancelUrl: appointmentUrl(a.getAttribute("href") ?? ""),
    };
  });
  return { slots, booked, date: heading };
}

export interface BookingForm {
  url: string;
  fields: Record<string, string>;
  reasons: { value: string; label: string }[];
  options: { name: string; value: string; label: string }[];
}
export function appointmentUrl(
  value: string,
  base = "https://ta.yrdsb.ca/live/students/bookAppointment.php",
) {
  const url = new URL(value, base);
  if (
    url.origin !== "https://ta.yrdsb.ca" ||
    url.pathname !== "/live/students/bookAppointment.php" ||
    url.username ||
    url.password
  )
    throw new Error("Invalid appointment address.");
  return url.href;
}
export function parseBookingForm(html: string, base: string): BookingForm {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const form = [...doc.forms].find((f) =>
    f.querySelector('input[name="reason"]'),
  );
  if (!form || form.method.toLowerCase() !== "post")
    throw new Error(
      "This time is no longer available. Choose another appointment.",
    );
  const fields: Record<string, string> = {};
  form
    .querySelectorAll<HTMLInputElement>(
      'input[type="hidden"], input[type="submit"]',
    )
    .forEach((input) => {
      if (input.name) fields[input.name] = input.value;
    });
  // Avoid input.labels on detached parsed documents: WebKit can crash during
  // LabelsNodeList destruction when these documents are garbage-collected.
  const labels = [...form.querySelectorAll("label")];
  const labelText = (input: HTMLInputElement) =>
    (
      labels.find(
        (label) => input.id && label.getAttribute("for") === input.id,
      ) ?? input.closest("label")
    )?.textContent?.trim();
  const reasons = [
    ...form.querySelectorAll<HTMLInputElement>('input[name="reason"]'),
  ].map((input) => ({
    value: input.value,
    label: labelText(input) || input.value,
  }));
  const options = [
    ...form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  ].map((input) => ({
    name: input.name,
    value: input.value,
    label:
      labelText(input) || input.nextSibling?.textContent?.trim() || input.name,
  }));
  return {
    url: appointmentUrl(form.getAttribute("action") || base, base),
    fields,
    reasons,
    options,
  };
}
