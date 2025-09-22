// @ts-nocheck
import { useMemo, useState, useRef } from "react";

/**
 * Unified AI Workspace — single-file prototype (Week Calendar edition)
 * -------------------------------------------------
 * Features:
 * 1) Unified course dashboard (assignments, announcements, office hours)
 * 2) AI syllabus summary (on-device extractive summary — no API needed)
 * 3) Professor-created AI templates for students, with guardrails + usage logs
 * 4) Week Calendar that looks/acts like a simplified Google Calendar
 *    - Renders Office Hours as blocks on a weekly grid
 *    - Renders "My Calendar" events (your personal schedule)
 *    - Toggle: show only office hours you’re free to attend
 * 5) Smart scheduler considers your availability + your personal events
 */

// ----------------------------- Mock Data ----------------------------------
const mockCourses = [
  {
    id: "cs1060",
    code: "CS1060",
    name: "Web Systems",
    instructor: "Prof. Lee",
    syllabus: `Course Description: This course introduces web development, HTTP, and modern frontend frameworks.
Learning Objectives: Build accessible, performant web apps.
Grading: 40% projects, 20% quizzes, 20% participation, 20% final.
Late Policy: 48-hour grace period with 10% penalty.
Attendance: Sections are mandatory; two allowed absences.
Office Hours: M 2-4pm (Pierce 301), W 5-7pm (virtual on Zoom).
AI Policy: AI tools allowed for brainstorming and scaffolding with citation; no direct code pasting without attribution.
Accessibility: We commit to inclusive practices; reach out for accommodations.`,
    assignments: [
      { id: "a1", title: "HW1: Static Site", due: "2025-09-26T23:59", weight: 10 },
      { id: "a2", title: "Proj1: React App", due: "2025-10-05T23:59", weight: 15 },
    ],
    announcements: [
      { id: "an1", title: "Syllabus posted", date: "2025-09-02T09:00", body: "Please read and acknowledge on Canvas." },
      { id: "an2", title: "Starter code released", date: "2025-09-12T10:30", body: "HW1 assets available in repo." },
    ],
    officeHours: [
      { id: "oh1", staff: "Prof. Lee", day: "Mon", start: "14:00", end: "16:00", location: "Pierce 301", channel: "In-person" },
      { id: "oh2", staff: "TA Maya", day: "Wed", start: "17:00", end: "19:00", location: "Zoom", channel: "Virtual" },
    ],
    templates: [
      {
        id: "t1",
        name: "Homework Planning Prompt",
        content:
          "You are my study planner. Create a schedule to finish {{assignment}} by {{dueDate}}. I have {{freeHours}} hours/day. Include checkpoints and self-tests.",
        variables: ["assignment", "dueDate", "freeHours"],
        guardrails: { citeAI: true, usageBudget: 10 },
      },
      {
        id: "t2",
        name: "Code Review Checklist",
        content:
          "Review this React code for accessibility, performance, and security. Summarize top 5 issues and show examples. Code: {{codeSnippet}}",
        variables: ["codeSnippet"],
        guardrails: { citeAI: true, usageBudget: 8 },
      },
    ],
  },
  {
    id: "cs2620",
    code: "CS2620",
    name: "Distributed Systems",
    instructor: "Prof. Chong",
    syllabus: `Description: Principles of distributed systems, consensus (Raft/Paxos), fault tolerance, and replication.
Learning Goals: Design, build, and debug distributed services.
Grading: 30% labs, 30% project, 20% exams, 20% participation.
Late Policy: Slip days: 3 total, then 15%/day.
Attendance: Lectures recorded; sections strongly recommended.
Office Hours: Tue 3-5pm (Maxwell D31), Thu 10-12 (Zoom).
AI Policy: AI for design brainstorming permitted with citations; prohibited for graded code unless explicitly allowed.
Academic Integrity: Follow the collaboration policy; discuss ideas, write your own code.`,
    assignments: [
      { id: "l1", title: "Lab 1: RPC", due: "2025-09-29T17:00", weight: 8 },
      { id: "p1", title: "Project: Kung-Fu Chess (milestone 1)", due: "2025-10-10T18:00", weight: 12 },
    ],
    announcements: [
      { id: "an1", title: "Lab 0 warm-up posted", date: "2025-09-03T11:00", body: "Optional but encouraged." },
      { id: "an2", title: "Project teams finalized", date: "2025-09-15T13:45", body: "Check the roster sheet." },
    ],
    officeHours: [
      { id: "oh1", staff: "Prof. Chong", day: "Tue", start: "15:00", end: "17:00", location: "Maxwell D31", channel: "In-person" },
      { id: "oh2", staff: "TA Jordan", day: "Thu", start: "10:00", end: "12:00", location: "Zoom", channel: "Virtual" },
    ],
    templates: [
      {
        id: "t3",
        name: "Design Doc Skeleton",
        content:
          "Draft a concise design doc for {{component}} in a distributed service. Include API, data model, failure modes, and tests.",
        variables: ["component"],
        guardrails: { citeAI: true, usageBudget: 12 },
      },
    ],
  },
];

