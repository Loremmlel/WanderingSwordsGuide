import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  freshState,
  normalizeState,
  selectTasks,
  countProgress,
  searchTasks,
} from '../src/lib/progress.js'
const data = JSON.parse(readFileSync(new URL('../src/data/guide.json', import.meta.url), 'utf8'))
const tasks = data.chapters.flatMap((c) => c.tasks)
const taskIds = new Set(tasks.map((t) => t.id))
const chapterIds = new Set(data.chapters.map((c) => c.id))
test('default route excludes merchant-only and optional collection tasks, not character stories', () => {
  const selected = selectTasks(data.chapters, freshState())
  assert(selected.some((t) => t.id === '下-838' || t.title.includes('达摩洞')))
  assert(selected.some((t) => t.id === '上-789'))
  assert(!selected.some((t) => t.branch === 'merchant' || t.kind === '见闻'))
})
test('each scorpion branch has an independent task scope', () => {
  for (const branch of ['medicine', 'nawu', 'merchant']) {
    const selected = selectTasks(data.chapters, { ...freshState(), branch })
    assert(selected.every((t) => t.branch === 'all' || t.branch === branch))
    assert(selected.some((t) => t.title.includes('飞蝎使')))
    assert(selected.some((t) => t.id === '下-151'))
  }
})
test('skipped is separate from done and from pending', () => {
  assert.deepEqual(
    countProgress([{ id: '1' }, { id: '2' }, { id: '3' }], { 1: 'done', 2: 'skipped' }),
    { total: 3, done: 1, skipped: 1, pending: 1, percent: 33 },
  )
})
test('export and import preserve all branches and notes', () => {
  const state = {
    ...freshState(),
    statuses: { '上-731': 'done', '上-735': 'skipped' },
    notes: { 'ch-0': '存档：凤凰洞前' },
  }
  assert.deepEqual(
    normalizeState(JSON.parse(JSON.stringify(state)), taskIds, chapterIds).state,
    state,
  )
})
test('reject invalid import schemas, status and notes', () => {
  for (const value of [
    null,
    [],
    {},
    { ...freshState(), schema: 2 },
    { ...freshState(), statuses: [] },
    { ...freshState(), statuses: { '上-1': true } },
    { ...freshState(), notes: { 'ch-0': 'a'.repeat(10001) } },
    { ...freshState(), branch: 'everything' },
  ])
    assert.throws(() => normalizeState(value, taskIds, chapterIds))
})
test('unknown ids filtered, unsafe keys not assigned', () => {
  const result = normalizeState(
    JSON.parse(
      JSON.stringify({
        ...freshState(),
        statuses: { missing: 'done' },
        notes: { missing: 'old note' },
        lastChapter: 'missing',
      }),
    ),
    taskIds,
    chapterIds,
  )
  assert.equal(result.ignored, 2)
  assert.equal(result.state.lastChapter, 'ch-0')
  assert.deepEqual(result.state.notes, {})
})
test('local search matches actionable steps and normalizes full width input', () => {
  assert(searchTasks(tasks, '陈麟熙 义正言辞').some((t) => t.id === '上-537'))
  assert(searchTasks(tasks, '１２０').some((t) => t.id === '下-617'))
  assert.equal(searchTasks(tasks, '并不存在的天外飞仙任务').length, 0)
})
