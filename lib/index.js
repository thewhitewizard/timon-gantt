// Host half: reads the tasks the signed-in user may see and sends the page a flat, validated copy.
// Read only: the plugin never writes a task.

export const STATUSES = ['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED']
/** The most tasks `ctx.kanban.list` returns per call (Timon clamps larger limits to it). */
export const LIST_LIMIT = 1000

const str = (v) => (typeof v === 'string' ? v : '')
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Pure: `deps` is stored as text (a JSON array of ids, or ids separated by commas). */
export function parseDeps(raw) {
  if (Array.isArray(raw)) return raw.filter((d) => typeof d === 'string' && d)
  const text = str(raw).trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed.filter((d) => typeof d === 'string' && d)
  } catch { /* not JSON: fall through to the comma form */ }
  return text.split(/[\s,;]+/).filter(Boolean)
}

/**
 * Pure: one flat row per task, times in milliseconds.
 * A bar runs from `start` (creation) to `end`: the last update for a closed task, `now` for one still open.
 * `end` is never before `start`; unknown dependencies are dropped.
 * `startedAt` is the first dispatch when Timon reports it (the field is not documented, so it is optional);
 * it is only kept when it lies between the creation and the end. On a closed task, a value equal to the last
 * update is ignored: older history inherited `updated_at` there, so it is not a real start.
 */
export function normalizeTasks(tasks, now = Date.now()) {
  const list = (Array.isArray(tasks) ? tasks : []).filter((t) => t && typeof t.id === 'string')
  const ids = new Set(list.map((t) => t.id))
  return list
    .map((t) => {
      const status = STATUSES.includes(t.status) ? t.status : 'PENDING'
      const start = num(t.created_at) ?? now
      const closed = status === 'DONE' || status === 'BLOCKED'
      const updated = num(t.updated_at)
      const end = Math.max(start, closed ? (updated ?? start) : now)
      const began = num(t.started_at)
      return {
        id: t.id,
        title: str(t.title) || t.id,
        status,
        agent: str(t.agent_name) || null,
        project: str(t.project) || null,
        type: str(t.type) || null,
        priority: num(t.priority),
        start,
        startedAt: began !== null && began >= start && began <= end && !(closed && began === end) ? began : null,
        end,
        open: !closed,
        scheduledAt: num(t.scheduled_at),
        deps: parseDeps(t.deps).filter((d) => ids.has(d) && d !== t.id),
        mirror: t.mirror === true || t.mirror === 1,
      }
    })
    .sort((a, b) => a.start - b.start || a.title.localeCompare(b.title))
}

/** Maps a failure of `ctx.kanban` to an HTTP status, so a refusal is not reported as a gateway error. */
export function statusOfError(err) {
  if (err?.name === 'PluginCallerError' || err?.name === 'PluginPermissionError') return 403
  switch (err?.code) {
    case 'forbidden': return 403
    case 'not_found': return 404
    case 'invalid': return 400
    case 'unavailable': return 503
    default: return 502
  }
}

/**
 * Lists the tasks one status at a time: a status never pushes another one out of the limit, and open tasks
 * are never lost behind closed ones. Timon sorts by priority (highest first), then by age (oldest first), and
 * cuts at LIST_LIMIT: on a status that reaches it, the most recent tasks of low priority are the ones missing.
 * A task whose status changes while the calls run could be listed twice: the last copy read wins.
 * Returns the raw rows and the statuses that reached the limit.
 */
export async function listAll(kanban, { mirrors = false } = {}) {
  const byId = new Map()
  const truncated = []
  for (const status of STATUSES) {
    const filter = { status, limit: LIST_LIMIT }
    if (!mirrors) filter.mirror = false
    const page = await kanban.list(filter)
    for (const row of page) byId.set(row?.id ?? Symbol('no id'), row)
    if (page.length >= LIST_LIMIT) truncated.push(status)
  }
  return { rows: [...byId.values()], truncated }
}

export function apply(ctx) {
  const router = ctx.router()
  router.get('/tasks', async (req, res) => {
    try {
      const mirrors = req.query?.mirror === '1' || req.query?.mirror === 'true'
      const { rows, truncated } = await listAll(ctx.kanban, { mirrors })
      const now = Date.now()
      res.json({ now, tasks: normalizeTasks(rows, now), truncated })
    } catch (err) {
      res.status(statusOfError(err)).json({
        error: 'The tasks could not be read.',
        code: 'tasks_unreadable',
        detail: String(err?.message ?? err).slice(0, 300),
      })
    }
  })
}