// Example availability for Smart Scheduler tab
const defaultAvailability = [
  { day: "Mon", ranges: [{ start: "09:00", end: "12:00" }, { start: "14:30", end: "18:30" }] },
  { day: "Tue", ranges: [{ start: "10:00", end: "13:00" }, { start: "15:30", end: "19:00" }] },
  { day: "Wed", ranges: [{ start: "13:00", end: "20:00" }] },
  { day: "Thu", ranges: [{ start: "08:30", end: "11:30" }, { start: "14:00", end: "17:30" }] },
  { day: "Fri", ranges: [{ start: "09:00", end: "12:00" }] },
  { day: "Sat", ranges: [] },
  { day: "Sun", ranges: [{ start: "15:00", end: "18:00" }] },
];

// Personal calendar events (busy)
const initialUserEvents = [
  { id: "b1", title: "Lecture: Linear Algebra", day: "Mon", start: "10:00", end: "11:30" },
  { id: "b2", title: "Interview Block", day: "Tue", start: "16:00", end: "17:00" },
  { id: "b3", title: "Club Meeting", day: "Thu", start: "15:00", end: "16:00" },
];

// ----------------------------- Utilities -----------------------------------
const dayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function overlaps(aStart, aEnd, bStart, bEnd) {
  const A1 = toMinutes(aStart), A2 = toMinutes(aEnd);
  const B1 = toMinutes(bStart), B2 = toMinutes(bEnd);
  return Math.max(A1, B1) < Math.min(A2, B2);
}
function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
}
function formatDateTimeLocal(dt) {
  const d = new Date(dt);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
// Simple template engine
function applyTemplate(raw, vars) {
  return raw.replace(/{{\s*(\w+)\s*}}/g, (_, key) => (vars[key] ?? `{{${key}}}`));
}
// Naive extractive syllabus summarizer
function summarizeSyllabus(text) {
  const lines = text.split(/\n|\r/).map((s) => s.trim()).filter(Boolean);
  const sections = { Description: [], Goals: [], Grading: [], Attendance: [], OfficeHours: [], LatePolicy: [], AIPolicy: [], Accessibility: [], Misc: [] };
  for (const ln of lines) {
    const L = ln.toLowerCase();
    if (L.startsWith("course description") || L.startsWith("description")) sections.Description.push(ln);
    else if (L.startsWith("learning objectives") || L.startsWith("learning goals") || L.includes("goals")) sections.Goals.push(ln);
    else if (L.startsWith("grading")) sections.Grading.push(ln);
    else if (L.startsWith("attendance")) sections.Attendance.push(ln);
    else if (L.startsWith("office hours")) sections.OfficeHours.push(ln);
    else if (L.startsWith("late policy") || L.includes("late")) sections.LatePolicy.push(ln);
    else if (L.startsWith("ai policy") || L.includes("ai tools")) sections.AIPolicy.push(ln);
    else if (L.startsWith("accessibility") || L.includes("accommodations")) sections.Accessibility.push(ln);
    else sections.Misc.push(ln);
  }
  const block = (title, arr) => (arr.length ? `**${title}.**\n- ${arr.join("\n- ")}` : "");
  const parts = [
    block("Description", sections.Description),
    block("Learning Goals", sections.Goals),
    block("Grading", sections.Grading),
    block("Attendance", sections.Attendance),
    block("Office Hours", sections.OfficeHours),
    block("Late Policy", sections.LatePolicy),
    block("AI Policy", sections.AIPolicy),
    block("Accessibility", sections.Accessibility),
  ].filter(Boolean);
  return parts.join("\n\n");
}

// Compute upcoming items
function useUpcoming(courses, count = 8) {
  return useMemo(() => {
    const items = [];
    for (const c of courses) {
      for (const a of c.assignments) items.push({ type: "Assignment", course: c, title: a.title, date: a.due, meta: `${a.weight}%` });
      for (const an of c.announcements) items.push({ type: "Announcement", course: c, title: an.title, date: an.date, meta: "" });
    }
    items.sort((x, y) => new Date(x.date) - new Date(y.date));
    return items.slice(0, count);
  }, [courses, count]);
}

// Intersect availability with OH and avoid user events (busy)
function findOHMatches(availability, officeHours, busy = []) {
  const matches = [];
  for (const oh of officeHours) {
    const dayAvail = availability.find((d) => d.day === oh.day);
    if (!dayAvail) continue;

    let okWindow = false;
    for (const r of dayAvail.ranges) { if (overlaps(r.start, r.end, oh.start, oh.end)) { okWindow = true; break; } }
    if (!okWindow) continue;

    const conflicts = busy.filter((b) => b.day === oh.day && overlaps(b.start, b.end, oh.start, oh.end));
    if (conflicts.length) continue;

    matches.push(oh);
  }
  matches.sort((a, b) => dayIndex[a.day] - dayIndex[b.day] || toMinutes(a.start) - toMinutes(b.start));
  return matches;
}

// ------------------------------ UI Bits ------------------------------------
function Tag({ children }) { return <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 border border-slate-200">{children}</span>; }
function Card({ title, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold tracking-wide text-slate-700">{title}</h3>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
function Row({ left, right, sub }) {
  return (
    <div className="flex items-start justify-between py-2">
      <div>
        <div className="font-medium text-slate-800">{left}</div>
        {sub ? <div className="text-xs text-slate-500 mt-0.5">{sub}</div> : null}
      </div>
      <div className="text-sm text-slate-600">{right}</div>
    </div>
  );
}
function Switch({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span className="text-sm text-slate-700">{label}</span>
      <span onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${checked ? "bg-indigo-600" : "bg-slate-300"}`}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
      </span>
    </label>
  );
}
function PillButton({ children, onClick, variant = "primary" }) {
  const styles = variant === "primary" ? "bg-indigo-600 text-white hover:bg-indigo-700" : variant === "ghost" ? "bg-transparent text-slate-700 hover:bg-slate-100" : "bg-slate-800 text-white hover:bg-slate-900";
  return <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${styles}`}>{children}</button>;
}
function TextArea({ value, onChange, rows = 6, placeholder }) {
  return <textarea className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} />;
}

// ------------------------------ Calendar UI --------------------------------
const START_HOUR = 8;  // 8 AM
const END_HOUR = 20;   // 8 PM
const PX_PER_MIN = 1;  // 1px per minute => 12h = 720px tall

function Block({ top, height, colorClass, children, border = "border-indigo-600/30" }) {
  return (
    <div className={`absolute left-1 right-1 rounded-lg ${border} border bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden`}
         style={{ top, height }}>
      <div className={`h-full w-full ${colorClass} bg-opacity-15 p-2 text-xs leading-4`}>{children}</div>
    </div>
  );
}
function WeekGridLines() {
  const hours = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);
  return (
    <div className="absolute inset-0">
      {hours.map((h, i) => (
        <div key={i} className="absolute left-0 right-0 border-t border-slate-100 text-[10px] text-slate-400"
             style={{ top: (h - START_HOUR) * 60 * PX_PER_MIN }}>
          <div className="-mt-2 -ml-10 w-8 text-right pr-1">{((h + 11) % 12) + 1}{h >= 12 ? "p" : "a"}</div>
        </div>
      ))}
    </div>
  );
}
function positionFor(start, end) {
  const top = (toMinutes(start) - START_HOUR * 60) * PX_PER_MIN;
  const height = (toMinutes(end) - toMinutes(start)) * PX_PER_MIN;
  return { top, height: Math.max(22, height) };
}
function WeekCalendar({ officeHours, events, showOnlyFree, onBook }) {
  const annotatedOH = useMemo(() => {
    return officeHours.map((oh) => {
      const conflicts = events.filter((e) => e.day === oh.day && overlaps(e.start, e.end, oh.start, oh.end));
      return { ...oh, conflict: conflicts.length > 0 };
    });
  }, [officeHours, events]);

  const columns = days.map((d) => ({ day: d, oh: annotatedOH.filter((o) => o.day === d), ev: events.filter((e) => e.day === d) }));

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[900px] grid grid-cols-8 gap-2">
        {/* Time gutter spacer */}
        <div />
        {days.map((d) => (<div key={d} className="text-sm font-medium text-slate-700 text-center">{d}</div>))}
        <div className="col-span-8 grid grid-cols-8 gap-2">
          <div className="relative" />
          {columns.map((col) => (
            <div key={col.day} className="relative bg-white rounded-xl border border-slate-200" style={{ height: (END_HOUR - START_HOUR) * 60 * PX_PER_MIN }}>
              <WeekGridLines />
              {/* User events */}
              {col.ev.map((e) => {
                const { top, height } = positionFor(e.start, e.end);
                return (
                  <Block key={e.id} top={top} height={height} colorClass="bg-slate-500/20" border="border-slate-400/40">
                    <div className="font-medium text-slate-700">{e.title}</div>
                    <div className="text-slate-500">{formatTime(e.start)}–{formatTime(e.end)}</div>
                  </Block>
                );
              })}
              {/* Office hours */}
              {col.oh.filter((o) => (showOnlyFree ? !o.conflict : true)).map((o) => {
                const { top, height } = positionFor(o.start, o.end);
                const color = o.conflict ? "bg-red-500/20" : "bg-indigo-500/20";
                return (
                  <Block key={`${o.courseId}-${o.id}`} top={top} height={height} colorClass={color}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-800">{o.courseName}</div>
                        <div className="text-slate-600">{o.staff} · {o.channel}</div>
                        <div className="text-slate-500 text-[11px]">{formatTime(o.start)}–{formatTime(o.end)} · {o.location}</div>
                      </div>
                      {!o.conflict && (
                        <button onClick={() => onBook(o)} className="ml-2 shrink-0 px-2 py-1 rounded-md bg-indigo-600 text-white text-[11px]">Book</button>
                      )}
                    </div>
                  </Block>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------ Main App -----------------------------------
export default function App() {
  const [role, setRole] = useState("Student"); // "Student" | "Faculty"
  const [courses, setCourses] = useState(mockCourses);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0].id);
  const [availability, setAvailability] = useState(defaultAvailability);
  const [usageLog, setUsageLog] = useState([]);
  const [guardCiteAI, setGuardCiteAI] = useState(true);
  const [guardHighVariance, setGuardHighVariance] = useState(true);
  const [userEvents, setUserEvents] = useState(initialUserEvents); // personal calendar
  const [showOnlyFree, setShowOnlyFree] = useState(true);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const upcoming = useUpcoming(courses);

  const allOH = useMemo(() => courses.flatMap((c) => c.officeHours.map((o) => ({ ...o, courseId: c.id, courseName: c.name }))), [courses]);
  const matches = useMemo(() => findOHMatches(availability, allOH, userEvents), [availability, allOH, userEvents]);

  // ------- Handlers -------
  function handleTemplateUse(course, tpl, values) {
    const text = applyTemplate(tpl.content, values);
    setUsageLog((log) => [{ id: `${Date.now()}`, courseId: course.id, courseName: course.name, template: tpl.name, timestamp: new Date().toISOString(), settings: { citeAI: guardCiteAI, highVarianceOff: guardHighVariance } }, ...log]);
    setCourses((prev) => prev.map((c) => c.id !== course.id ? c : { ...c, templates: c.templates.map((t) => t.id !== tpl.id ? t : { ...t, guardrails: { ...t.guardrails, usageBudget: Math.max(0, (t.guardrails?.usageBudget ?? 0) - 1) } }) }));
    return text;
  }
  function addRange(day) { setAvailability((prev) => prev.map((d) => (d.day === day ? { ...d, ranges: [...d.ranges, { start: "13:00", end: "15:00" }] } : d))); }
  function updateRange(day, idx, key, value) { setAvailability((prev) => prev.map((d) => d.day !== day ? d : { ...d, ranges: d.ranges.map((r, i) => (i === idx ? { ...r, [key]: value } : r)) })); }
  function removeRange(day, idx) { setAvailability((prev) => prev.map((d) => (d.day !== day ? d : { ...d, ranges: d.ranges.filter((_, i) => i !== idx) }))); }
  function addEvent(evt) { setUserEvents((prev) => [{ ...evt, id: `evt_${Date.now()}` }, ...prev]); }
  function deleteEvent(id) { setUserEvents((prev) => prev.filter((e) => e.id !== id)); }

  // -------------- Views --------------
  function Dashboard() {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <Card title="Unified Upcoming View" right={<Tag>{new Date().toLocaleDateString()}</Tag>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b">
                  <tr>
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Course</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Title</th>
                    <th className="py-2">Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((it, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">{formatDateTimeLocal(it.date)}</td>
                      <td className="py-2 pr-4">{it.course.code}</td>
                      <td className="py-2 pr-4">{it.type}</td>
                      <td className="py-2 pr-4">{it.title}</td>
                      <td className="py-2">{it.meta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Announcements by Course">
            <div className="grid sm:grid-cols-2 gap-3">
              {courses.map((c) => (
                <div key={c.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-slate-800">{c.code} · {c.name}</div>
                    <Tag>{c.instructor}</Tag>
                  </div>
                  <ul className="space-y-2">
                    {c.announcements.map((an) => (
                      <li key={an.id} className="text-sm">
                        <span className="text-slate-500 mr-2">{formatDateTimeLocal(an.date)}:</span>
                        <span className="text-slate-800 font-medium">{an.title}</span>
                        <div className="text-slate-600">{an.body}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Office Hours (All Courses)">
            <div className="space-y-2">
              {allOH.map((oh) => (
                <Row key={`${oh.courseId}-${oh.id}`} left={<span>{oh.day} {formatTime(oh.start)}–{formatTime(oh.end)} <span className="text-slate-500">· {oh.courseName}</span></span>} right={<span className="flex items-center gap-2"><Tag>{oh.staff}</Tag><Tag>{oh.channel}</Tag><span className="text-slate-400">{oh.location}</span></span>} />
              ))}
            </div>
          </Card>

          <Card title="AI Usage Guardrails">
            <div className="space-y-3">
              <Switch label="Cite AI assistance in outputs" checked={guardCiteAI} onChange={setGuardCiteAI} />
              <Switch label="Limit high-variance generations (prefer concise)" checked={guardHighVariance} onChange={setGuardHighVariance} />
              <div className="text-xs text-slate-500">These toggles apply when using templates below and are logged for accountability.</div>
            </div>
          </Card>

          <Card title="AI Usage Log (Accountability)">
            <div className="space-y-2 max-h-72 overflow-auto">
              {usageLog.length === 0 && <div className="text-sm text-slate-500">No usage yet.</div>}
              {usageLog.map((u) => (
                <Row key={u.id} left={<span className="text-slate-700">{u.template} <span className="text-slate-400">· {u.courseName}</span></span>} right={<span className="text-slate-500">{formatDateTimeLocal(u.timestamp)}</span>} sub={`Settings: citeAI=${u.settings.citeAI ? "on" : "off"}, highVarianceOff=${u.settings.highVarianceOff ? "on" : "off"}`} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  function SyllabusSummarizer() {
    const [summary, setSummary] = useState("");
    function run() { const text = selectedCourse?.syllabus ?? ""; setSummary(summarizeSyllabus(text)); }
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title={`Syllabus · ${selectedCourse.code}`} right={<Tag>{selectedCourse.instructor}</Tag>}>
          <pre className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">{selectedCourse.syllabus}</pre>
        </Card>
        <Card title="AI-Generated Summary (extractive)" right={<PillButton onClick={run}>Summarize</PillButton>}>
          {summary ? (
            <div className="prose prose-sm max-w-none">
              {summary.split("\n\n").map((blk, i) => (
                <div key={i} className="mb-3">
                  {blk.split("\n").map((ln, j) => (
                    <div key={j} dangerouslySetInnerHTML={{ __html: ln.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">Click Summarize to generate a concise outline of key policies.</div>
          )}
        </Card>
      </div>
    );
  }

  function Templates() {
    const [activeTemplateId, setActiveTemplateId] = useState(selectedCourse.templates[0]?.id);
    const active = selectedCourse.templates.find((t) => t.id === activeTemplateId);
    const [variables, setVariables] = useState({});
    const [output, setOutput] = useState("");

    function generate() {
      if (!active) return;
      const text = handleTemplateUse(selectedCourse, active, variables);
      setOutput(text + (guardCiteAI ? "\n\n[Note: AI assistance used and cited.]" : ""));
    }
    function copyOut() { navigator.clipboard?.writeText(output); alert("Copied to clipboard."); }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title={`Templates · ${selectedCourse.code}`}>
          <div className="space-y-2">
            {selectedCourse.templates.map((t) => (
              <button key={t.id} onClick={() => { setActiveTemplateId(t.id); setVariables({}); setOutput(""); }} className={`w-full text-left px-3 py-2 rounded-xl border transition ${t.id === activeTemplateId ? "bg-indigo-50 border-indigo-200" : "hover:bg-slate-50"}`}>
                <div className="font-medium text-slate-800">{t.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">Budget left: {t.guardrails?.usageBudget ?? 0}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Fill Variables">
          {!active ? (
            <div className="text-sm text-slate-500">Select a template.</div>
          ) : (
            <div className="space-y-3">
              {active.variables.map((v) => (
                <div key={v}>
                  <label className="block text-xs text-slate-500 mb-1">{v}</label>
                  <input className="w-full rounded-xl border border-slate-200 p-2 text-sm" value={variables[v] ?? ""} onChange={(e) => setVariables((vars) => ({ ...vars, [v]: e.target.value }))} placeholder={`Enter ${v}`} />
                </div>
              ))}
              <div className="flex items-center gap-3 pt-1">
                <PillButton onClick={generate}>Generate</PillButton>
                <PillButton variant="ghost" onClick={() => setVariables({})}>Reset</PillButton>
              </div>
              <div className="text-xs text-slate-500">Guardrails: citeAI is {guardCiteAI ? "ON" : "OFF"}; high-variance is {guardHighVariance ? "OFF" : "ON"}.</div>
            </div>
          )}
        </Card>

        <Card title="Output">
          <TextArea value={output} onChange={setOutput} rows={14} placeholder="Your generated content will appear here..." />
          <div className="mt-3 flex items-center gap-2">
            <PillButton onClick={copyOut}>Copy</PillButton>
            <PillButton variant="ghost" onClick={() => setOutput("")}>Clear</PillButton>
          </div>
        </Card>
      </div>
    );
  }

  function EventEditor() {
    const [form, setForm] = useState({ title: "", day: "Mon", start: "10:00", end: "11:00" });
    const [error, setError] = useState("");

    function submit() {
      setError("");
      if (!form.title.trim()) return setError("Title required");
      if (toMinutes(form.end) <= toMinutes(form.start)) return setError("End must be after start");
      addEvent(form);
      setForm({ ...form, title: "" });
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <input className="rounded-xl border p-2 text-sm md:col-span-2" placeholder="Event title (e.g., Math Lecture)" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
        <select className="rounded-xl border p-2 text-sm" value={form.day} onChange={(e) => setForm((s) => ({ ...s, day: e.target.value }))}>{days.map((d) => <option key={d}>{d}</option>)}</select>
        <input type="time" className="rounded-xl border p-2 text-sm" value={form.start} onChange={(e) => setForm((s) => ({ ...s, start: e.target.value }))} />
        <input type="time" className="rounded-xl border p-2 text-sm" value={form.end} onChange={(e) => setForm((s) => ({ ...s, end: e.target.value }))} />
        <div className="md:col-span-5 flex items-center gap-2 pt-1">
          <PillButton onClick={submit}>Add to My Calendar</PillButton>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>
    );
  }

  function CalendarTab() {
    function book(oh) { alert(`Booked ${oh.courseName} · ${oh.staff} on ${oh.day} ${oh.start}–${oh.end}`); }
    return (
      <div className="space-y-4">
        <Card title="My Calendar · Add Events">
          <EventEditor />
          <div className="mt-3 text-xs text-slate-500">This simulates Google Calendar data. Later, connect Google/Microsoft Calendar APIs and auto-sync.</div>
        </Card>

        <Card title="Week Calendar" right={<Switch label="Show only free office hours" checked={showOnlyFree} onChange={setShowOnlyFree} />}>
          <WeekCalendar officeHours={allOH} events={userEvents} showOnlyFree={showOnlyFree} onBook={book} />
        </Card>

        <Card title="My Events">
          <div className="space-y-2">
            {userEvents.length === 0 && <div className="text-sm text-slate-500">No events yet.</div>}
            {userEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between border rounded-xl p-2">
                <div className="text-sm"><span className="font-medium text-slate-800">{e.title}</span> <span className="text-slate-500">· {e.day} {formatTime(e.start)}–{formatTime(e.end)}</span></div>
                <button onClick={() => deleteEvent(e.id)} className="text-xs text-red-600">Delete</button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  function Scheduler() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Your Weekly Availability">
          <div className="space-y-3">
            {availability.map((d) => (
              <div key={d.day} className="border rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{d.day}</div>
                  <PillButton variant="ghost" onClick={() => addRange(d.day)}>+ Range</PillButton>
                </div>
                {d.ranges.length === 0 && <div className="text-sm text-slate-500">No ranges</div>}
                <div className="space-y-2">
                  {d.ranges.map((r, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="time" value={r.start} onChange={(e) => updateRange(d.day, idx, "start", e.target.value)} className="rounded-lg border p-1 text-sm" />
                      <span className="text-slate-400">to</span>
                      <input type="time" value={r.end} onChange={(e) => updateRange(d.day, idx, "end", e.target.value)} className="rounded-lg border p-1 text-sm" />
                      <button onClick={() => removeRange(d.day, idx)} className="text-xs text-red-600 ml-2">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Matching Office Hours (by availability & calendar)">
          <div className="space-y-2 max-h-[460px] overflow-auto">
            {matches.length === 0 && <div className="text-sm text-slate-500">No matches yet. Adjust your availability or calendar.</div>}
            {matches.map((oh, i) => (
              <div key={`${oh.courseId}-${oh.id}-${i}`} className="flex items-center justify-between border rounded-xl p-3">
                <div>
                  <div className="font-medium text-slate-800">{oh.courseName}</div>
                  <div className="text-sm text-slate-600">{oh.day} {formatTime(oh.start)}–{formatTime(oh.end)} · {oh.staff} · <span className="text-slate-500">{oh.location}</span></div>
                </div>
                <PillButton onClick={() => alert("Pretend we booked a slot — next, wire to Calendar API.")}>Book</PillButton>
              </div>
            ))}
          </div>
        </Card>

        <Card title="My Events (conflicts considered)">
          <div className="space-y-2">
            {userEvents.map((b) => (<Row key={b.id} left={`${b.title}`} right={`${b.day} ${formatTime(b.start)}–${formatTime(b.end)}`} />))}
            <div className="text-xs text-slate-500">Smart scheduling avoids these times automatically.</div>
          </div>
        </Card>
      </div>
    );
  }

  function FacultyPanel() {
    const [newTpl, setNewTpl] = useState({ name: "", content: "", variables: "", budget: 8 });
    function addTemplate() {
      const vars = newTpl.variables.split(/,|\s+/).map((v) => v.trim()).filter(Boolean);
      const tpl = { id: `tpl_${Date.now()}`, name: newTpl.name || "Untitled Template", content: newTpl.content || "", variables: vars, guardrails: { citeAI: true, usageBudget: Number(newTpl.budget) || 8 } };
      setCourses((prev) => prev.map((c) => (c.id === selectedCourseId ? { ...c, templates: [tpl, ...c.templates] } : c)));
      setNewTpl({ name: "", content: "", variables: "", budget: 8 });
    }
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title={`Create Template · ${selectedCourse.code}`}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Template Name</label>
              <input className="w-full rounded-xl border border-slate-200 p-2 text-sm" value={newTpl.name} onChange={(e) => setNewTpl((s) => ({ ...s, name: e.target.value }))} placeholder="e.g., Lab Writeup Assistant" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Template Content (use {{variable}} placeholders)</label>
              <TextArea value={newTpl.content} onChange={(v) => setNewTpl((s) => ({ ...s, content: v }))} rows={8} placeholder="Summarize {{paperTopic}} in 5 bullets..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Variables (comma/space separated)</label>
                <input className="w-full rounded-xl border border-slate-200 p-2 text-sm" value={newTpl.variables} onChange={(e) => setNewTpl((s) => ({ ...s, variables: e.target.value }))} placeholder="paperTopic, dueDate, pages" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Budget</label>
                <input type="number" className="w-full rounded-xl border border-slate-200 p-2 text-sm" value={newTpl.budget} onChange={(e) => setNewTpl((s) => ({ ...s, budget: e.target.value }))} />
              </div>
            </div>
            <PillButton onClick={addTemplate}>Add Template</PillButton>
            <div className="text-xs text-slate-500">Students share equitable access; budgets are tracked in the usage log.</div>
          </div>
        </Card>

        <Card title="Existing Templates">
          <div className="space-y-2 max-h-[520px] overflow-auto">
            {selectedCourse.templates.map((t) => (
              <div key={t.id} className="border rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{t.name}</div>
                  <Tag>Budget: {t.guardrails?.usageBudget ?? 0}</Tag>
                </div>
                <div className="text-xs text-slate-500 mt-1">Vars: {t.variables.join(", ") || "(none)"}</div>
                <pre className="whitespace-pre-wrap text-sm mt-2 text-slate-700">{t.content}</pre>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Unified AI Workspace</h1>
          <div className="text-slate-500">Centralized course management · Equitable, accountable AI access</div>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
            {courses.map((c) => (<option key={c.id} value={c.id}>{c.code}</option>))}
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
            <option>Student</option>
            <option>Faculty</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {["Dashboard", "Syllabus AI", "AI Templates", "Week Calendar", "Smart Scheduler", role === "Faculty" ? "Faculty" : null]
          .filter(Boolean)
          .map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${activeTab === tab ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}>{tab}</button>
          ))}
      </div>

      {/* Content */}
      {activeTab === "Dashboard" && <Dashboard />}
      {activeTab === "Syllabus AI" && <SyllabusSummarizer />}
      {activeTab === "AI Templates" && <Templates />}
      {activeTab === "Week Calendar" && <CalendarTab />}
      {activeTab === "Smart Scheduler" && <Scheduler />}
      {activeTab === "Faculty" && role === "Faculty" && <FacultyPanel />}

      <footer className="mt-8 text-center text-xs text-slate-400">Prototype · Replace mock data with your SIS/LMS/Calendar/APIs later</footer>
    </div>
  );
}
