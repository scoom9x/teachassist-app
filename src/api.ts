import { parseSchoolCalendar } from "./schoolCalendar";
import { Capacitor, CapacitorCookies, CapacitorHttp } from "@capacitor/core";
import {
  documentFrom,
  isLoginPage,
  ORIGIN,
  parseDetail,
  parseReports,
  safeUrl,
  reportUrl,
} from "./parser";
import {
  appointmentUrl,
  parseBookingForm,
  type BookingForm,
  parseAppointments,
} from "./appointments";
export const native = Capacitor.isNativePlatform();
export class AuthError extends Error {}
export function loginUrl(username: string, password: string) {
  const url = new URL("/yrdsb/index.php", ORIGIN);
  url.search = new URLSearchParams({
    subject_id: "0",
    username,
    password,
    submit: "login",
  }).toString();
  return url.href;
}
async function request(initial: string, data?: string): Promise<string> {
  if (!native)
    throw new Error(
      "Live login is available in the iOS or Android app. Use the demo or import saved reports in this browser preview.",
    );
  let url = initial;
  for (let count = 0; count < 6; count++) {
    if (!safeUrl(url))
      throw new Error("The website redirected to an unsupported address.");
    let response;
    try {
      response = await (
        data === undefined ? CapacitorHttp.get : CapacitorHttp.post
      )({
        url,
        responseType: "text",
        disableRedirects: true,
        connectTimeout: 60000,
        readTimeout: 60000,
        headers: {
          Accept: "text/html",
          "Cache-Control": "no-store",
          ...(data === undefined
            ? {}
            : { "Content-Type": "application/x-www-form-urlencoded" }),
        },
        ...(data === undefined ? {} : { data }),
      });
    } catch {
      throw new Error(
        "Could not reach TeachAssist. Check your connection and try again.",
      );
    }
    if (response.status >= 300 && response.status < 400) {
      const location = Object.entries(response.headers).find(
        ([k]) => k.toLowerCase() === "location",
      )?.[1];
      const next = location && safeUrl(location, url);
      if (!next)
        throw new Error("The website returned an unsupported redirect.");
      url = next;
      data = undefined;
      continue;
    }
    const html = String(response.data);
    // Some TeachAssist pages are served with a 5xx status while still
    // containing the complete, usable HTML document. Parse recognizable report
    // and appointment pages before treating the status as a service failure.
    const usablePage =
      /Student Reports|Appointment Bookings|All open appointments|School Full Calendar/i.test(
        html,
      );
    if (response.status === 401 || response.status === 403)
      throw new AuthError(
        "Your login was not accepted. Please check your username and password.",
      );
    if ((response.status < 200 || response.status >= 300) && !usablePage)
      throw new Error(
        "TeachAssist is temporarily unavailable. Try again later.",
      );
    // Follow only literal same-origin redirects, never execute upstream scripts.
    const doc = documentFrom(html);
    const refresh = doc
      .querySelector('meta[http-equiv="refresh" i]')
      ?.getAttribute("content")
      ?.match(/url\s*=\s*["']?([^"']+)/i)?.[1];
    const scriptRedirect = [...doc.scripts]
      .map((s) => s.textContent ?? "")
      .map(
        (s) =>
          s
            .trim()
            .match(
              /^(?:(?:window|top|document)\.)?location(?:\.href)?\s*=\s*['"]([^'"]+)['"];?$/,
            )?.[1],
      )
      .find(Boolean);
    const redirect = refresh ?? scriptRedirect;
    if (redirect) {
      const next = safeUrl(redirect, url);
      if (!next) throw new Error("Unsupported redirect.");
      url = next;
      data = undefined;
      continue;
    }
    return html;
  }
  throw new Error("Too many login redirects. Please try again.");
}
export async function login(username: string, password: string) {
  await clearSession();
  const html = await request(loginUrl(username, password));
  if (
    isLoginPage(html) ||
    /invalid (?:user|password|login)|incorrect (?:user|password)|login failed/i.test(
      documentFrom(html).body.textContent ?? "",
    )
  )
    throw new AuthError(
      "Login failed. Check your username and password, then try again.",
    );
  try {
    return parseReports(html);
  } catch {
    throw new AuthError(
      "Login did not reach Student Reports. Check your details or try signing in on TeachAssist.",
    );
  }
}
export async function fetchCourse(url: string) {
  if (!reportUrl(url)) throw new Error("Invalid report address.");
  const html = await request(url);
  if (isLoginPage(html))
    throw new AuthError(
      "Your session expired. Sign in again to refresh your grades.",
    );
  return parseDetail(html, url);
}
export async function fetchAppointments(baseUrl: string, date: string) {
  const url = new URL(appointmentUrl(baseUrl));
  url.searchParams.set("inputDate", date);
  // This is intentionally a fresh GET for the selected day. TeachAssist
  // renders a different HTML page for every inputDate value.
  const html = await request(url.href);
  if (isLoginPage(html))
    throw new AuthError(
      "Your session expired. Sign in again to manage appointments.",
    );
  return parseAppointments(html);
}
export async function clearSession() {
  if (native) await CapacitorCookies.clearAllCookies();
}

function checkAppointmentSession(html: string) {
  if (isLoginPage(html))
    throw new AuthError(
      "Your session expired. Sign in again to manage appointments.",
    );
}
export async function loadBookingForm(url: string) {
  const html = await request(appointmentUrl(url));
  checkAppointmentSession(html);
  return parseBookingForm(html, url);
}
export async function submitBooking(
  form: BookingForm,
  reason: string,
  options: string[],
) {
  if (!form.reasons.some((r) => r.value === reason))
    throw new Error("Choose a reason for your appointment.");
  const fields: Record<string, string> = { ...form.fields, reason };
  form.options.forEach((option) => {
    if (options.includes(option.name)) fields[option.name] = option.value;
  });
  const html = await request(
    appointmentUrl(form.url),
    new URLSearchParams(fields).toString(),
  );
  checkAppointmentSession(html);
  const result = parseAppointments(html);
  if (
    !result.booked.some((a) => {
      const url = a.cancelUrl && new URL(a.cancelUrl);
      return (
        url &&
        ["dt", "tm", "id"].every(
          (key) => url.searchParams.get(key) === fields[key],
        )
      );
    })
  )
    throw new Error(
      "Booking was not confirmed. Refresh appointments before trying again.",
    );
  return result;
}
export async function cancelBooking(url: string) {
  const target = new URL(appointmentUrl(url));
  if (target.searchParams.get("action") !== "cancel")
    throw new Error("Invalid cancellation address.");
  const html = await request(target.href);
  checkAppointmentSession(html);
  const result = parseAppointments(html);
  if (
    !result.date ||
    result.booked.some(
      (a) =>
        a.cancelUrl &&
        ["dt", "tm", "id"].every(
          (key) =>
            new URL(a.cancelUrl!).searchParams.get(key) ===
            target.searchParams.get(key),
        ),
    )
  )
    throw new Error(
      "Cancellation was not confirmed. Refresh appointments before trying again.",
    );
  return result;
}

export async function fetchSchoolCalendar(address: string) {
  const safe = safeUrl(address);
  if (!safe || new URL(safe).pathname !== "/live/students/calendar_full.php")
    throw new Error("Invalid school calendar address.");
  const html = await request(safe);
  if (isLoginPage(html))
    throw new AuthError("Sign in again to load the school calendar.");
  return parseSchoolCalendar(html);
}
