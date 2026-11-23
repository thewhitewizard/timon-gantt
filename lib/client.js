// src/client.js
import React from "react";
import { NavLink, createTranslator, getLocale } from "@timon/ui";

// locales/en.json
var en_default = {
  title: "Gantt",
  nav: "Gantt",
  filters: {
    period: "Period",
    project: "Project",
    agent: "Agent",
    scale: "Scale",
    allProjects: "All projects",
    allAgents: "All agents",
    scaleOption: "Scale: {name}",
    compress: "Collapse idle time",
    hideMirrors: "Hide mirrored tickets",
    refresh: "Refresh"
  },
  span: {
    "5m": "Last 5 minutes",
    "15m": "Last 15 minutes",
    "30m": "Last 30 minutes",
    "1h": "Last hour",
    "6h": "Last 6 hours",
    "12h": "Last 12 hours",
    "24h": "Last 24 hours",
    "2d": "Last 2 days",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    all: "All history"
  },
  scale: {
    fit: "Fit",
    tight: "Tight",
    normal: "Normal",
    wide: "Wide"
  },
  status: {
    PENDING: "Pending",
    IN_PROGRESS: "In progress",
    DONE: "Done",
    BLOCKED: "Blocked"
  },
  legend: {
    status: "Status",
    agents: "Agents",
    count: "{count, plural, one {# task} other {# tasks}}",
    filterOn: "Show only {agent}",
    showAll: "Show all agents"
  },
  table: {
    head: "Task \xB7 agent",
    now: "Now",
    loading: "Loading\u2026",
    empty: "No task in this period with these filters.",
    error: "The tasks could not be loaded: {message}",
    staleError: "The last refresh failed ({message}). The chart shows the previous data.",
    truncated: "Some tasks may be missing: Timon lists at most {limit} tasks per status (reached for: {statuses})."
  },
  bar: {
    created: "Created: {when}",
    started: "Started: {when}",
    openSince: "Open for {duration}",
    closed: "Last update: {when} ({duration} after creation)",
    queued: "Waited {duration} before starting"
  },
  break: {
    label: "\u22EF {idle}",
    title: "{idle} without activity",
    titleBusy: "{idle} compressed: a task is still running"
  },
  duration: {
    under: "< 1 min",
    minutes: "{minutes} min",
    hours: "{hours}h {minutes}m",
    days: "{days}d {hours}h"
  },
  note: "Read only. A bar runs from the task's start to its last update (up to now while it is open): this is elapsed time, not the time an agent spent working. A pale strip before a bar is the wait in the queue. Arrows link a task to the tasks that depend on it. Shaded areas: 10 pm to 6 am."
};

