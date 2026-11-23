// Pure time-axis maths of the Gantt page: no DOM, no React, so it can be tested with `node --test`.
// All times are in milliseconds.

export const HOUR = 3_600_000
export const MIN = 60_000
/** An idle stretch longer than this many minutes is collapsed into a narrow break. */
export const GAP_MIN = 90
/** Width of a collapsed stretch, in px. */
export const BREAK_W = 44
/** A task shorter than this is drawn in full on the compressed axis; a longer one only by its end points. */
export const SOLID_MAX = 6 * HOUR

// Hues of the BLOCKED outline (orange) and of the "now" line (red) are left out on purpose.
export const AGENT_PALETTE = [
  '#2563eb', '#db2777', '#16a34a', '#7c3aed', '#0891b2', '#65a30d',
  '#c026d3', '#0d9488', '#4f46e5', '#0ea5e9', '#0369a1', '#475569',
]
export const NO_AGENT = '#94a3b8'

/**
 * One colour per agent. A name starts from its own hash; when an earlier name (alphabetical order) already
 * holds that colour, it takes the next free one. Stable for a given set of agents, and the agents on screen
 * never share a colour while there are colours left. Adding an agent can move the colour of one that collides.
 */
export function assignColors(names) {
  const used = new Set()
  const out = new Map()
  for (const name of [...names].sort((a, b) => a.localeCompare(b))) {
    let hash = 0
    for (const c of name) hash = (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0
    let idx = hash % AGENT_PALETTE.length
    for (let n = 0; n < AGENT_PALETTE.length && used.has(idx); n++) idx = (idx + 1) % AGENT_PALETTE.length
    used.add(idx)
    out.set(name, AGENT_PALETTE[idx])
  }
  return out
}

/** `{ unit, n }` for a length of time: the page turns it into text. */
export function splitDuration(ms) {
  const m = Math.round(ms / MIN)
  if (m < 1) return { under: true }
  if (m < 60) return { minutes: m }
  const hours = Math.floor(m / 60)
  if (hours < 48) return { hours, minutes: m % 60 }
  return { days: Math.floor(hours / 24), hours: hours % 24 }
}

/**
 * The stretches of time that are drawn.
 * - `compress` off: one stretch from the period start (or the first task, for "all") to `end`.
 * - `compress` on: a stretch around every moment where something happens, merged when closer than GAP_MIN.
 *   A task of at most SOLID_MAX is covered from its start to its end; a longer one only around its end
 *   points, so one stale open task does not cancel the compression. `ra`/`rb` are the real activity edges
 *   (without margin), used to label a break with the real idle time.
 * `view` rows: `{ start, end, startedAt? }`.
 */
export function buildSegments(view, { now, t0, end, pad, compress, gapMin = GAP_MIN }) {
  const spans = []
  for (const t of view) {
    const from = Math.max(t.start, t0)
    const to = Math.max(t.end, from)
    if (to - from <= SOLID_MAX) spans.push([from, to])
    else spans.push([from, from], [to, to])
  }
  spans.push([now, now])
  spans.sort((p, q) => p[0] - q[0])
  if (!compress) {
    const first = Number.isFinite(t0) ? t0 : spans[0][0]
    return [{ a: first - pad, b: end, ra: first, rb: end }]
  }
  const out = []
  for (const [from, to] of spans) {
    const prev = out[out.length - 1]
    if (prev && from - pad - prev.b <= gapMin * MIN) {
      prev.b = Math.max(prev.b, to + pad)
      prev.rb = Math.max(prev.rb, to)
    } else {
      out.push({ a: from - pad, b: to + pad, ra: from, rb: to })
    }
  }
  out[out.length - 1].b = Math.max(out[out.length - 1].b, end)
  return out
}

/** Pixels per hour so that the drawn time fills `viewport` px (the "fit" scale). */
export function fitPxPerHour(segments, viewport) {
  const drawnHours = segments.reduce((sum, s) => sum + (s.b - s.a) / HOUR, 0)
  const room = Math.max(300, viewport - 24 - BREAK_W * (segments.length - 1))
  return Math.min(40_000, Math.max(4, room / Math.max(drawnHours, 1 / 60)))
}

/** Gives every stretch its horizontal offset and returns `{ segments, width, x }`. */
export function layout(rawSegments, pxPerHour) {
  let cursor = 0
  const segments = rawSegments.map((s, i) => {
    const seg = { ...s, off: cursor + (i ? BREAK_W : 0) }
    cursor = seg.off + ((s.b - s.a) / HOUR) * pxPerHour
    return seg
  })
  const last = segments[segments.length - 1]
  const width = Math.max(300, last.off + ((last.b - last.a) / HOUR) * pxPerHour + 24)
  return { segments, width, x: makeX(segments, pxPerHour) }
}

/**
 * Time → px. Inside a stretch it is linear; across a break it is interpolated between the end of the
 * stretch and the start of the next, so a bar that crosses a break stays continuous.
 */
export function makeX(segments, pxPerHour) {
  return (t) => {
    if (t <= segments[0].a) return segments[0].off
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]
      if (t <= s.b) return s.off + ((t - s.a) / HOUR) * pxPerHour
      const next = segments[i + 1]
      if (next && t < next.a) {
        const endPx = s.off + ((s.b - s.a) / HOUR) * pxPerHour
        return endPx + ((t - s.b) / (next.a - s.b)) * (next.off - endPx)
      }
    }
    const last = segments[segments.length - 1]
    return last.off + ((last.b - last.a) / HOUR) * pxPerHour
  }
}

