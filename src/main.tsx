import { applyCustomTheme, readCustomTheme } from "./customTheme";
import { Customization } from "./Customization";
import { ExtensionSlot } from "./extensions";
import "./plugins";
import { Trends } from "./TrendsPage";
import {
  PreferenceHelp,
  PreferenceSwitch,
  RefreshInterval,
} from "./PreferenceControls";
import { GradeUpdates, publishGrades } from "./nativeUpdates";
import { GradeOverview } from "./GradeOverview";
import { SchoolCalendar } from "./SchoolCalendarPanel";
import { SubjectIcon } from "./SubjectIcon";
import { PrivacyValue } from "./PrivacyValue";
import { Modal } from "./Modal";
import { SemesterGroup } from "./SemesterGroup";
import { ExperimentToggle } from "./ExperimentToggle";
import { Appointments } from "./AppointmentPanel";
import type { Appointment, AppointmentSlot } from "./appointments";
import { WhatIf } from "./WhatIf";
import { usePreferences } from "./usePreferences";
import { CourseCategories } from "./CourseCategories";
import { SchoolWeather } from "./SchoolWeather";
import { syncCourseReports, withCourseDetail } from "./sync";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
  MoreHorizontal,
  X,
  Settings,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
  CalendarDays,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  WifiOff,
} from "lucide-react";
import {
  AuthError,
  clearSession,
  fetchAppointments,
  fetchCourse,
  login,
  native,
} from "./api";
import {
  courseSemester,
  courseMark,
  parseDetail,
  parseReports,
  type Course,
} from "./parser";
import {
  deleteSnapshot,
  forgetCredentials,
  readCredentials,
  readSnapshot,
  saveCredentials,
  saveSnapshot,
  snapshotFor,
  type Snapshot,
} from "./storage";
import { demoSnapshot } from "./demo";
import "./style.css";
import "./bauhaus.css";
import "./theme.css";
applyCustomTheme(readCustomTheme());
const date = (v: string) =>
  new Date(v).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