// locales/fr.json
var fr_default = {
  title: "Gantt",
  nav: "Gantt",
  filters: {
    period: "P\xE9riode",
    project: "Projet",
    agent: "Agent",
    scale: "\xC9chelle",
    allProjects: "Tous les projets",
    allAgents: "Tous les agents",
    scaleOption: "\xC9chelle : {name}",
    compress: "R\xE9duire les temps morts",
    hideMirrors: "Masquer les tickets miroirs",
    refresh: "Actualiser"
  },
  span: {
    "5m": "5 derni\xE8res minutes",
    "15m": "15 derni\xE8res minutes",
    "30m": "30 derni\xE8res minutes",
    "1h": "Derni\xE8re heure",
    "6h": "6 derni\xE8res heures",
    "12h": "12 derni\xE8res heures",
    "24h": "24 derni\xE8res heures",
    "2d": "2 derniers jours",
    "7d": "7 derniers jours",
    "30d": "30 derniers jours",
    all: "Tout l\u2019historique"
  },
  scale: {
    fit: "Ajust\xE9e",
    tight: "Serr\xE9e",
    normal: "Normale",
    wide: "Large"
  },
  status: {
    PENDING: "En attente",
    IN_PROGRESS: "En cours",
    DONE: "Termin\xE9e",
    BLOCKED: "Bloqu\xE9e"
  },
  legend: {
    status: "Statut",
    agents: "Agents",
    count: "{count, plural, one {# t\xE2che} other {# t\xE2ches}}",
    filterOn: "Afficher seulement {agent}",
    showAll: "Afficher tous les agents"
  },
  table: {
    head: "T\xE2che \xB7 agent",
    now: "Maintenant",
    loading: "Chargement\u2026",
    empty: "Aucune t\xE2che sur cette p\xE9riode avec ces filtres.",
    error: "Les t\xE2ches n\u2019ont pas pu \xEAtre charg\xE9es : {message}",
    staleError: "Le dernier rafra\xEEchissement a \xE9chou\xE9 ({message}). Le graphique montre les donn\xE9es pr\xE9c\xE9dentes.",
    truncated: "Des t\xE2ches peuvent manquer : Timon liste au plus {limit} t\xE2ches par statut (limite atteinte pour : {statuses})."
  },
  bar: {
    created: "Cr\xE9\xE9e : {when}",
    started: "D\xE9marr\xE9e : {when}",
    openSince: "Ouverte depuis {duration}",
    closed: "Derni\xE8re mise \xE0 jour : {when} ({duration} apr\xE8s la cr\xE9ation)",
    queued: "A attendu {duration} avant de d\xE9marrer"
  },
  break: {
    label: "\u22EF {idle}",
    title: "{idle} sans activit\xE9",
    titleBusy: "{idle} compress\xE9es : une t\xE2che est toujours en cours"
  },
  duration: {
    under: "< 1 min",
    minutes: "{minutes} min",
    hours: "{hours} h {minutes}",
    days: "{days} j {hours} h"
  },
  note: "Lecture seule. Une barre va du d\xE9but de la t\xE2che \xE0 sa derni\xE8re mise \xE0 jour (jusqu\u2019\xE0 maintenant tant qu\u2019elle est ouverte) : c\u2019est le temps \xE9coul\xE9, pas le temps de travail de l\u2019agent. Une bande p\xE2le avant une barre est l\u2019attente dans la file. Les fl\xE8ches relient une t\xE2che \xE0 celles qui en d\xE9pendent. Zones gris\xE9es : de 22 h \xE0 6 h."
};

