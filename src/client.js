// Browser half. Built into lib/client.js (the only file Timon serves) by `npm run build`.
import React from 'react'
import { NavLink, createTranslator, getLocale } from '@timon/ui'
import en from '../locales/en.json' with { type: 'json' }
import fr from '../locales/fr.json' with { type: 'json' }
import {
  HOUR, MIN, NO_AGENT, assignColors, splitDuration, buildSegments, fitPxPerHour, layout,
  buildBreaks, buildTicks, buildNights, buildArrows,
} from './timeline.js'

const h = React.createElement
const t = createTranslator({ en, fr })
const ROUTE = '/gantt'
const ROW = 32
const BAR_H = 18
const POLL_MS = 30_000
const STATUSES = ['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED']
const SPANS = [
  { id: '5m', hours: 5 / 60 }, { id: '15m', hours: 15 / 60 }, { id: '30m', hours: 30 / 60 },
  { id: '1h', hours: 1 }, { id: '6h', hours: 6 }, { id: '12h', hours: 12 }, { id: '24h', hours: 24 },
  { id: '2d', hours: 48 }, { id: '7d', hours: 168 }, { id: '30d', hours: 720 }, { id: 'all', hours: 0 },
]
// 0 = fit the drawn time to the width of the page; the others are a fixed number of px per hour.
const SCALES = [{ id: 'fit', v: 0 }, { id: 'tight', v: 60 }, { id: 'normal', v: 140 }, { id: 'wide', v: 320 }]

/* ─────────────────────────── Formatting ─────────────────────────── */

const formatters = new Map()
function formatter(kind) {
  const locale = getLocale()
  const key = `${locale}|${kind}`
  if (!formatters.has(key)) {
    const options = {
      when: { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
      day: { weekday: 'short', day: 'numeric', month: 'short' },
      time: { hour: '2-digit', minute: '2-digit' },
    }[kind]
    formatters.set(key, new Intl.DateTimeFormat(locale, options))
  }
  return formatters.get(key)
}

function duration(ms) {
  const d = splitDuration(ms)
  if (d.under) return t('duration.under')
  if (d.days !== undefined) return t('duration.days', { days: d.days, hours: d.hours })
  if (d.hours !== undefined) return t('duration.hours', { hours: d.hours, minutes: String(d.minutes).padStart(2, '0') })
  return t('duration.minutes', { minutes: d.minutes })
}

function describe(task, now) {
  const when = (ms) => formatter('when').format(ms)
  const lines = [task.title, [t(`status.${task.status}`), task.agent, task.project].filter(Boolean).join(' · '), t('bar.created', { when: when(task.start) })]
  if (task.startedAt !== null) {
    lines.push(t('bar.started', { when: when(task.startedAt) }))
    lines.push(t('bar.queued', { duration: duration(task.startedAt - task.start) }))
  }
  lines.push(task.open
    ? t('bar.openSince', { duration: duration(now - task.start) })
    : t('bar.closed', { when: when(task.end), duration: duration(task.end - task.start) }))
  return lines.join('\n')
}

const unique = (rows, key) => [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b))

/* ─────────────────────────── Styles ─────────────────────────── */

const css = `
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
`

