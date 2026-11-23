import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeTasks, parseDeps, listAll, statusOfError, LIST_LIMIT, STATUSES } from '../lib/index.js'

const HOUR = 3_600_000

test('parseDeps reads a JSON array, a comma list, and nothing', () => {
  assert.deepEqual(parseDeps('["a","b"]'), ['a', 'b'])
  assert.deepEqual(parseDeps('a, b;c'), ['a', 'b', 'c'])
  assert.deepEqual(parseDeps(''), [])
  assert.deepEqual(parseDeps(null), [])
  assert.deepEqual(parseDeps(['x', 3, '']), ['x'])
})

test('closed tasks end at their last update, open ones at now', () => {
  const now = 100 * HOUR
  const rows = normalizeTasks([
    { id: 'a', title: 'A', status: 'DONE', created_at: 10 * HOUR, updated_at: 12 * HOUR },
    { id: 'b', title: 'B', status: 'IN_PROGRESS', created_at: 20 * HOUR, updated_at: 21 * HOUR },
  ], now)
  assert.equal(rows[0].end, 12 * HOUR)
  assert.equal(rows[0].open, false)
  assert.equal(rows[1].end, now)
  assert.equal(rows[1].open, true)
})

test('a bar never ends before it starts; unknown dependencies and self links are dropped', () => {
  const rows = normalizeTasks([
    { id: 'a', status: 'DONE', created_at: 50, updated_at: 10 },
    { id: 'b', status: 'PENDING', created_at: 60, deps: '["a","ghost","b"]' },
  ], 1000)
  assert.equal(rows[0].end, 50)
  assert.deepEqual(rows[1].deps, ['a'])
})

test('rows are sorted by start and bad input is tolerated', () => {
  const rows = normalizeTasks([
    { id: 'late', title: 'L', created_at: 30 }, { id: 'early', title: 'E', created_at: 5 }, null, { title: 'no id' },
  ], 100)
  assert.deepEqual(rows.map((r) => r.id), ['early', 'late'])
  assert.deepEqual(normalizeTasks(undefined), [])
  assert.equal(normalizeTasks([{ id: 'x', status: 'WEIRD' }], 1)[0].status, 'PENDING')
})

test('startedAt is kept only when it lies between creation and the end', () => {
  const now = 1000
  const rows = normalizeTasks([
    { id: 'ok', status: 'DONE', created_at: 100, started_at: 200, updated_at: 300 },
    { id: 'before', status: 'DONE', created_at: 100, started_at: 50, updated_at: 300 },
    { id: 'after', status: 'DONE', created_at: 100, started_at: 900, updated_at: 300 },
    { id: 'none', status: 'DONE', created_at: 100, updated_at: 300 },
  ], now)
  const by = Object.fromEntries(rows.map((r) => [r.id, r.startedAt]))
  assert.deepEqual(by, { ok: 200, before: null, after: null, none: null })
})

test('startedAt equal to the last update of a closed task is treated as inherited and dropped', () => {
  const rows = normalizeTasks([
    { id: 'old', status: 'DONE', created_at: 100, started_at: 300, updated_at: 300 },
    { id: 'real', status: 'DONE', created_at: 100, started_at: 200, updated_at: 300 },
    { id: 'open', status: 'IN_PROGRESS', created_at: 100, started_at: 200, updated_at: 200 },
  ], 1000)
  const by = Object.fromEntries(rows.map((r) => [r.id, r.startedAt]))
  assert.deepEqual(by, { old: null, real: 200, open: 200 })
})

test('listAll asks status by status, excludes mirrors by default and reports a full page', async () => {
  const calls = []
  const kanban = {
    list: async (filter) => {
      calls.push(filter)
      const count = filter.status === 'DONE' ? LIST_LIMIT : 2
      return Array.from({ length: count }, (_, i) => ({ id: `${filter.status}-${i}`, status: filter.status }))
    },
  }
  const { rows, truncated } = await listAll(kanban)
  assert.deepEqual(calls.map((c) => c.status), STATUSES)
  assert.ok(calls.every((c) => c.mirror === false && c.limit === LIST_LIMIT))
  assert.equal(rows.length, LIST_LIMIT + 6)
  assert.deepEqual(truncated, ['DONE'])

  calls.length = 0
  await listAll(kanban, { mirrors: true })
  assert.ok(calls.every((c) => !('mirror' in c)))
})

test('listAll keeps one copy of a task that changed status between two calls', async () => {
  const kanban = {
    list: async ({ status }) => (status === 'PENDING' || status === 'IN_PROGRESS'
      ? [{ id: 'moved', status }, { id: `only-${status}`, status }]
      : []),
  }
  const { rows } = await listAll(kanban)
  assert.deepEqual(rows.map((r) => r.id).sort(), ['moved', 'only-IN_PROGRESS', 'only-PENDING'])
  assert.equal(rows.find((r) => r.id === 'moved').status, 'IN_PROGRESS')
})

test('statusOfError does not report a refusal as a gateway error', () => {
  const named = (name) => Object.assign(new Error('x'), { name })
  assert.equal(statusOfError(named('PluginPermissionError')), 403)
  assert.equal(statusOfError(named('PluginCallerError')), 403)
  assert.equal(statusOfError({ code: 'unavailable' }), 503)
  assert.equal(statusOfError({ code: 'forbidden' }), 403)
  assert.equal(statusOfError({ code: 'not_found' }), 404)
  assert.equal(statusOfError({ code: 'invalid' }), 400)
  assert.equal(statusOfError(new Error('boom')), 502)
})