// src/timeline.js
var HOUR = 36e5;
var MIN = 6e4;
var GAP_MIN = 90;
var BREAK_W = 44;
var SOLID_MAX = 6 * HOUR;
var AGENT_PALETTE = [
  "#2563eb",
  "#db2777",
  "#16a34a",
  "#7c3aed",
  "#0891b2",
  "#65a30d",
  "#c026d3",
  "#0d9488",
  "#4f46e5",
  "#0ea5e9",
  "#0369a1",
  "#475569"
];
var NO_AGENT = "#94a3b8";
function assignColors(names) {
  const used = /* @__PURE__ */ new Set();
  const out = /* @__PURE__ */ new Map();
  for (const name of [...names].sort((a, b) => a.localeCompare(b))) {
    let hash = 0;
    for (const c of name) hash = Math.imul(hash, 31) + c.charCodeAt(0) >>> 0;
    let idx = hash % AGENT_PALETTE.length;
    for (let n = 0; n < AGENT_PALETTE.length && used.has(idx); n++) idx = (idx + 1) % AGENT_PALETTE.length;
    used.add(idx);
    out.set(name, AGENT_PALETTE[idx]);
  }
  return out;
}
function splitDuration(ms) {
  const m = Math.round(ms / MIN);
  if (m < 1) return { under: true };
  if (m < 60) return { minutes: m };
  const hours = Math.floor(m / 60);
  if (hours < 48) return { hours, minutes: m % 60 };
  return { days: Math.floor(hours / 24), hours: hours % 24 };
}
function buildSegments(view, { now, t0, end, pad, compress, gapMin = GAP_MIN }) {
  const spans = [];
  for (const t2 of view) {
    const from = Math.max(t2.start, t0);
    const to = Math.max(t2.end, from);
    if (to - from <= SOLID_MAX) spans.push([from, to]);
    else spans.push([from, from], [to, to]);
  }
  spans.push([now, now]);
  spans.sort((p, q) => p[0] - q[0]);
  if (!compress) {
    const first = Number.isFinite(t0) ? t0 : spans[0][0];
    return [{ a: first - pad, b: end, ra: first, rb: end }];
  }
  const out = [];
  for (const [from, to] of spans) {
    const prev = out[out.length - 1];
    if (prev && from - pad - prev.b <= gapMin * MIN) {
      prev.b = Math.max(prev.b, to + pad);
      prev.rb = Math.max(prev.rb, to);
    } else {
      out.push({ a: from - pad, b: to + pad, ra: from, rb: to });
    }
  }
  out[out.length - 1].b = Math.max(out[out.length - 1].b, end);
  return out;
}
function fitPxPerHour(segments, viewport) {
  const drawnHours = segments.reduce((sum, s) => sum + (s.b - s.a) / HOUR, 0);
  const room = Math.max(300, viewport - 24 - BREAK_W * (segments.length - 1));
  return Math.min(4e4, Math.max(4, room / Math.max(drawnHours, 1 / 60)));
}
function layout(rawSegments, pxPerHour) {
  let cursor = 0;
  const segments = rawSegments.map((s, i) => {
    const seg = { ...s, off: cursor + (i ? BREAK_W : 0) };
    cursor = seg.off + (s.b - s.a) / HOUR * pxPerHour;
    return seg;
  });
  const last = segments[segments.length - 1];
  const width = Math.max(300, last.off + (last.b - last.a) / HOUR * pxPerHour + 24);
  return { segments, width, x: makeX(segments, pxPerHour) };
}
function makeX(segments, pxPerHour) {
  return (t2) => {
    if (t2 <= segments[0].a) return segments[0].off;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (t2 <= s.b) return s.off + (t2 - s.a) / HOUR * pxPerHour;
      const next = segments[i + 1];
      if (next && t2 < next.a) {
        const endPx = s.off + (s.b - s.a) / HOUR * pxPerHour;
        return endPx + (t2 - s.b) / (next.a - s.b) * (next.off - endPx);
      }
    }
    const last = segments[segments.length - 1];
    return last.off + (last.b - last.a) / HOUR * pxPerHour;
  };
}
function buildBreaks(segments, x, view = []) {
  return segments.slice(1).map((s, i) => {
    const prev = segments[i];
    return {
      left: x(prev.b),
      width: BREAK_W,
      idle: Math.max(0, s.ra - prev.rb),
      busy: view.some((t2) => t2.start <= prev.rb && t2.end >= s.ra)
    };
  });
}
var STEPS_MIN = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1440];
var MAX_TICKS = 1500;
function buildTicks(segments, pxPerHour) {
  let stepMin = STEPS_MIN.find((m) => m / 60 * pxPerHour >= 70) || 1440;
  const drawnMin = segments.reduce((sum, s) => sum + (s.b - s.a) / MIN, 0);
  while (stepMin < 1440 && drawnMin / stepMin > MAX_TICKS) stepMin = STEPS_MIN[STEPS_MIN.indexOf(stepMin) + 1] || 1440;
  const stride = stepMin < 10 ? 1 : 10;
  const ticks = [];
  for (const s of segments) {
    const first = new Date(s.a);
    first.setSeconds(0, 0);
    first.setMinutes(Math.floor(first.getMinutes() / stride) * stride);
    for (let t2 = first.getTime(); t2 <= s.b; t2 += stride * MIN) {
      if (t2 < s.a) continue;
      const d = new Date(t2);
      const minOfDay = d.getHours() * 60 + d.getMinutes();
      if (minOfDay % stepMin === 0) ticks.push({ t: t2, isDay: stepMin >= 1440 || minOfDay === 0 });
    }
  }
  return ticks;
}
function buildNights(segments) {
  const nights = [];
  for (const s of segments) {
    const hourStart = new Date(s.a);
    hourStart.setMinutes(0, 0, 0);
    let open = null;
    for (let t2 = hourStart.getTime(); t2 < s.b; t2 += HOUR) {
      const hr = new Date(t2).getHours();
      const dark = hr >= 22 || hr < 6;
      const from = Math.max(t2, s.a);
      const to = Math.min(t2 + HOUR, s.b);
      if (dark && open) open.to = to;
      else if (dark) {
        open = { from, to };
        nights.push(open);
      } else open = null;
    }
  }
  return nights;
}
function buildArrows(rows, x, { row, barHalf = 9 }) {
  const index = new Map(rows.map((t2, i) => [t2.id, i]));
  const out = [];
  for (const child of rows) {
    for (const dep of child.deps) {
      const pi = index.get(dep);
      if (pi === void 0) continue;
      const parent = rows[pi];
      const ci = index.get(child.id);
      const x1 = x(parent.end);
      const y1 = pi * row + row / 2;
      const y2 = ci * row + row / 2;
      const cs = x(child.start);
      const ce = Math.max(x(child.end), cs + 8);
      let d;
      if (x1 + 4 <= cs) {
        const gap = cs - x1;
        const mid = gap >= 16 ? cs - 8 : x1 + gap / 2;
        d = `M${x1} ${y1} H${mid} V${y2} H${cs}`;
      } else {
        const tx = Math.min(x1, ce);
        const stop = y2 + (y2 >= y1 ? -barHalf : barHalf);
        d = y1 === y2 ? `M${x1} ${y1} H${cs}` : `M${tx} ${y1} V${stop}`;
      }
      out.push({ key: `${dep}>${child.id}`, d });
    }
  }
  return out;
}

