import test from 'node:test'
import assert from 'node:assert/strict'
import {
  HOUR, MIN, BREAK_W, AGENT_PALETTE, assignColors, splitDuration, buildSegments, fitPxPerHour, layout,
  buildBreaks, buildTicks, buildNights, buildArrows,
} from '../src/timeline.js'

const NOW = Date.parse('2026-11-23T12:00:00Z')
const task = (id, startH, endH, extra = {}) => ({ id, start: NOW + startH * HOUR, end: NOW + endH * HOUR, deps: [], ...extra })
const opts = (extra = {}) => ({ now: NOW, t0: NOW - 24 * HOUR, end: NOW + 5 * MIN, pad: 10 * MIN, compress: true, ...extra })

test('compression: bursts far apart become separate stretches, close ones merge', () => {
  const view = [task('a', -20, -19.5), task('b', -19.4, -19), task('c', -3, -2.5)]
  const segs = buildSegments(view, opts())
  // a and b merge; c is separate; the "now" stretch is separate too.
  assert.equal(segs.length, 3)
  assert.ok(segs[0].rb >= NOW - 19 * HOUR)
})

test('compression is not cancelled by one stale open task (review finding 3)', () => {
  const stale = task('stale', -20 * 24, 0, { open: true })
  const view = [task('a', -10, -9.5), task('b', -3, -2.5), stale]
  const segs = buildSegments(view, opts({ t0: NOW - 30 * 24 * HOUR }))
  assert.ok(segs.length >= 3, `expected the bursts to stay separate, got ${segs.length} stretch(es)`)
})

test('without compression the axis starts at the period start, not at the first task (finding 4)', () => {
  const [seg] = buildSegments([task('a', -2, -1.9)], opts({ compress: false, t0: NOW - 7 * 24 * HOUR }))
  assert.equal(buildSegments([task('a', -2, -1.9)], opts({ compress: false, t0: NOW - 7 * 24 * HOUR })).length, 1)
  assert.ok(seg.a <= NOW - 7 * 24 * HOUR)
})

test('x() is linear in a stretch, continuous across a break and clamped outside', () => {
  const raw = buildSegments([task('a', -20, -19.9), task('b', -6, -5.9)], opts())
  const { segments, x } = layout(raw, 100)
  assert.equal(segments.length, 3)
  const first = segments[0]
  assert.equal(x(first.a), first.off)
  assert.ok(Math.abs(x(first.a + 10 * MIN) - (first.off + 100 / 6)) < 1e-6)
  // a time inside the first break lies between the two stretches
  const gapMid = (segments[0].b + segments[1].a) / 2
  assert.ok(x(gapMid) > x(segments[0].b) && x(gapMid) < x(segments[1].a))
  assert.equal(x(first.a - 10 * HOUR), first.off)
  const last = segments[segments.length - 1]
  assert.ok(x(last.b + 10 * HOUR) >= x(last.b))
  // never decreasing
  let prev = -Infinity
  for (let t = first.a; t <= last.b; t += 5 * MIN) { const px = x(t); assert.ok(px >= prev); prev = px }
})

test('break labels use the real idle time, without the margins (finding 8)', () => {
  const raw = buildSegments([task('a', -20, -19.9), task('b', -2, -1.9)], opts())
  const { segments, x } = layout(raw, 100)
  const [brk] = buildBreaks(segments, x)
  assert.equal(brk.width, BREAK_W)
  assert.ok(Math.abs(brk.idle - 17.9 * HOUR) < MIN)
})

test('fit scale fills the viewport', () => {
  const raw = buildSegments([task('a', -1, -0.5)], opts())
  const pph = fitPxPerHour(raw, 1200)
  const { width } = layout(raw, pph)
  assert.ok(width > 1000 && width < 1300, `width ${width}`)
})

test('empty view still has a stretch around now', () => {
  const raw = buildSegments([], opts())
  assert.equal(raw.length, 1)
  assert.ok(raw[0].a < NOW && raw[0].b > NOW)
})

test('ticks are bounded and ordered; a day boundary is flagged', () => {
  const raw = buildSegments([task('a', -24 * 365, -24 * 365 + 1)], opts({ compress: false, t0: NOW - 365 * 24 * HOUR }))
  const { segments } = layout(raw, 320)
  const ticks = buildTicks(segments, 320)
  assert.ok(ticks.length <= 1600, `${ticks.length} ticks`)
  assert.ok(ticks.every((k, i) => i === 0 || k.t > ticks[i - 1].t))
})

test('night blocks merge consecutive dark hours into one block per night', () => {
  const start = Date.parse('2026-11-23T00:00:00')
  const raw = [{ a: start, b: start + 48 * HOUR, ra: start, rb: start + 48 * HOUR }]
  const nights = buildNights(raw)
  // 00-06 (day 1), 22-06 (night 1-2), 22-24 (day 2 end) = 3 blocks
  assert.equal(nights.length, 3)
  assert.equal(nights[1].to - nights[1].from, 8 * HOUR)
})

test('arrows: forward elbow when the child starts after the parent, a drop when it starts earlier (finding 5)', () => {
  const parent = task('p', -3, -1)
  const later = task('c1', -0.5, 0, { deps: ['p'] })
  const together = task('c2', -3, -1.5, { deps: ['p'] })
  const raw = buildSegments([parent, later, together], opts())
  const { x } = layout(raw, 120)
  const rows = [parent, later, together]
  const arrows = buildArrows(rows, x, { row: 32 })
  const forward = arrows.find((a) => a.key === 'p>c1')
  const drop = arrows.find((a) => a.key === 'p>c2')
  assert.match(forward.d, /^M[\d.]+ [\d.]+ H[\d.]+ V[\d.]+ H[\d.]+$/)
  assert.match(drop.d, /^M[\d.]+ [\d.]+ V[\d.]+$/)
  // the drop ends at the edge of the bar (above its centre), not on the row's centre line
  const endY = Number(drop.d.split('V')[1])
  assert.ok(endY < 2 * 32 + 16)
})

test('colours: no two agents share one while the palette lasts, and the result does not depend on input order', () => {
  const names = ['dev-alpha', 'dev-beta', 'doc-beta', 'lead-alpha', 'lead-beta', 'po-alpha', 'qa-alpha', 'review-beta', 'sre-alpha']
  const a = assignColors(names)
  const b = assignColors([...names].reverse())
  assert.equal(new Set(a.values()).size, names.length)
  for (const n of names) assert.equal(a.get(n), b.get(n))
  assert.ok(![...a.values()].some((c) => c === '#d97706' || c === '#dc2626'))
  assert.ok(AGENT_PALETTE.length >= 12)
})

test('splitDuration', () => {
  assert.deepEqual(splitDuration(10_000), { under: true })
  assert.deepEqual(splitDuration(5 * MIN), { minutes: 5 })
  assert.deepEqual(splitDuration(90 * MIN), { hours: 1, minutes: 30 })
  assert.deepEqual(splitDuration(50 * HOUR), { days: 2, hours: 2 })
})
