export interface SchoolEvent {
  id: string;
  date: string;
  title: string;
  personal?: boolean;
  notes?: string;
}
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function parseSchoolCalendar(html: string): SchoolEvent[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const months =
    "January February March April May June July August September October November December".split(
      " ",
    );
  const events: SchoolEvent[] = [];
  let recognized = false;
  for (const heading of doc.querySelectorAll('td[colspan="7"]')) {
    const match = heading.textContent?.trim().match(/^(\w+) (\d{4})$/);
    if (!match || !months.includes(match[1])) continue;
    recognized = true;
    const table = heading.closest("table")!;
    for (const cell of table.querySelectorAll('td[valign="top"]')) {
      const day = Number(cell.textContent?.trim().match(/^\d{1,2}/)?.[0]);
      if (
        !day ||
        day >
          new Date(Number(match[2]), months.indexOf(match[1]) + 1, 0).getDate()
      )
        continue;
      const date = `${match[2]}-${String(months.indexOf(match[1]) + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cell.querySelectorAll(".box").forEach((box, index) => {
        const title = box.textContent?.trim().replace(/\s+/g, " ");
        if (title && !/^Day\s+\d+$/i.test(title))
          events.push({ id: `${date}-${index}-${title}`, date, title });
      });
    }
  }
  if (!recognized)
    throw new Error("This page does not contain a school calendar.");
  return events.sort((a, b) => a.date.localeCompare(b.date));
}
const nextDay = (date: string) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return localDate(d);
};
export function googleEventUrl(event: SchoolEvent, school: string) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${event.date.replaceAll("-", "")}/${nextDay(event.date).replaceAll("-", "")}`,
    details: event.notes || "School calendar event saved in Teach Assist.",
    location: school,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
export function calendarICS(events: SchoolEvent[], school: string) {
  const escape = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Teach Assist//School Calendar//EN",
    "CALSCALE:GREGORIAN",
    ...events.flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${encodeURIComponent(school + e.id)}@teach-assist.local`,
      `DTSTAMP:${new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "")}`,
      `DTSTART;VALUE=DATE:${e.date.replaceAll("-", "")}`,
      `DTEND;VALUE=DATE:${nextDay(e.date).replaceAll("-", "")}`,
      `SUMMARY:${escape(e.title)}`,
      `LOCATION:${escape(school)}`,
      `DESCRIPTION:${escape(e.notes || "Saved from Teach Assist")}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  // Fold at 75 UTF-8 bytes without splitting a Unicode character.
  return (
    lines
      .map((line) => {
        let out = "",
          bytes = 0;
        for (const char of line) {
          const n = new TextEncoder().encode(char).length;
          if (bytes + n > 75) {
            out += "\r\n ";
            bytes = 1;
          }
          out += char;
          bytes += n;
        }
        return out;
      })
      .join("\r\n") + "\r\n"
  );
}