// src/client.js
var h = React.createElement;
var t = createTranslator({ en: en_default, fr: fr_default });
var ROUTE = "/gantt";
var ROW = 32;
var BAR_H = 18;
var POLL_MS = 3e4;
var STATUSES = ["PENDING", "IN_PROGRESS", "DONE", "BLOCKED"];
var SPANS = [
  { id: "5m", hours: 5 / 60 },
  { id: "15m", hours: 15 / 60 },
  { id: "30m", hours: 30 / 60 },
  { id: "1h", hours: 1 },
  { id: "6h", hours: 6 },
  { id: "12h", hours: 12 },
  { id: "24h", hours: 24 },
  { id: "2d", hours: 48 },
  { id: "7d", hours: 168 },
  { id: "30d", hours: 720 },
  { id: "all", hours: 0 }
];
var SCALES = [{ id: "fit", v: 0 }, { id: "tight", v: 60 }, { id: "normal", v: 140 }, { id: "wide", v: 320 }];
var formatters = /* @__PURE__ */ new Map();
function formatter(kind) {
  const locale = getLocale();
  const key = `${locale}|${kind}`;
  if (!formatters.has(key)) {
    const options = {
      when: { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
      day: { weekday: "short", day: "numeric", month: "short" },
      time: { hour: "2-digit", minute: "2-digit" }
    }[kind];
    formatters.set(key, new Intl.DateTimeFormat(locale, options));
  }
  return formatters.get(key);
}
function duration(ms) {
  const d = splitDuration(ms);
  if (d.under) return t("duration.under");
  if (d.days !== void 0) return t("duration.days", { days: d.days, hours: d.hours });
  if (d.hours !== void 0) return t("duration.hours", { hours: d.hours, minutes: String(d.minutes).padStart(2, "0") });
  return t("duration.minutes", { minutes: d.minutes });
}
function describe(task, now) {
  const when = (ms) => formatter("when").format(ms);
  const lines = [task.title, [t(`status.${task.status}`), task.agent, task.project].filter(Boolean).join(" \xB7 "), t("bar.created", { when: when(task.start) })];
  if (task.startedAt !== null) {
    lines.push(t("bar.started", { when: when(task.startedAt) }));
    lines.push(t("bar.queued", { duration: duration(task.startedAt - task.start) }));
  }
  lines.push(task.open ? t("bar.openSince", { duration: duration(now - task.start) }) : t("bar.closed", { when: when(task.end), duration: duration(task.end - task.start) }));
  return lines.join("\n");
}
var unique = (rows, key) => [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
var css = `
.gt-wrap{display:grid;gap:14px;padding:20px;max-width:100%}
.gt-wrap h1{margin:0;font-size:22px}
.gt-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:14px}
.gt-bar select,.gt-bar button{font:inherit;font-size:14px;color:hsl(var(--foreground));background:hsl(var(--background));border:1px solid hsl(var(--border));border-radius:8px;padding:6px 10px;cursor:pointer}
.gt-legend{display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:13px;color:hsl(var(--muted-foreground))}
.gt-legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.gt-sw{background:#64748b}
.gt-sw.PENDING{opacity:.4}
.gt-sw.IN_PROGRESS{background-image:linear-gradient(110deg,rgb(255 255 255 / .45) 25%,transparent 25% 50%,rgb(255 255 255 / .45) 50% 75%,transparent 75%);background-size:8px 8px}
.gt-sw.BLOCKED{background:transparent;box-shadow:inset 0 0 0 2px #d97706}
.gt-chip{font:inherit;font-size:12px;display:inline-flex;align-items:center;padding:2px 9px;border-radius:999px;border:1px solid hsl(var(--border));background:none;color:hsl(var(--foreground));cursor:pointer}
.gt-chip[aria-pressed=true]{border-color:hsl(var(--foreground));font-weight:600}
.gt-box{overflow:auto;border:1px solid hsl(var(--border));border-radius:12px;max-height:calc(100vh - 260px)}
.gt-inner{display:flex}
.gt-labels{position:sticky;left:0;z-index:5;flex:none;width:var(--gt-label);border-right:1px solid hsl(var(--border));background:hsl(var(--background))}
.gt-head{height:40px;position:sticky;top:0;z-index:6;display:flex;align-items:center;padding:0 12px;border-bottom:1px solid hsl(var(--border));font-size:12px;color:hsl(var(--muted-foreground));background:hsl(var(--background))}
.gt-label{height:${ROW}px;display:flex;align-items:center;gap:8px;padding:0 12px;font-size:13px;white-space:nowrap;overflow:hidden;border-bottom:1px solid hsl(var(--border) / .5)}
.gt-label i{width:9px;height:9px;border-radius:50%;flex:none}
.gt-label b{font-weight:500;flex:1 1 45%;min-width:3em;overflow:hidden;text-overflow:ellipsis}
.gt-label .gt-proj{font-size:11px;font-weight:600;flex:0 1 auto;min-width:0;max-width:30%;overflow:hidden;text-overflow:ellipsis;padding:1px 6px;border-radius:4px;background:hsl(var(--muted));color:hsl(var(--muted-foreground))}
.gt-label span{font-size:11px;color:hsl(var(--muted-foreground));flex:0 1 auto;min-width:0;max-width:30%;overflow:hidden;text-overflow:ellipsis}
@media (max-width:760px){.gt-label .gt-proj{display:none}}
.gt-canvas{position:relative;flex:none}
.gt-ruler{height:40px;position:sticky;top:0;z-index:4;background:hsl(var(--background));border-bottom:1px solid hsl(var(--border))}
.gt-tick{position:absolute;top:0;bottom:0;border-left:1px solid hsl(var(--border));font-size:11px;padding:3px 0 0 4px;color:hsl(var(--muted-foreground));white-space:nowrap}
.gt-grid{position:absolute;top:40px;bottom:0;border-left:1px solid hsl(var(--border) / .4)}
.gt-night{position:absolute;top:40px;bottom:0;background:hsl(var(--muted) / .45)}
.gt-break{position:absolute;top:40px;bottom:0;z-index:1;background:repeating-linear-gradient(135deg,hsl(var(--muted) / .7) 0 6px,transparent 6px 12px);border-left:1px dashed hsl(var(--border));border-right:1px dashed hsl(var(--border))}
.gt-break span{position:absolute;top:2px;left:50%;transform:translateX(-50%);font-size:10px;color:hsl(var(--muted-foreground));background:hsl(var(--background));padding:0 3px;white-space:nowrap}
.gt-rows{position:relative}
.gt-rowbg{position:absolute;left:0;right:0;height:${ROW}px;border-bottom:1px solid hsl(var(--border) / .5)}
.gt-task{position:absolute;z-index:2;height:${BAR_H}px;border-radius:5px;min-width:8px;box-shadow:inset 0 0 0 1px rgb(0 0 0 / .12)}
.gt-task:focus-visible{outline:2px solid hsl(var(--foreground));outline-offset:2px}
.gt-task.live{background-image:linear-gradient(110deg,rgb(255 255 255 / .25) 25%,transparent 25% 50%,rgb(255 255 255 / .25) 50% 75%,transparent 75%);background-size:14px 14px}
.gt-queue{position:absolute;z-index:2;height:4px;border-radius:2px;opacity:.35}
.gt-now{position:absolute;top:0;bottom:0;z-index:3;border-left:2px solid #dc2626}
.gt-arrows{position:absolute;left:0;top:0;pointer-events:none;overflow:visible}
.gt-empty{padding:30px;text-align:center;color:hsl(var(--muted-foreground))}
.gt-banner{padding:8px 12px;border:1px solid #d97706;border-radius:8px;font-size:13px}
.gt-note{font-size:12px;color:hsl(var(--muted-foreground));margin:0}
`;
var GanttIcon = ({ className }) => h(
  "svg",
  { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true },
  h("path", { d: "M4 5v14" }),
  h("rect", { x: 7, y: 5, width: 8, height: 3.5, rx: 1 }),
  h("rect", { x: 10, y: 10.5, width: 9, height: 3.5, rx: 1 }),
  h("rect", { x: 7, y: 16, width: 6, height: 3, rx: 1 })
);
function Page({ ctx }) {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState("");
  const [span, setSpan] = React.useState("24h");
  const [project, setProject] = React.useState("");
  const [agent, setAgent] = React.useState("");
  const [statuses, setStatuses] = React.useState(() => new Set(STATUSES));
  const [hideMirror, setHideMirror] = React.useState(true);
  const [compress, setCompress] = React.useState(true);
  const [zoom, setZoom] = React.useState(0);
  const [box, setBox] = React.useState(null);
  const [size, setSize] = React.useState({ vw: 1e3, labelW: 280 });
  const scrolledFor = React.useRef("");
  const requestId = React.useRef(0);
  const [focusId, setFocusId] = React.useState("");
  const load = React.useCallback(async () => {
    const mine = ++requestId.current;
    try {
      const res = await ctx.api(`/tasks${hideMirror ? "" : "?mirror=1"}`, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.detail || body?.error || `HTTP ${res.status}`);
      if (mine !== requestId.current) return;
      setData(body);
      setError("");
    } catch (e) {
      if (mine === requestId.current) setError(String(e?.message || e));
    }
  }, [ctx, hideMirror]);
  React.useEffect(() => {
    load();
    const poll = () => {
      if (document.visibilityState !== "hidden") load();
    };
    const timer = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [load]);
  React.useEffect(() => {
    if (!box) return void 0;
    const measure = () => setSize({ vw: box.clientWidth || 1e3, labelW: window.matchMedia?.("(max-width:760px)").matches ? 150 : 280 });
    measure();
    if (typeof ResizeObserver === "undefined") return void 0;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [box]);
  const all = React.useMemo(() => data?.tasks || [], [data]);
  const colors = React.useMemo(() => assignColors(unique(all, "agent")), [all]);
  const colorOf = (name) => colors.get(name) || NO_AGENT;
  const agents = React.useMemo(() => unique(project ? all.filter((task) => task.project === project) : all, "agent"), [all, project]);
  const now = data?.now || Date.now();
  const spanHours = SPANS.find((s) => s.id === span)?.hours || 0;
  const view = React.useMemo(() => {
    const from = spanHours ? now - spanHours * HOUR : null;
    return all.filter((task) => statuses.has(task.status) && (!project || task.project === project) && (!agent || task.agent === agent) && (from === null || task.end >= from));
  }, [all, spanHours, project, agent, statuses, now]);
  const t0 = spanHours ? now - spanHours * HOUR : Math.min(now - HOUR, ...view.map((task) => task.start));
  const pad = spanHours ? Math.min(10 * MIN, spanHours * HOUR * 0.03) : 10 * MIN;
  const end = now + pad * 1.5;
  const rawSegments = React.useMemo(
    () => buildSegments(view, { now, t0, end, pad, compress }),
    [view, now, t0, end, pad, compress]
  );
  const pxPerHour = zoom || fitPxPerHour(rawSegments, size.vw - size.labelW);
  const { segments, width, x } = layout(rawSegments, pxPerHour);
  const breaks = buildBreaks(segments, x, view);
  const ticks = buildTicks(segments, pxPerHour);
  const nights = buildNights(segments);
  const arrows = buildArrows(view, x, { row: ROW, barHalf: BAR_H / 2 });
  const axisKey = `${span}|${zoom}|${compress}|${hideMirror}`;
  React.useEffect(() => {
    if (!box) {
      scrolledFor.current = "";
      return;
    }
    if (!data || scrolledFor.current === axisKey) return;
    box.scrollLeft = box.scrollWidth;
    scrolledFor.current = axisKey;
  }, [box, data, axisKey]);
  const toggleStatus = (s) => setStatuses((prev) => {
    const next = new Set(prev);
    next.has(s) ? next.delete(s) : next.add(s);
    return next;
  });
  const bodyH = Math.max(view.length, 1) * ROW;
  const rovingId = view.some((task) => task.id === focusId) ? focusId : view[0]?.id;
  const moveFocus = (e) => {
    const step = { ArrowDown: 1, ArrowUp: -1, Home: -Infinity, End: Infinity }[e.key];
    if (step === void 0) return;
    e.preventDefault();
    const at = view.findIndex((task) => task.id === e.currentTarget.dataset.task);
    const next = view[Math.min(view.length - 1, Math.max(0, step === Infinity ? view.length - 1 : step === -Infinity ? 0 : at + step))];
    box?.querySelector(`[data-task="${CSS.escape(next.id)}"]`)?.focus();
  };
  const showProject = !project;
  const staleError = error && data;
  const truncated = (data?.truncated || []).map((s) => t(`status.${s}`)).join(", ");
  return h(
    "div",
    { className: "gt-wrap" },
    h("style", null, css),
    h("h1", null, t("title")),
    h(
      "div",
      { className: "gt-bar" },
      h(
        "select",
        { value: span, onChange: (e) => setSpan(e.target.value), "aria-label": t("filters.period") },
        SPANS.map((s) => h("option", { key: s.id, value: s.id }, t(`span.${s.id}`)))
      ),
      h(
        "select",
        { value: project, onChange: (e) => {
          setProject(e.target.value);
          setAgent("");
        }, "aria-label": t("filters.project") },
        h("option", { value: "" }, t("filters.allProjects")),
        unique(all, "project").map((p) => h("option", { key: p, value: p }, p))
      ),
      h(
        "select",
        { value: agent, onChange: (e) => setAgent(e.target.value), "aria-label": t("filters.agent") },
        h("option", { value: "" }, t("filters.allAgents")),
        agents.map((a) => h("option", { key: a, value: a }, a))
      ),
      h(
        "select",
        { value: zoom, onChange: (e) => setZoom(Number(e.target.value)), "aria-label": t("filters.scale") },
        SCALES.map((s) => h("option", { key: s.id, value: s.v }, t("filters.scaleOption", { name: t(`scale.${s.id}`) })))
      ),
      h("label", null, h("input", { type: "checkbox", checked: compress, onChange: (e) => setCompress(e.target.checked) }), ` ${t("filters.compress")}`),
      h("label", null, h("input", { type: "checkbox", checked: hideMirror, onChange: (e) => setHideMirror(e.target.checked) }), ` ${t("filters.hideMirrors")}`),
      h("button", { onClick: load }, t("filters.refresh"))
    ),
    h(
      "div",
      { className: "gt-legend", role: "group", "aria-label": t("legend.status") },
      STATUSES.map((s) => h(
        "label",
        { key: s, style: { cursor: "pointer", opacity: statuses.has(s) ? 1 : 0.45 } },
        h("input", { type: "checkbox", checked: statuses.has(s), onChange: () => toggleStatus(s), style: { marginRight: 5 } }),
        h("i", { className: `gt-sw ${s}` }),
        t(`status.${s}`)
      )),
      h("span", null, t("legend.count", { count: view.length }))
    ),
    h(
      "div",
      { className: "gt-legend", role: "group", "aria-label": t("legend.agents") },
      agents.map((a) => h("button", {
        key: a,
        className: "gt-chip",
        "aria-pressed": agent === a,
        onClick: () => setAgent(agent === a ? "" : a),
        title: agent === a ? t("legend.showAll") : t("legend.filterOn", { agent: a })
      }, h("i", { style: { background: colorOf(a) } }), a))
    ),
    data?.truncated?.length ? h("div", { className: "gt-banner", role: "status" }, t("table.truncated", { limit: 1e3, statuses: truncated })) : null,
    staleError ? h("div", { className: "gt-banner", role: "status" }, t("table.staleError", { message: error })) : null,
    !data && error ? h("div", { className: "gt-empty", role: "alert" }, t("table.error", { message: error })) : !data ? h("div", { className: "gt-empty" }, t("table.loading")) : !view.length ? h("div", { className: "gt-empty" }, t("table.empty")) : h(
      "div",
      { className: "gt-box", ref: setBox, style: { "--gt-label": `${size.labelW}px` } },
      h(
        "div",
        { className: "gt-inner" },
        h(
          "div",
          { className: "gt-labels" },
          h("div", { className: "gt-head" }, t("table.head")),
          view.map((task) => h(
            "div",
            { key: task.id, className: "gt-label", title: showProject && task.project ? `${task.project} \xB7 ${task.title}` : task.title },
            h("i", { style: { background: colorOf(task.agent) } }),
            showProject && task.project ? h("span", { className: "gt-proj", title: task.project }, task.project) : null,
            h("b", null, task.title),
            task.agent ? h("span", null, task.agent) : null
          ))
        ),
        h(
          "div",
          { className: "gt-canvas", style: { width } },
          h(
            "div",
            { className: "gt-ruler" },
            ticks.map((k) => h("div", { key: k.t, className: "gt-tick", style: { left: x(k.t) } }, (k.isDay ? formatter("day") : formatter("time")).format(k.t)))
          ),
          nights.map((n) => h("div", { key: `n${n.from}`, className: "gt-night", style: { left: x(n.from), width: x(n.to) - x(n.from) } })),
          ticks.map((k) => h("div", { key: `g${k.t}`, className: "gt-grid", style: { left: x(k.t) } })),
          breaks.map((b) => h(
            "div",
            { key: `b${b.left}`, className: "gt-break", style: { left: b.left, width: b.width }, title: t(b.busy ? "break.titleBusy" : "break.title", { idle: duration(b.idle) }) },
            h("span", null, t("break.label", { idle: duration(b.idle) }))
          )),
          h(
            "div",
            { className: "gt-rows", style: { height: bodyH } },
            view.map((task, i) => h("div", { key: `r${task.id}`, className: "gt-rowbg", style: { top: i * ROW } })),
            h(
              "svg",
              { className: "gt-arrows", width, height: bodyH, "aria-hidden": true },
              h("defs", null, h("marker", { id: "gt-head", viewBox: "0 0 8 8", refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: "auto" }, h("path", { d: "M0 0 8 4 0 8Z", fill: "#64748b" }))),
              arrows.map((a) => h("path", { key: a.key, d: a.d, fill: "none", stroke: "#64748b", strokeWidth: 1, opacity: 0.7, markerEnd: "url(#gt-head)" }))
            ),
            view.map((task, i) => {
              const text = describe(task, now);
              const color = colorOf(task.agent);
              const barFrom = Math.max(task.startedAt ?? task.start, t0);
              const left = x(barFrom);
              const top = i * ROW + (ROW - BAR_H) / 2;
              const queueLeft = x(Math.max(task.start, t0));
              return h(
                React.Fragment,
                { key: task.id },
                task.startedAt !== null && left - queueLeft > 1 ? h("div", { className: "gt-queue", style: { left: queueLeft, width: left - queueLeft, top: top + BAR_H / 2 - 2, background: color }, "aria-hidden": true }) : null,
                h("div", {
                  className: `gt-task${task.status === "IN_PROGRESS" ? " live" : ""}`,
                  role: "img",
                  tabIndex: task.id === rovingId ? 0 : -1,
                  "data-task": task.id,
                  onFocus: () => setFocusId(task.id),
                  onKeyDown: moveFocus,
                  "aria-label": text.replace(/\n/g, ". "),
                  title: text,
                  style: { left, width: Math.max(8, x(task.end) - left), top, background: color, opacity: task.status === "PENDING" ? 0.45 : 1, ...task.status === "BLOCKED" ? { boxShadow: "0 0 0 2px #d97706" } : null }
                })
              );
            }),
            h("div", { className: "gt-now", style: { left: x(now) }, title: t("table.now") })
          )
        )
      )
    ),
    h("p", { className: "gt-note" }, t("note"))
  );
}
function apply(ctx) {
  const off = [
    ctx.slots.register({ slot: "nav.item", key: ROUTE }, () => h(NavLink, { href: ROUTE, label: t("nav"), icon: GanttIcon })),
    ctx.slots.register({ slot: "page", key: ROUTE }, () => h(Page, { ctx }))
  ];
  return () => off.forEach((dispose) => {
    try {
      typeof dispose === "function" ? dispose() : dispose?.dispose?.();
    } catch {
    }
  });
}
export {
  apply
};