const mark = (v: number | null) => (v === null ? "—" : `${v.toFixed(1)}%`);
function App() {
  const {
    theme,
    haptics,
    blurMarks,
    pollMinutes,
    notifications,
    updatePreferences,
    saveError,
  } = usePreferences();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [page, setPage] = useState<
      | "login"
      | "dashboard"
      | "grades"
      | "course"
      | "settings"
      | "trends"
      | "history"
      | "appointments"
    >("login");
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [ready, setReady] = useState(false),
    [demo, setDemo] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [query, setQuery] = useState("");
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");
  useEffect(() => {
    if (page === "appointments" && !appointmentDate) {
      const today = new Date();
      setAppointmentDate(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
      );
    }
  }, [page, appointmentDate]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [liveAppointmentSlots, setLiveAppointmentSlots] = useState<
    AppointmentSlot[]
  >([]);
  useEffect(() => {
    if (
      page !== "appointments" ||
      !ready ||
      busy ||
      !appointmentDate ||
      demo ||
      !snapshot?.reports.appointmentUrl
    )
      return;
    let active = true;
    setAppointmentsLoading(true);
    (async () => {
      try {
        // TeachAssist protects appointment pages with the login session. Re-authenticate
        // before every date lookup so a stale report session cannot produce a false
        // “no appointments” result.
        const saved =
          username && password
            ? { username, password }
            : await readCredentials();
        if (!saved) throw new Error("Sign in again to load appointments.");
        const reports = await login(saved.username, saved.password);
        if (!reports.appointmentUrl)
          throw new Error("Your account did not provide an appointment page.");
        const result = await fetchAppointments(
          reports.appointmentUrl,
          appointmentDate,
        );
        if (active) {
          setLiveAppointmentSlots(result.slots);
          setAppointments(result.booked);
        }
      } catch (error) {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : "Could not load appointments.",
          );
      } finally {
        if (active) setAppointmentsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    page,
    appointmentDate,
    demo,
    snapshot?.reports.appointmentUrl,
    ready,
    busy,
  ]);
  const demoAppointmentSlots: AppointmentSlot[] =
    demo && appointmentDate
      ? [
          { teacher: "Guidance A-Go", time: "12:00", url: "" },
          { teacher: "Guidance (Gr - Lu)", time: "13:20", url: "" },
          { teacher: "Guidance (Si-Z)", time: "14:10", url: "" },
        ]
      : [];
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);
  const [loginState, setLoginState] = useState<"idle" | "pending" | "failed">(
    "idle",
  );
  const [trendsCourse, setTrendsCourse] = useState<string | null>(null);
  const [trendsReturn, setTrendsReturn] = useState<
    "dashboard" | "grades" | "course"
  >("dashboard");
  function openTrends(courseId: string | null = null) {
    setTrendsCourse(courseId);
    setTrendsReturn(
      page === "course" ? "course" : page === "grades" ? "grades" : "dashboard",
    );
    setPage("trends");
  }
  const [actionsOpen, setActionsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!actionsOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node))
        setActionsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActionsOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [actionsOpen]);
  const [dashboardRefresh, setDashboardRefresh] = useState(0);
  const [historyFilter, setHistoryFilter] = useState<{
    course: string;
    assignment?: string;
  } | null>(null);
  const events = snapshot?.changes ?? [];
  const eventKey = (event: (typeof events)[number]) => JSON.stringify(event);
  const unread = events.filter(
    (event) => !snapshot?.readNotifications?.includes(eventKey(event)),
  );
  function markRead(keys: string[]) {
    if (snapshot)
      void persist({
        ...snapshot,
        readNotifications: [
          ...new Set([...(snapshot.readNotifications ?? []), ...keys]),
        ],
      });
  }
  const [infoOpen, setInfoOpen] = useState(false);
  const [semesterFilter, setSemesterFilter] = useState<"all" | 1 | 2 | null>(
    "all",
  );
  const [hypotheticalCourses, setHypotheticalCourses] = useState<
    Course[] | null
  >(null);
  const [hypotheticalMarks, setHypotheticalMarks] = useState<
    Record<string, string>
  >({});
  useEffect(() => {
    if (page !== "grades") setHypotheticalCourses(null);
  }, [page]);
  const refreshLock = useRef(false);
  const lastRefreshAttempt = useRef(0);
  const accountEpoch = useRef(0);
  const startupRefresh = useRef(false);
  const refreshRef = useRef<(automatic?: boolean) => Promise<void>>(
    async () => {},
  );
  useEffect(() => {
    if (ready && startupRefresh.current) {
      startupRefresh.current = false;
      void refreshRef.current(true);
    }
  }, [ready]);
  useEffect(() => {
    if (!ready || demo || page === "login" || !snapshot?.username) return;
    try {
      localStorage.setItem(
        `teach-assist.last-page:${snapshot.username}`,
        JSON.stringify({ page, selected }),
      );
    } catch {}
  }, [page, selected, ready, demo, snapshot?.username]);
  useEffect(() => {
    if (!ready || demo || !snapshot || page === "login") return;
    const check = () => {
      if (
        document.visibilityState === "visible" &&
        !refreshLock.current &&
        Date.now() - lastRefreshAttempt.current > 2000 &&
        !busy &&
        page !== "appointments"
      )
        void refreshRef.current(true);
    };
    const timer =
      pollMinutes >= 5
        ? window.setInterval(check, pollMinutes * 60000)
        : undefined;
    document.addEventListener("visibilitychange", check);
    window.addEventListener("teachassist-resume", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("teachassist-resume", check);
    };
  }, [ready, demo, !!snapshot, page, busy, pollMinutes]);
  useEffect(() => {
    if (!ready || demo || !native || !snapshot) return;
    let active = true;
    void readCredentials()
      .then(async (saved) => {
        if (!active) return;
        await GradeUpdates.configure({
          minutes: saved ? pollMinutes : 0,
          notifications,
          hidden: blurMarks,
          ...(saved || {}),
        });
      })
      .catch(() =>
        setNotice(
          "Background updates could not be configured. Foreground refresh is still available.",
        ),
      );
    return () => {
      active = false;
    };
  }, [
    ready,
    demo,
    pollMinutes,
    notifications,
    blurMarks,
    remember,
    snapshot?.username,
  ]);
  const importer = useRef<HTMLInputElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (window.innerWidth <= 760) setSidebarOpen(false);
  }, [page, selected]);
  useEffect(() => {
    (async () => {
      try {
        const cached = await readSnapshot();
        setSnapshot(cached);
        const saved = await readCredentials();
        if (saved) {
          setUsername(saved.username);
          setPassword(saved.password);
          setRemember(true);
          if (cached && cached.username === saved.username) {
            try {
              const last = JSON.parse(
                localStorage.getItem(
                  `teach-assist.last-page:${saved.username}`,
                ) || "null",
              );
              setPage(
                last &&
                  [
                    "dashboard",
                    "grades",
                    "course",
                    "settings",
                    "history",
                    "appointments",
                  ].includes(last.page)
                  ? last.page
                  : "dashboard",
              );
              if (
                last?.selected &&
                cached.reports.courses.some((c) => c.id === last.selected)
              )
                setSelected(last.selected);
            } catch {
              setPage("dashboard");
            }
          } else {
            setPage("dashboard");
          }
          startupRefresh.current = true;
        }
      } catch {
        setError("Saved information could not be read. You can still sign in.");
      } finally {
        setReady(true);
      }
    })();
  }, []);
  async function persist(next: Snapshot) {
    setSnapshot(next);
    if (!demo) {
      try {
        await saveSnapshot(next);
      } catch {
        setNotice("Grades are visible, but could not be saved on this device.");
      }
    }
  }
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    accountEpoch.current++;
    setLoginState("pending");
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const reports = await login(username.trim(), password);
      // Complete credential changes before opening a new account; never retain a previous account password.
      await forgetCredentials();
      let warning = "";
      if (remember) {
        try {
          await saveCredentials(username.trim(), password);
        } catch {
          warning = "Signed in, but your login could not be saved securely.";
        }
      }
      const result = await syncCourseReports(
        snapshotFor(reports, demo ? null : snapshot),
        setNotice,
      );
      const next = { ...result.snapshot, username: username.trim() };
      warning = [warning, result.warning].filter(Boolean).join(" ");
      setDemo(false);
      setSnapshot(next);
      setPage("dashboard");
      setLoginState("idle");
      setPassword("");
      setNotice(warning);
      try {
        await publishGrades(next);
      } catch {
        setNotice("Signed in; widget data could not be updated.");
      }
      try {
        await saveSnapshot(next);
      } catch {
        setNotice("Signed in, but grades could not be saved on this device.");
      }
    } catch (e) {
      setLoginState("failed");
      setError(e instanceof Error ? e.message : "Could not sign in.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }
  async function openCourse(course: Course) {
    if (!snapshot) return;
    setSelected(course.id);
    setQuery("");
    setPage("course");
    setError("");
    if (!course.url || demo || (!native && snapshot.details[course.id])) return;
    setBusy(true);
    try {
      const detail = await fetchCourse(course.url);
      const next = withCourseDetail(snapshot, course, detail);
      await persist(next);
      try {
        await publishGrades(next);
      } catch {
        setNotice("Report updated; widgets could not be updated.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load course.");
      if (e instanceof AuthError)
        setNotice(
          "Your saved grades are still available. Sign in again to update them.",
        );
    } finally {
      setBusy(false);
    }
  }
  async function refresh(automatic = false, all = false) {
    if (refreshLock.current) return;
    if (demo) {
      setNotice("This is sample data. Sign in to load your own grades.");
      return;
    }
    if (all) setDashboardRefresh((value) => value + 1);
    refreshLock.current = true;
    lastRefreshAttempt.current = Date.now();
    const epoch = accountEpoch.current;
    setBusy(true);
    if (!automatic) setError("");
    try {
      const saved = await readCredentials();
      if (!saved) {
        if (!automatic) {
          setPage("login");
          setNotice("Sign in to refresh your saved grades.");
        }
        return;
      }
      const reports = await login(saved.username, saved.password);
      const result = await syncCourseReports(
        snapshotFor(reports, snapshot),
        setNotice,
      );
      if (epoch !== accountEpoch.current) return;
      const next = { ...result.snapshot, username: saved.username };
      await persist(next);
      try {
        await publishGrades(next, notifications);
      } catch {
        setNotice("Grades refreshed; widgets could not be updated.");
      }
      setNotice(
        result.warning ||
          "Course marks, assignments, and grade breakdowns updated.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh.");
      if (e instanceof AuthError)
        setNotice(
          "Saved grades are available. Sign in again to resume updates.",
        );
    } finally {
      refreshLock.current = false;
      setBusy(false);
    }
  }
  refreshRef.current = refresh;
  async function signOut() {
    accountEpoch.current++;
    setBusy(true);
    setError("");
    try {
      if (native) await GradeUpdates.clear();
      await forgetCredentials();
      await clearSession();
      await deleteSnapshot();
      setSnapshot(null);
      setPassword("");
      setUsername("");
      setRemember(false);
      setDemo(false);
      setPage("login");
      setNotice("Signed out. Saved login and grades removed from this device.");
    } catch {
      setError(
        "Could not fully remove saved information. Please try signing out again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function importReports(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setBusy(true);
    try {
      let next = demo ? null : snapshot;
      const details = [];
      for (const file of [...files]) {
        const html = await file.text();
        try {
          next = snapshotFor(parseReports(html), next);
        } catch {
          details.push(parseDetail(html));
        }
      }
      if (!next)
        throw new Error(
          "Include the Student Reports.html course listing first.",
        );
      for (const detail of details) {
        const course = next.reports.courses.find((c) =>
          detail.code
            ? c.code === detail.code
            : !!detail.subjectId && c.id === detail.subjectId,
        );
        if (course) {
          next = withCourseDetail(next, course, detail);
        }
      }
      await saveSnapshot(next);
      try {
        await publishGrades(next);
      } catch {
        setNotice("Reports imported; widgets could not be updated.");
      }
      setDemo(false);
      setSnapshot(next);
      setPage("dashboard");
      setNotice(
        "Imported saved reports. Marks reflect the saved files, not a live sync.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import reports.");
    } finally {
      setBusy(false);
      if (importer.current) importer.current.value = "";
    }
  }
  const course = snapshot?.reports.courses.find((c) => c.id === selected),
    detail = selected ? snapshot?.details[selected] : null;
  const displayedCourses =
    hypotheticalCourses ?? snapshot?.reports.courses ?? [];
  const visibleCourses = displayedCourses.filter(
    (c) =>
      !c.code.startsWith("LUNCH") &&
      (semesterFilter === "all" || courseSemester(c.dates) === semesterFilter),
  );
  const displayedMark = (c: Course) =>
    hypotheticalCourses !== null
      ? hypotheticalMarks[c.id]?.trim()
        ? Number(hypotheticalMarks[c.id])
        : null
      : courseMark(c);
  const graded = visibleCourses.filter((c) => displayedMark(c) !== null);
  const invalidMarks = graded.some(
    (c) =>
      !Number.isFinite(displayedMark(c)) ||
      displayedMark(c)! < 0 ||
      displayedMark(c)! > 100,
  );
  const average =
    graded.length && !invalidMarks
      ? graded.reduce((n, c) => n + displayedMark(c)!, 0) / graded.length
      : null;
  function toggleHypothetical(enabled: boolean) {
    setHypotheticalCourses(
      enabled ? (snapshot?.reports.courses ?? []).map((c) => ({ ...c })) : null,
    );
    setHypotheticalMarks(
      enabled
        ? Object.fromEntries(
            (snapshot?.reports.courses ?? []).map((c) => [
              c.id,
              courseMark(c)?.toString() ?? "",
            ]),
          )
        : {},
    );
  }
  function addHypotheticalCourse() {
    const id = `hypothetical-${crypto.randomUUID()}`;
    setHypotheticalCourses((previous) => [
      ...(previous ?? []),
      {
        id,
        name: "New course",
        code: "NEW",
        dates:
          semesterFilter === 2
            ? "2027-02-01"
            : semesterFilter === null
              ? ""
              : "2026-09-01",
        block: "",
        room: "",
        mark: null,
        midterm: null,
        url: null,
        status: "Hypothetical course",
      },
    ]);
    setHypotheticalMarks((previous) => ({ ...previous, [id]: "" }));
  }
  const messages = (
    <>
      {error && (
        <div className="message error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="message" role="status">
          <span>{notice}</span>
          <button
            className="dismiss-message"
            aria-label="Dismiss notice"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
  const upload = (
    <input
      ref={importer}
      type="file"
      accept=".html,.htm"
      multiple
      hidden
      onChange={(e) => void importReports(e.target.files)}
    />
  );
  if (!ready)
    return (
      <main className="startup-loading" role="status">
        <img className="brand-logo" src="/brand/logo.png" alt="Teach Assist" />
        Opening your saved workspace…
      </main>
    );
  if (page === "login")
    return (
      <div
        className="login-shell"
        data-app="teach-assist"
        data-ui-version="1"
        data-page="login"
      >
        {upload}
        <section className="login-story">
          <a className="brand" href="#">
            <img
              className="brand-logo"
              src="/brand/logo.png"
              alt="Teach Assist logo"
            />
            teach<span className="brand-light">assist</span>
            <span className="badge">UNOFFICIAL</span>
          </a>
          <div className="story-content">
            <span className="eyebrow">
              <span className="tiny-dot" /> A LITTLE CLARITY GOES A LONG WAY
            </span>
            <h1>
              Your learning.
              <br />A clearer picture.
            </h1>
            <p>
              All your courses, marks, and progress.
              <br />
              One calm place to make sense of it.
            </p>
            <div className="illustration">
              <div className="float-label">
                <Sparkles size={16} /> Room to grow.
              </div>
              <div className="sample-card">
                <div className="sample-head">
                  <span className="subject-icon">
                    <BookOpen />
                  </span>
                  <span>
                    YOUR PROGRESS<small>One step at a time</small>
                  </span>
                  <span className="sample-check">
                    <Check size={18} />
                  </span>
                </div>
                <div className="bars">
                  {[35, 52, 45, 67, 59, 79, 91].map((h, i) => (
                    <div key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="sample-foot">
                  <span>Keep showing up.</span>
                  <ArrowUpRight size={24} aria-hidden="true" />
                </div>
              </div>
              <span className="local-label">
                <ShieldCheck size={16} /> Your information stays on your device.
              </span>
            </div>
          </div>
          <small className="story-footer">Made for your next chapter.</small>
        </section>
        <section className="login-panel">
          <div className="login-card">
            <span className="eyebrow">WELCOME BACK</span>
            <h2>Let’s check in.</h2>
            <p className="muted">
              Sign in with your YRDSB TeachAssist account.
            </p>
            {messages}
            <form onSubmit={signIn}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your student username"
                required
                disabled={busy}
              />
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                enterKeyHint="go"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={busy}
              />
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={remember}
                  disabled={!native || busy}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>
                  Save my login securely
                  <small>
                    {native
                      ? "Stored in your device’s secure storage."
                      : "Available in the iOS and Android app."}
                  </small>
                </span>
              </label>
              <button
                className={`primary full login-submit login-${loginState}`}
                disabled={busy || !ready}
                type="submit"
              >
                {busy ? "Signing in…" : "Sign in"}
                <ArrowRight size={18} />
              </button>
            </form>
            <div className="privacy">
              <LockKeyhole size={16} />
              <span>
                Your login goes directly to TeachAssist.
                <br />
                We don’t run a server that stores your password.
              </span>
            </div>
            <div className="divider">OR TAKE A LOOK AROUND</div>
            <button
              className="secondary full"
              disabled={busy}
              onClick={() => {
                setSnapshot(demoSnapshot());
                setDemo(true);
                setPage("dashboard");
                setError("");
                setNotice("");
              }}
            >
              Explore the demo <ArrowRight size={17} />
            </button>
            <div className="login-links">
              <button disabled={busy} onClick={() => importer.current?.click()}>
                Import saved reports
              </button>
              {snapshot && !demo && (
                <button
                  disabled={busy}
                  onClick={() => {
                    setPage("dashboard");
                    setError("");
                    setNotice("Viewing saved grades. Sign in to refresh.");
                  }}
                >
                  View offline grades
                </button>
              )}
            </div>
            <p className="disclaimer">
              An independent companion. Not affiliated with YRDSB or the
              TeachAssist Foundation.
            </p>
          </div>
        </section>
      </div>
    );
  return (
    <div
      data-app="teach-assist"
      data-ui-version="1"
      data-page={page}
      className={`app-shell ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
    >
      {upload}
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className="sidebar"
        data-part="sidebar"
        id="primary-sidebar"
        inert={!sidebarOpen}
      >
        <button
          className="sidebar-toggle"
          aria-label="Collapse sidebar"
          onClick={() => setSidebarOpen(false)}
        >
          <PanelLeftClose size={21} /> Collapse
        </button>
        <div className="brand">
          <img
            className="brand-logo"
            src="/brand/logo.png"
            alt="Teach Assist logo"
          />
          teach<span className="brand-light">assist</span>
        </div>
        <span className="nav-label">NAVIGATION</span>
        <button
          disabled={busy}
          className={page === "dashboard" ? "nav active" : "nav"}
          onClick={() => {
            setPage("dashboard");
            setError("");
          }}
        >
          <LayoutDashboard size={19} /> Dashboard
        </button>
        <button
          disabled={busy}
          className={page === "grades" ? "nav active" : "nav"}
          onClick={() => {
            setSemesterFilter("all");
            setPage("grades");
          }}
        >
          <BookOpen size={19} /> Grades
        </button>
        <button
          disabled={busy}
          className={page === "history" ? "nav active" : "nav"}
          onClick={() => {
            setHistoryFilter(null);
            setPage("history");
          }}
        >
          <History size={19} /> History
        </button>
        <button
          disabled={busy}
          className={page === "appointments" ? "nav active" : "nav"}
          onClick={() => {
            setError("");
            setNotice("");
            setPage("appointments");
          }}
        >
          <CalendarDays size={19} /> Appointments
        </button>
        <div className="nav-label courses-label">YOUR COURSES</div>
        {([1, 2, null] as const).map((semester) => {
          const courses =
            snapshot?.reports.courses.filter(
              (c) =>
                !c.code.startsWith("LUNCH") &&
                courseSemester(c.dates) === semester,
            ) ?? [];
          if (!courses.length) return null;
          return (
            <SemesterGroup
              key={semester ?? "unknown"}
              title={semester ? `Semester ${semester}` : "Semester unavailable"}
              count={courses.length}
              onSelect={() => {
                setSemesterFilter(semester);
                setPage("grades");
                if (window.innerWidth <= 760) setSidebarOpen(false);
              }}
            >
              {courses.map((c, i) => (
                <button
                  disabled={busy}
                  key={c.id}
                  className={`nav ${page === "course" && selected === c.id ? "active" : ""}`}
                  onClick={() => void openCourse(c)}
                >
                  <SubjectIcon code={c.code} size={17} />
                  {c.code}
                  <span className="nav-mark">
                    <PrivacyValue
                      enabled={blurMarks}
                      value={mark(courseMark(c))}
                    />
                  </span>
                </button>
              ))}
            </SemesterGroup>
          );
        })}
        <div className="sidebar-bottom">
          <button
            disabled={busy}
            className={page === "settings" ? "nav active" : "nav"}
            onClick={() => {
              setPage("settings");
              setError("");
            }}
          >
            <Settings size={18} /> Settings
          </button>
          <div className="device-note">
            <ShieldCheck size={20} />
            <div>
              Just on this device<small>Your grades, kept close.</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar" data-part="topbar">
          <button
            className="sidebar-toggle"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={sidebarOpen}
            aria-controls="primary-sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
          </button>
          <span>
            <span className="topbar-brand">Teach Assist / </span>
            {page === "trends"
              ? "Trends"
              : page === "course"
                ? course?.code
                : page === "settings"
                  ? "Settings"
                  : page === "history"
                    ? "History"
                    : page === "appointments"
                      ? "Appointments"
                      : page === "grades"
                        ? "Grades"
                        : "Dashboard"}
          </span>
          {demo && <span className="demo-badge">Demo</span>}
          <div className="topbar-actions">
            <span className="topbar-updated">
              Last updated {snapshot ? date(snapshot.updated) : "—"}
            </span>
            <button
              className="secondary"
              aria-label={`Notifications${unread.length ? ` (${unread.length} unread)` : ""}`}
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell size={18} />
              {unread.length > 0 && (
                <span className="notification-count">{unread.length}</span>
              )}
            </button>
            <div className="actions-anchor" ref={actionsRef}>
              <button
                className="secondary"
                aria-expanded={actionsOpen}
                onClick={() => setActionsOpen(!actionsOpen)}
              >
                <MoreHorizontal size={18} /> Actions
              </button>
              {actionsOpen && (
                <div className="actions-popover">
                  <small>
                    Last updated {snapshot ? date(snapshot.updated) : "—"}
                  </small>
                  <button
                    className="secondary"
                    disabled={busy || hypotheticalCourses !== null}
                    onClick={() => {
                      setActionsOpen(false);
                      void refresh(false, page === "dashboard");
                    }}
                  >
                    <RefreshCw size={16} className={busy ? "spinning" : ""} />
                    {busy
                      ? "Refreshing…"
                      : page === "dashboard"
                        ? "Refresh all"
                        : "Refresh grades"}
                  </button>
                  {page === "grades" && (
                    <ExperimentToggle
                      enabled={hypotheticalCourses !== null}
                      onChange={toggleHypothetical}
                      label="Hypothetical mode"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
        {notificationsOpen && (
          <Modal
            title="Notifications"
            label="YOUR UPDATES"
            closeLabel="Close notifications"
            onClose={() => setNotificationsOpen(false)}
          >
            <button
              className="secondary"
              disabled={!unread.length}
              onClick={() => markRead(events.map(eventKey))}
            >
              Mark all as read
            </button>
            {!events.length && (
              <p className="muted">
                No updates yet. New assignments and grade changes will appear
                after refreshing.
              </p>
            )}
            <div className="notification-list">
              {[...events].reverse().map((event, i) => {
                const read = snapshot?.readNotifications?.includes(
                  eventKey(event),
                );
                return (
                  <article
                    className={`notification-item ${read ? "read" : "unread"}`}
                    key={i}
                  >
                    <button
                      onClick={() => {
                        markRead([eventKey(event)]);
                        setHistoryFilter({
                          course: event.course,
                          assignment:
                            event.assignment ??
                            (event.label.includes(" · ")
                              ? event.label.slice(
                                  0,
                                  event.label.lastIndexOf(" · "),
                                )
                              : undefined),
                        });
                        setPage("history");
                        setNotificationsOpen(false);
                      }}
                    >
                      <strong>
                        {event.label.endsWith(" · Added")
                          ? "New assignment added"
                          : "Grades updated"}{" "}
                        · {event.course}
                      </strong>
                      <span>{event.label}</span>
                      <small>{date(event.date)}</small>
                    </button>
                    <button
                      className="secondary"
                      disabled={read}
                      onClick={() => markRead([eventKey(event)])}
                    >
                      {read ? "Read" : "Mark as read"}
                    </button>
                  </article>
                );
              })}
            </div>
          </Modal>
        )}
        <main
          data-part="content"
          key={`${page}-${selected ?? ""}`}
          className="page-enter"
        >
          {messages}
          {page === "dashboard" && (
            <>
              <div className="dashboard-grid">
                <SchoolWeather
                  key={snapshot?.reports.school}
                  schoolName={snapshot?.reports.school ?? ""}
                  refreshToken={dashboardRefresh}
                />
                <button
                  className="dashboard-tile grades-tile"
                  onClick={() => {
                    setSemesterFilter("all");
                    setPage("grades");
                  }}
                >
                  <span className="tile-top">
                    <span className="eyebrow">02 / LEARNING</span>
                    <ArrowRight size={30} />
                  </span>
                  <h2>
                    Grades &<br />
                    assignments.
                  </h2>
                  <div className="grades-glance">
                    <strong>
                      {snapshot?.reports.courses.filter(
                        (c) => !c.code.startsWith("LUNCH"),
                      ).length ?? 0}
                    </strong>
                    <span>
                      courses.
                      <br />
                      One clear picture.
                    </span>
                  </div>
                  <span className="tile-bottom">
                    Your progress
                    <span>
                      View grades <ArrowRight size={17} />
                    </span>
                  </span>
                </button>
                <button
                  className="dashboard-tile appointment-tile"
                  onClick={() => {
                    setError("");
                    setNotice("");
                    setPage("appointments");
                  }}
                >
                  <span className="tile-top">
                    <span className="eyebrow">03 / SCHOOL SERVICES</span>
                    <CalendarDays size={30} />
                  </span>
                  <h2>
                    Book an
                    <br />
                    appointment.
                  </h2>
                  <span className="tile-bottom">
                    Guidance availability{" "}
                    <span>
                      View times <ArrowRight size={17} />
                    </span>
                  </span>
                </button>
                <SchoolCalendar
                  key={`${snapshot?.reports.student}-${snapshot?.reports.school}`}
                  school={snapshot?.reports.school ?? ""}
                  account={snapshot?.reports.student ?? "demo"}
                  refreshToken={dashboardRefresh}
                  url={
                    snapshot?.reports.calendarUrl ||
                    (snapshot?.reports.appointmentUrl
                      ? (() => {
                          const url = new URL(
                            "https://ta.yrdsb.ca/live/students/calendar_full.php",
                          );
                          const school = new URL(
                            snapshot.reports.appointmentUrl!,
                          ).searchParams.get("school_id");
                          if (!school) return undefined;
                          url.searchParams.set("school_id", school);
                          return url.href;
                        })()
                      : undefined)
                  }
                />
              </div>
            </>
          )}
          {page === "grades" && (
            <>
              {hypotheticalCourses !== null && (
                <p className="hypothetical-note">
                  Hypothetical mode · Edit or remove courses below. Turn off to
                  discard changes; real grades and history are unchanged.
                </p>
              )}
              <div className="page-heading">
                <div>
                  <p className="muted">
                    {snapshot?.reports.school}{" "}
                    <span className="school-separator">/</span> Student{" "}
                    {snapshot?.reports.student}
                  </p>
                </div>
              </div>
              <label className="semester-filter">
                Showing
                <select
                  value={semesterFilter ?? "unknown"}
                  onChange={(e) =>
                    setSemesterFilter(
                      e.target.value === "all"
                        ? "all"
                        : e.target.value === "unknown"
                          ? null
                          : (Number(e.target.value) as 1 | 2),
                    )
                  }
                >
                  <option value="all">All semesters</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="unknown">Semester unavailable</option>
                </select>
              </label>
              <GradeOverview
                onTrends={() => openTrends()}
                average={average}
                courses={visibleCourses}
                count={graded.length}
                privateMarks={blurMarks}
                hypothetical={hypotheticalCourses !== null}
              />
              {invalidMarks && (
                <p role="alert">Enter course grades between 0 and 100.</p>
              )}
              <div className="section-heading">
                <h2>
                  My courses <span>{visibleCourses.length}</span>
                </h2>
                <span className="muted">Small steps. Real progress.</span>
              </div>
              {([1, 2, null] as const).map((semester) => {
                const courses = visibleCourses.filter(
                  (c) => courseSemester(c.dates) === semester,
                );
                if (!courses.length) return null;
                return (
                  <section
                    key={semester ?? "unknown"}
                    className="semester-section"
                  >
                    <h3 className="semester-heading">
                      {semester
                        ? `Semester ${semester}`
                        : "Semester unavailable"}{" "}
                      <span>{courses.length} courses</span>
                    </h3>
                    <div className="course-grid">
                      {courses.map((c, i) =>
                        hypotheticalCourses !== null ? (
                          <article
                            className={`course-card editable-course color-${i % 4}`}
                            key={c.id}
                          >
                            <div className="course-top">
                              <span className="subject-icon">
                                <SubjectIcon code={c.code} />
                              </span>
                              <button
                                className="remove-course"
                                aria-label={`Remove ${c.name || c.code}`}
                                onClick={() =>
                                  setHypotheticalCourses(
                                    hypotheticalCourses.filter(
                                      (v) => v.id !== c.id,
                                    ),
                                  )
                                }
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                            <label>
                              Course name
                              <input
                                value={c.name || c.code}
                                onChange={(e) =>
                                  setHypotheticalCourses(
                                    hypotheticalCourses.map((v) =>
                                      v.id === c.id
                                        ? { ...v, name: e.target.value }
                                        : v,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <p className="course-code">{c.code}</p>
                            <label>
                              Course grade (%)
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                placeholder="Not published"
                                value={hypotheticalMarks[c.id] ?? ""}
                                onChange={(e) =>
                                  setHypotheticalMarks({
                                    ...hypotheticalMarks,
                                    [c.id]: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <div className="progress-track">
                              <div
                                style={{
                                  width: `${Math.max(0, Math.min(100, displayedMark(c) || 0))}%`,
                                }}
                              />
                            </div>
                            <label>
                              Semester
                              <select
                                value={courseSemester(c.dates) ?? "unknown"}
                                onChange={(e) =>
                                  setHypotheticalCourses(
                                    hypotheticalCourses.map((v) =>
                                      v.id === c.id
                                        ? {
                                            ...v,
                                            dates:
                                              e.target.value === "1"
                                                ? "2026-09-01"
                                                : e.target.value === "2"
                                                  ? "2027-02-01"
                                                  : "",
                                          }
                                        : v,
                                    ),
                                  )
                                }
                              >
                                <option value="1">Semester 1</option>
                                <option value="2">Semester 2</option>
                                <option value="unknown">
                                  Semester unavailable
                                </option>
                              </select>
                            </label>
                          </article>
                        ) : (
                          <article
                            className={`course-card course-with-actions color-${i % 4}`}
                            key={c.id}
                          >
                            <button
                              className="course-report-button"
                              disabled={busy}
                              onClick={() => void openCourse(c)}
                            >
                              <div className="course-top">
                                <span className="subject-icon">
                                  <SubjectIcon code={c.code} />
                                </span>
                                <span className="pill">
                                  {c.block || "Course"}{" "}
                                  {c.room && `· Room ${c.room}`}
                                </span>
                              </div>
                              <h3>{c.name || c.code}</h3>
                              <p className="course-code">{c.code}</p>
                              <div className="course-mark">
                                <PrivacyValue
                                  enabled={blurMarks}
                                  value={mark(courseMark(c))}
                                />
                                <span>
                                  {c.final != null
                                    ? "Final mark"
                                    : c.mark === null
                                      ? "Not published"
                                      : "Current mark"}
                                </span>
                              </div>
                              <div className="progress-track">
                                <div
                                  style={{
                                    width: `${Math.max(0, Math.min(100, courseMark(c) ?? 0))}%`,
                                  }}
                                />
                              </div>
                              <div className="course-bottom">
                                <span>
                                  {c.midterm !== null
                                    ? `Midterm ${c.midterm}%`
                                    : "No midterm posted"}
                                </span>
                                {c.url || snapshot?.details[c.id] ? (
                                  <span>
                                    View report <ArrowRight size={15} />
                                  </span>
                                ) : (
                                  <span>Report unavailable</span>
                                )}
                              </div>
                              {!c.url && (
                                <p className="unavailable">{c.status}</p>
                              )}
                            </button>
                            <button
                              className="secondary card-trends-button"
                              onClick={() => openTrends(c.id)}
                            >
                              <TrendingUp size={16} />
                              Trends
                            </button>
                          </article>
                        ),
                      )}
                    </div>
                  </section>
                );
              })}
              {hypotheticalCourses !== null && (
                <div className="course-grid add-course-grid">
                  <button
                    className="course-card add-course-card"
                    onClick={addHypotheticalCourse}
                  >
                    <Plus size={32} />
                    <h3>Add course</h3>
                    <span>Try another hypothetical course</span>
                  </button>
                </div>
              )}
              <div className="bottom-note">
                <ShieldCheck size={17} />
                <span>
                  Saved grades stay available offline. Refresh when you’re ready
                  for an update.
                </span>
              </div>
            </>
          )}
          {page === "course" && course && (
            <>
              <button
                className="back"
                onClick={() => {
                  setSemesterFilter("all");
                  setPage("grades");
                }}
              >
                <ArrowLeft size={16} /> All courses
              </button>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    {course.code} · {course.block} · ROOM {course.room}
                  </span>
                  <h1>{course.name || course.code}</h1>
                  <p className="muted">
                    {courseSemester(course.dates)
                      ? `Semester ${courseSemester(course.dates)} · `
                      : ""}
                    {course.dates}
                  </p>
                </div>
                <div className="detail-mark">
                  <strong>
                    <PrivacyValue
                      enabled={blurMarks}
                      value={mark(courseMark(course))}
                    />
                  </strong>
                  <span>
                    {course.final != null
                      ? "Final course mark"
                      : "Current course mark"}
                  </span>
                </div>
              </div>
              <div
                className="report-grades"
                aria-label="Published course marks"
              >
                {course.midterm != null && (
                  <div className="category color-0">
                    <span>Midterm mark</span>
                    <strong>
                      <PrivacyValue
                        enabled={blurMarks}
                        value={mark(course.midterm)}
                      />
                    </strong>
                  </div>
                )}
                {course.final != null && course.mark !== null && (
                  <div className="category color-1">
                    <span>Current mark</span>
                    <strong>
                      <PrivacyValue
                        enabled={blurMarks}
                        value={mark(course.mark)}
                      />
                    </strong>
                  </div>
                )}
              </div>
              <div className="detail-toolbar">
                <span className="muted">
                  {busy
                    ? "Updating report…"
                    : detail
                      ? `${detail.assessments.length} assignments · ${detail.generated ? `Report generated ${detail.generated}` : `Saved ${selected && snapshot?.detailUpdated[selected] ? date(snapshot.detailUpdated[selected]) : "locally"}`}`
                      : "No saved assignment report yet."}
                </span>
                <button
                  className="secondary"
                  disabled={busy || !course.url}
                  onClick={() => void openCourse(course)}
                >
                  <RefreshCw size={16} /> Refresh report
                </button>
              </div>
              {detail && (
                <>
                  {!!detail.gradeSummaries?.length && (
                    <div
                      className="report-grades"
                      aria-label="Grades from course report"
                    >
                      {detail.gradeSummaries.map((grade, index) => (
                        <div
                          className="category color-0"
                          key={`${grade.label}-${index}`}
                        >
                          <span>{grade.label} mark · course report</span>
                          <strong>
                            <PrivacyValue
                              enabled={blurMarks}
                              value={mark(grade.mark)}
                            />
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                  <WhatIf
                    key={`${course.id}-${snapshot?.detailUpdated[course.id] ?? "demo"}`}
                    detail={detail}
                  />
                  <CourseCategories
                    key={course.id}
                    detail={detail}
                    blurMarks={blurMarks}
                  />
                  <div className="section-heading">
                    <h2>Assignments</h2>
                    <label className="search">
                      <Search size={17} />
                      <input
                        aria-label="Search assignments"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Find an assignment…"
                      />
                    </label>
                  </div>
                  <div className="assignments">
                    {detail.assessments
                      .filter((a) =>
                        a.name.toLowerCase().includes(query.toLowerCase()),
                      )
                      .map((a, i) => (
                        <article className="assignment" key={i}>
                          <div className="assignment-title">
                            <span className="assignment-number">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <h3>{a.name}</h3>
                              {a.comment && <p>{a.comment}</p>}
                            </div>
                          </div>
                          <div className="scores">
                            {a.scores.map((s, j) => (
                              <div
                                className={
                                  s.excluded ? "score excluded" : "score"
                                }
                                key={j}
                              >
                                <span>{s.category}</span>
                                <strong>
                                  {s.text.split(/weight\s*=/i)[0]}
                                </strong>
                                <small>
                                  {s.excluded
                                    ? "Excluded from mark"
                                    : s.text.match(/weight\s*=\s*([\d.]+)/i)
                                      ? `Weight ${s.text.match(/weight\s*=\s*([\d.]+)/i)![1]}`
                                      : "Reported mark"}
                                </small>
                              </div>
                            ))}
                            {!a.scores.length && (
                              <span className="muted">Not marked yet</span>
                            )}
                          </div>
                        </article>
                      ))}
                    {!detail.assessments.some((a) =>
                      a.name.toLowerCase().includes(query.toLowerCase()),
                    ) && (
                      <div className="empty">
                        No assignments match your search.
                      </div>
                    )}
                  </div>
                </>
              )}
              {!detail && !busy && (
                <div className="empty">
                  <WifiOff />
                  <h3>No saved report</h3>
                  <p>
                    Connect and refresh, or import this course’s saved HTML
                    file.
                  </p>
                  <button
                    className="secondary"
                    onClick={() => importer.current?.click()}
                  >
                    <Upload size={16} /> Import report
                  </button>
                </div>
              )}
            </>
          )}
          {page === "trends" && snapshot && (
            <Trends
              key={trendsCourse ?? "all"}
              snapshot={snapshot}
              courseId={trendsCourse}
              privateMarks={blurMarks}
              onBack={() => setPage(trendsReturn)}
            />
          )}
          {page === "history" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOUR PROGRESS OVER TIME</span>
                  <h1>History.</h1>
                  <p className="muted">
                    Changes detected when reports are refreshed or imported.
                    Your first report is the starting point.
                  </p>
                </div>
              </div>
              {historyFilter && (
                <div className="history-filter">
                  <strong>
                    {historyFilter.course}
                    {historyFilter.assignment
                      ? ` · ${historyFilter.assignment}`
                      : ""}
                  </strong>
                  <button
                    className="secondary"
                    onClick={() => setHistoryFilter(null)}
                  >
                    Show all history
                  </button>
                </div>
              )}
              <div className="history-list">
                {!snapshot?.changes?.length && (
                  <div className="empty">
                    <History />
                    <h3>No changes yet</h3>
                    <p>
                      Grade, assessment, and feedback updates will appear here
                      after your next report update.
                    </p>
                  </div>
                )}
                {[...(snapshot?.changes ?? [])]
                  .filter(
                    (event) =>
                      !historyFilter ||
                      (event.course === historyFilter.course &&
                        (!historyFilter.assignment ||
                          (event.assignment ??
                            event.label.slice(
                              0,
                              event.label.lastIndexOf(" · "),
                            )) === historyFilter.assignment)),
                  )
                  .reverse()
                  .map((event, i) => (
                    <article
                      className="history-entry"
                      key={`${event.date}-${i}`}
                    >
                      <div className="history-meta">
                        <strong>{event.course}</strong>
                        <time dateTime={event.date}>{date(event.date)}</time>
                      </div>
                      <h3>{event.label}</h3>
                      <span className={`history-direction ${event.direction}`}>
                        {event.direction === "up" ? (
                          <>
                            <TrendingUp size={16} aria-hidden="true" />{" "}
                            Increased
                          </>
                        ) : event.direction === "down" ? (
                          <>
                            <TrendingDown size={16} aria-hidden="true" />{" "}
                            Decreased
                          </>
                        ) : (
                          <>
                            <Minus size={16} aria-hidden="true" /> Updated
                          </>
                        )}
                      </span>
                      <div className="history-values">
                        <span>{event.before}</span>
                        <ArrowRight size={18} aria-label="changed to" />
                        <strong>{event.after}</strong>
                      </div>
                    </article>
                  ))}
              </div>
            </>
          )}
          {page === "appointments" && (
            <Appointments
              key={String(demo)}
              loading={appointmentsLoading && !demo}
              onUpdate={(result) => {
                setAppointments(result.booked);
                setLiveAppointmentSlots(result.slots);
              }}
              date={appointmentDate}
              slots={demo ? demoAppointmentSlots : liveAppointmentSlots}
              booked={appointments}
              onDate={(date) => {
                setAppointmentDate(date);
                setLiveAppointmentSlots([]);
                setError("");
              }}
              onBook={(slot) =>
                setAppointments((current) =>
                  current.some(
                    (a) =>
                      a.teacher === slot.teacher &&
                      a.date === appointmentDate &&
                      a.time === slot.time,
                  )
                    ? current
                    : [
                        ...current,
                        {
                          teacher: slot.teacher,
                          date: appointmentDate,
                          time: slot.time,
                        },
                      ],
                )
              }
              onCancel={(appointment) =>
                setAppointments((current) =>
                  current.filter((a) => a !== appointment),
                )
              }
            />
          )}
          {page === "settings" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOURS TO MANAGE</span>
                  <h1>Settings.</h1>
                  <p className="muted">Choose what stays on this device.</p>
                </div>
              </div>
              <div
                className="settings-card preferences-card"
                data-part="preferences"
              >
                <h2>Preferences</h2>
                <RefreshInterval
                  value={pollMinutes}
                  onChange={(pollMinutes) => updatePreferences({ pollMinutes })}
                />
                <PreferenceSwitch
                  label="Grade notifications"
                  checked={notifications}
                  disabled={!native}
                  onChange={async (enabled) => {
                    if (!enabled) {
                      updatePreferences({ notifications: false });
                      return;
                    }
                    try {
                      const permission = await GradeUpdates.permission();
                      if (permission.granted)
                        updatePreferences({ notifications: true });
                      else
                        setNotice(
                          "Allow notifications in your phone settings to receive grade changes.",
                        );
                    } catch {
                      setError("Could not enable notifications.");
                    }
                  }}
                >
                  Get a notification when grades change. Available in the iOS
                  and Android app; messages don’t include your marks.
                </PreferenceSwitch>
                <div className="preference-row">
                  <div className="preference-heading">
                    <label htmlFor="preference-theme">Theme</label>
                    <select
                      id="preference-theme"
                      value={theme}
                      onChange={(event) =>
                        updatePreferences({
                          theme: event.target.value as "light" | "dark",
                        })
                      }
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                  <PreferenceHelp label="Theme">
                    Choose a light or dark appearance.
                  </PreferenceHelp>
                </div>
                <PreferenceSwitch
                  label="Haptic feedback"
                  checked={haptics}
                  onChange={(haptics) => updatePreferences({ haptics })}
                >
                  Feel a light tap when pressing buttons on supported devices.
                </PreferenceSwitch>
                <PreferenceSwitch
                  label="Privacy blur"
                  checked={blurMarks}
                  onChange={(blurMarks) => updatePreferences({ blurMarks })}
                >
                  Hide marks until you tap to reveal them. Widget marks are
                  hidden too.
                </PreferenceSwitch>
                {saveError && <p role="alert">{saveError}</p>}
              </div>
              <Customization />
              <div className="settings-card">
                <ShieldCheck size={28} />
                <h2>Storage & account</h2>
                <p>
                  Username:{" "}
                  <strong>
                    {demo
                      ? "Demo student"
                      : snapshot?.username ||
                        "Unavailable for imported reports"}
                  </strong>
                </p>
                <button className="secondary" onClick={() => setInfoOpen(true)}>
                  More info
                </button>
                {infoOpen && (
                  <Modal
                    title="Local by design"
                    label="STORAGE & PRIVACY"
                    closeLabel="Close information"
                    onClose={() => setInfoOpen(false)}
                  >
                    <div className="info-content">
                      <p>
                        Course marks and opened reports are saved on this device
                        for offline viewing. Login details are only saved when
                        you choose to, using iOS Keychain or Android
                        Keystore-backed encryption.
                      </p>
                      <p>
                        Saved grade data is stored in app preferences; it is not
                        separately encrypted. Signing out removes both saved
                        grades and saved login details.
                      </p>
                    </div>
                  </Modal>
                )}
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void (async () => {
                      if (native) await GradeUpdates.clear();
                      await forgetCredentials();
                    })()
                      .then(() => {
                        setRemember(false);
                        setNotice("Saved login removed.");
                      })
                      .catch(() => setError("Could not remove saved login."))
                  }
                >
                  <LockKeyhole size={16} /> Forget saved login
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    setPage("login");
                    setError("");
                  }}
                >
                  <ChevronRight size={16} /> Sign in again
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => importer.current?.click()}
                >
                  <Upload size={16} /> Import saved HTML reports
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => void signOut()}
                >
                  <LogOut size={16} /> Sign out & clear this device
                </button>
              </div>
            </>
          )}
          {page === "dashboard" && (
            <ExtensionSlot
              name="dashboard.after"
              context={{ page, courseId: null }}
            />
          )}
          {page === "course" && (
            <ExtensionSlot
              name="course.after"
              context={{ page, courseId: selected }}
            />
          )}
          {page === "settings" && (
            <ExtensionSlot
              name="settings.after"
              context={{ page, courseId: null }}
            />
          )}
          <footer>
            teachassist companion <span>YOUR LEARNING. YOUR PACE.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