/**
 * The collapsed stretches: where to draw them and how long they really were.
 * `busy` is true when a task longer than SOLID_MAX runs across the whole break: it is not idle time then,
 * only time with no event. `view` rows: `{ start, end }`.
 */
export function buildBreaks(segments, x, view = []) {
  return segments.slice(1).map((s, i) => {
    const prev = segments[i]
    return {
      left: x(prev.b),
      width: BREAK_W,
      idle: Math.max(0, s.ra - prev.rb),
      busy: view.some((t) => t.start <= prev.rb && t.end >= s.ra),
    }
  })
}

const STEPS_MIN = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1440]
const MAX_TICKS = 1500

/** Ruler ticks: about one every 70 px, never more than MAX_TICKS in all. `isDay` marks a day boundary. */
export function buildTicks(segments, pxPerHour) {
  let stepMin = STEPS_MIN.find((m) => (m / 60) * pxPerHour >= 70) || 1440
  const drawnMin = segments.reduce((sum, s) => sum + (s.b - s.a) / MIN, 0)
  while (stepMin < 1440 && drawnMin / stepMin > MAX_TICKS) stepMin = STEPS_MIN[STEPS_MIN.indexOf(stepMin) + 1] || 1440
  const stride = stepMin < 10 ? 1 : 10
  const ticks = []
  for (const s of segments) {
    const first = new Date(s.a)
    first.setSeconds(0, 0)
    first.setMinutes(Math.floor(first.getMinutes() / stride) * stride)
    for (let t = first.getTime(); t <= s.b; t += stride * MIN) {
      if (t < s.a) continue
      const d = new Date(t)
      const minOfDay = d.getHours() * 60 + d.getMinutes()
      if (minOfDay % stepMin === 0) ticks.push({ t, isDay: stepMin >= 1440 || minOfDay === 0 })
    }
  }
  return ticks
}

/** 22:00–06:00 in the computer's time zone, as one block per night and per stretch. */
export function buildNights(segments) {
  const nights = []
  for (const s of segments) {
    const hourStart = new Date(s.a)
    hourStart.setMinutes(0, 0, 0)
    let open = null
    for (let t = hourStart.getTime(); t < s.b; t += HOUR) {
      const hr = new Date(t).getHours()
      const dark = hr >= 22 || hr < 6
      const from = Math.max(t, s.a)
      const to = Math.min(t + HOUR, s.b)
      if (dark && open) open.to = to
      else if (dark) { open = { from, to }; nights.push(open) }
      else open = null
    }
  }
  return nights
}

/**
 * Dependency arrows as SVG paths. `rows` are the visible tasks in drawing order.
 * - Child starts after the parent ends: parent end → right angle → arrow onto the start of the child bar.
 * - Child starts earlier (tasks created together): a drop from the parent's end onto the child bar, ending
 *   at the bar's edge so the arrow head points at it.
 */
export function buildArrows(rows, x, { row, barHalf = 9 }) {
  const index = new Map(rows.map((t, i) => [t.id, i]))
  const out = []
  for (const child of rows) {
    for (const dep of child.deps) {
      const pi = index.get(dep)
      if (pi === undefined) continue
      const parent = rows[pi]
      const ci = index.get(child.id)
      const x1 = x(parent.end)
      const y1 = pi * row + row / 2
      const y2 = ci * row + row / 2
      const cs = x(child.start)
      const ce = Math.max(x(child.end), cs + 8)
      let d
      if (x1 + 4 <= cs) {
        // Close to the child the elbow sits halfway, so the line never overshoots the bar and comes back.
        const gap = cs - x1
        const mid = gap >= 16 ? cs - 8 : x1 + gap / 2
        d = `M${x1} ${y1} H${mid} V${y2} H${cs}`
      } else {
        const tx = Math.min(x1, ce)
        const stop = y2 + (y2 >= y1 ? -barHalf : barHalf)
        d = y1 === y2 ? `M${x1} ${y1} H${cs}` : `M${tx} ${y1} V${stop}`
      }
      out.push({ key: `${dep}>${child.id}`, d })
    }
  }
  return out
}