const GanttIcon = ({ className }) => h('svg', { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
  h('path', { d: 'M4 5v14' }), h('rect', { x: 7, y: 5, width: 8, height: 3.5, rx: 1 }), h('rect', { x: 10, y: 10.5, width: 9, height: 3.5, rx: 1 }), h('rect', { x: 7, y: 16, width: 6, height: 3, rx: 1 }))

/* ─────────────────────────── Page ─────────────────────────── */

function Page({ ctx }) {
  const [data, setData] = React.useState(null)
  const [error, setError] = React.useState('')
  const [span, setSpan] = React.useState('24h')
  const [project, setProject] = React.useState('')
  const [pickedAgent, setAgent] = React.useState('')
  const [statuses, setStatuses] = React.useState(() => new Set(STATUSES))
  const [hideMirror, setHideMirror] = React.useState(true)
  const [compress, setCompress] = React.useState(true)
  const [zoom, setZoom] = React.useState(0)
  const [box, setBox] = React.useState(null)
  const [size, setSize] = React.useState({ vw: 1000, labelW: 280 })
  const scrolledFor = React.useRef('')
  const requestId = React.useRef(0)
  const [focusId, setFocusId] = React.useState('')

  // Several requests can overlap (a poll and a click on Refresh): only the latest one is kept.
  const load = React.useCallback(async () => {
    const mine = ++requestId.current
    try {
      const res = await ctx.api(`/tasks${hideMirror ? '' : '?mirror=1'}`, { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.detail || body?.error || `HTTP ${res.status}`)
      if (mine !== requestId.current) return
      setData(body)
      setError('')
    } catch (e) {
      if (mine === requestId.current) setError(String(e?.message || e))
    }
  }, [ctx, hideMirror])
  React.useEffect(() => {
    load()
    const poll = () => { if (document.visibilityState !== 'hidden') load() }
    const timer = setInterval(poll, POLL_MS)
    document.addEventListener('visibilitychange', poll)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', poll) }
  }, [load])

  // Width of the scrolling area: the "fit" scale depends on it.
  React.useEffect(() => {
    if (!box) return undefined
    const measure = () => setSize({ vw: box.clientWidth || 1000, labelW: window.matchMedia?.('(max-width:760px)').matches ? 150 : 280 })
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    return () => ro.disconnect()
  }, [box])

  const all = React.useMemo(() => data?.tasks || [], [data])
  const colors = React.useMemo(() => assignColors(unique(all, 'agent')), [all])
  const colorOf = (name) => colors.get(name) || NO_AGENT
  // Agents offered in the filter and the legend: only those with tasks in the selected project.
  const agents = React.useMemo(() => unique(project ? all.filter((task) => task.project === project) : all, 'agent'), [all, project])
  // A selected agent that is no longer offered (refresh, project change) stops filtering.
  const agent = agents.includes(pickedAgent) ? pickedAgent : ''
  const now = data?.now || Date.now()
  const spanHours = SPANS.find((s) => s.id === span)?.hours || 0

  const view = React.useMemo(() => {
    const from = spanHours ? now - spanHours * HOUR : null
    return all.filter((task) =>
      statuses.has(task.status) && (!project || task.project === project) && (!agent || task.agent === agent) &&
      (from === null || task.end >= from))
  }, [all, spanHours, project, agent, statuses, now])

  // Time axis.
  const t0 = spanHours ? now - spanHours * HOUR : Math.min(now - HOUR, ...view.map((task) => task.start))
  const pad = spanHours ? Math.min(10 * MIN, spanHours * HOUR * 0.03) : 10 * MIN
  const end = now + pad * 1.5
  const rawSegments = React.useMemo(
    () => buildSegments(view, { now, t0, end, pad, compress }),
    [view, now, t0, end, pad, compress])
  const pxPerHour = zoom || fitPxPerHour(rawSegments, size.vw - size.labelW)
  const { segments, width, x } = layout(rawSegments, pxPerHour)
  const breaks = buildBreaks(segments, x, view)
  const ticks = buildTicks(segments, pxPerHour)
  const nights = buildNights(segments)
  const arrows = buildArrows(view, x, { row: ROW, barHalf: BAR_H / 2 })

  // Show the present (the right end) when the data arrives or the axis changes, not at every poll.
  const axisKey = `${span}|${zoom}|${compress}|${hideMirror}`
  React.useEffect(() => {
    if (!box) { scrolledFor.current = ''; return } // the chart was removed (empty view): scroll again when it is back
    if (!data || scrolledFor.current === axisKey) return
    box.scrollLeft = box.scrollWidth
    scrolledFor.current = axisKey
  }, [box, data, axisKey])

  const toggleStatus = (s) => setStatuses((prev) => { const next = new Set(prev); next.has(s) ? next.delete(s) : next.add(s); return next })
  const bodyH = Math.max(view.length, 1) * ROW
  // One tab stop for the whole chart: the arrow keys move between the bars.
  const rovingId = view.some((task) => task.id === focusId) ? focusId : view[0]?.id
  const moveFocus = (e) => {
    const step = { ArrowDown: 1, ArrowUp: -1, Home: -Infinity, End: Infinity }[e.key]
    if (step === undefined) return
    e.preventDefault()
    const at = view.findIndex((task) => task.id === e.currentTarget.dataset.task)
    const next = view[Math.min(view.length - 1, Math.max(0, step === Infinity ? view.length - 1 : step === -Infinity ? 0 : at + step))]
    box?.querySelector(`[data-task="${CSS.escape(next.id)}"]`)?.focus()
  }
  // In "all projects" mode every row names its project, so same-named tasks of two projects can be told apart.
  const showProject = !project
  const staleError = error && data
  const truncated = (data?.truncated || []).map((s) => t(`status.${s}`)).join(', ')

  return h('div', { className: 'gt-wrap' },
    h('style', null, css),
    h('h1', null, t('title')),
    h('div', { className: 'gt-bar' },
      h('select', { value: span, onChange: (e) => setSpan(e.target.value), 'aria-label': t('filters.period') },
        SPANS.map((s) => h('option', { key: s.id, value: s.id }, t(`span.${s.id}`)))),
      h('select', { value: project, onChange: (e) => { setProject(e.target.value); setAgent('') }, 'aria-label': t('filters.project') },
        h('option', { value: '' }, t('filters.allProjects')), unique(all, 'project').map((p) => h('option', { key: p, value: p }, p))),
      h('select', { value: agent, onChange: (e) => setAgent(e.target.value), 'aria-label': t('filters.agent') },
        h('option', { value: '' }, t('filters.allAgents')), agents.map((a) => h('option', { key: a, value: a }, a))),
      h('select', { value: zoom, onChange: (e) => setZoom(Number(e.target.value)), 'aria-label': t('filters.scale') },
        SCALES.map((s) => h('option', { key: s.id, value: s.v }, t('filters.scaleOption', { name: t(`scale.${s.id}`) })))),
      h('label', null, h('input', { type: 'checkbox', checked: compress, onChange: (e) => setCompress(e.target.checked) }), ` ${t('filters.compress')}`),
      h('label', null, h('input', { type: 'checkbox', checked: hideMirror, onChange: (e) => setHideMirror(e.target.checked) }), ` ${t('filters.hideMirrors')}`),
      h('button', { onClick: load }, t('filters.refresh'))),
    h('div', { className: 'gt-legend', role: 'group', 'aria-label': t('legend.status') },
      STATUSES.map((s) =>
        h('label', { key: s, style: { cursor: 'pointer', opacity: statuses.has(s) ? 1 : 0.45 } },
          h('input', { type: 'checkbox', checked: statuses.has(s), onChange: () => toggleStatus(s), style: { marginRight: 5 } }),
          h('i', { className: `gt-sw ${s}` }), t(`status.${s}`))),
      h('span', null, t('legend.count', { count: view.length }))),
    h('div', { className: 'gt-legend', role: 'group', 'aria-label': t('legend.agents') },
      agents.map((a) =>
        h('button', {
          key: a, className: 'gt-chip', 'aria-pressed': agent === a, onClick: () => setAgent(agent === a ? '' : a),
          title: agent === a ? t('legend.showAll') : t('legend.filterOn', { agent: a }),
        }, h('i', { style: { background: colorOf(a) } }), a))),
    data?.truncated?.length ? h('div', { className: 'gt-banner', role: 'status' }, t('table.truncated', { limit: 1000, statuses: truncated })) : null,
    staleError ? h('div', { className: 'gt-banner', role: 'status' }, t('table.staleError', { message: error })) : null,
    !data && error ? h('div', { className: 'gt-empty', role: 'alert' }, t('table.error', { message: error }))
      : !data ? h('div', { className: 'gt-empty' }, t('table.loading'))
      : !view.length ? h('div', { className: 'gt-empty' }, t('table.empty'))
      : h('div', { className: 'gt-box', ref: setBox, style: { '--gt-label': `${size.labelW}px` } },
        h('div', { className: 'gt-inner' },
          h('div', { className: 'gt-labels' },
            h('div', { className: 'gt-head' }, t('table.head')),
            view.map((task) => h('div', { key: task.id, className: 'gt-label', title: showProject && task.project ? `${task.project} · ${task.title}` : task.title },
              h('i', { style: { background: colorOf(task.agent) } }), showProject && task.project ? h('span', { className: 'gt-proj', title: task.project }, task.project) : null, h('b', null, task.title), task.agent ? h('span', null, task.agent) : null))),
          h('div', { className: 'gt-canvas', style: { width } },
            h('div', { className: 'gt-ruler' },
              ticks.map((k) => h('div', { key: k.t, className: 'gt-tick', style: { left: x(k.t) } }, (k.isDay ? formatter('day') : formatter('time')).format(k.t)))),
            nights.map((n) => h('div', { key: `n${n.from}`, className: 'gt-night', style: { left: x(n.from), width: x(n.to) - x(n.from) } })),
            ticks.map((k) => h('div', { key: `g${k.t}`, className: 'gt-grid', style: { left: x(k.t) } })),
            breaks.map((b) => h('div', { key: `b${b.left}`, className: 'gt-break', style: { left: b.left, width: b.width }, title: t(b.busy ? 'break.titleBusy' : 'break.title', { idle: duration(b.idle) }) },
              h('span', null, t('break.label', { idle: duration(b.idle) })))),
            h('div', { className: 'gt-rows', style: { height: bodyH } },
              view.map((task, i) => h('div', { key: `r${task.id}`, className: 'gt-rowbg', style: { top: i * ROW } })),
              h('svg', { className: 'gt-arrows', width, height: bodyH, 'aria-hidden': true },
                h('defs', null, h('marker', { id: 'gt-head', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: 'auto' }, h('path', { d: 'M0 0 8 4 0 8Z', fill: '#64748b' }))),
                arrows.map((a) => h('path', { key: a.key, d: a.d, fill: 'none', stroke: '#64748b', strokeWidth: 1, opacity: 0.7, markerEnd: 'url(#gt-head)' }))),
              view.map((task, i) => {
                const text = describe(task, now)
                const color = colorOf(task.agent)
                const barFrom = Math.max(task.startedAt ?? task.start, t0)
                const left = x(barFrom)
                const top = i * ROW + (ROW - BAR_H) / 2
                const queueLeft = x(Math.max(task.start, t0))
                return h(React.Fragment, { key: task.id },
                  task.startedAt !== null && left - queueLeft > 1
                    ? h('div', { className: 'gt-queue', style: { left: queueLeft, width: left - queueLeft, top: top + BAR_H / 2 - 2, background: color }, 'aria-hidden': true })
                    : null,
                  h('div', {
                    className: `gt-task${task.status === 'IN_PROGRESS' ? ' live' : ''}`,
                    role: 'img', tabIndex: task.id === rovingId ? 0 : -1, 'data-task': task.id, onFocus: () => setFocusId(task.id), onKeyDown: moveFocus, 'aria-label': text.replace(/\n/g, '. '), title: text,
                    style: { left, width: Math.max(8, x(task.end) - left), top, background: color, opacity: task.status === 'PENDING' ? 0.45 : 1, ...(task.status === 'BLOCKED' ? { boxShadow: '0 0 0 2px #d97706' } : null) },
                  }))
              }),
              h('div', { className: 'gt-now', style: { left: x(now) }, title: t('table.now') }))))),
    h('p', { className: 'gt-note' }, t('note')))
}

export function apply(ctx) {
  const off = [
    ctx.slots.register({ slot: 'nav.item', key: ROUTE }, () => h(NavLink, { href: ROUTE, label: t('nav'), icon: GanttIcon })),
    ctx.slots.register({ slot: 'page', key: ROUTE }, () => h(Page, { ctx })),
  ]
  return () => off.forEach((dispose) => { try { typeof dispose === 'function' ? dispose() : dispose?.dispose?.() } catch { /* already gone */ } })
}
