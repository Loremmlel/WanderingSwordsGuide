import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'))
const guide = read('../src/data/guide.json')
const raw = read('../public/source/guide.json')
const tasks = guide.chapters.flatMap((c) => c.tasks)
test('21 sequential chapters, no speedrun / old main route mixed into recommended journey', () => {
  assert.equal(guide.chapters.length, 21)
  assert(guide.chapters.every((c, i) => c.order === i && ![3, 18, 19].includes(c.number)))
  assert.equal(new Set(tasks.map((t) => t.id)).size, tasks.length)
})
test('every source range is real, ordered, non-overlapping and contains concrete steps', () => {
  for (const c of guide.chapters) {
    let last = 0
    for (const t of c.tasks) {
      assert(t.source.start > last, `overlap ${t.id}`)
      last = t.source.end
      assert(t.source.start >= c.source.start && t.source.end <= c.source.end)
      assert(t.steps.length, `empty ${t.id}`)
      assert(
        t.steps.every((s) => s.line >= t.source.start && s.line <= t.source.end && s.text.length),
      )
    }
  }
})
test('every main-story source line in included chapters is covered by a guide task', () => {
  for (const c of guide.chapters) {
    const lines = raw.files[c.source.file].split(/\r?\n/)
    for (let n = c.source.start; n <= c.source.end; n++) {
      if (/^(?:\*\*)?\[主线\]/.test(lines[n - 1]))
        assert(
          c.tasks.some((t) => n >= t.source.start && n <= t.source.end),
          `missing ${c.source.file}:${n}`,
        )
    }
  }
})
test('critical missable instructions have warnings at or before the actual task', () => {
  const critical = {
    '上-537': '70–79',
    '上-617': '最后',
    '上-849': '玄火教',
    '下-205': '无尘剑',
    '下-303': '万彪',
    '下-673': '前三项',
    '下-683': '出手相助',
    '下-794': '清霄',
    '下-814': '继续调查',
    '下-900': '南疆',
  }
  for (const [id, text] of Object.entries(critical))
    assert(tasks.find((t) => t.id === id)?.warning.includes(text), `${id}: ${text}`)
})
test('editorial substitutions point to the correct tasks rather than adjacent content', () => {
  const includes = (id, text) =>
    tasks.find((t) => t.id === id)?.steps.some((s) => s.text.includes(text))
  assert(includes('上-173', '莲湖会晤'))
  assert(includes('上-165', '千金蟾衣'))
  assert(includes('上-537', '义正言辞'))
  assert(includes('上-561', '莫问的喜好'))
  assert(includes('下-836', '达摩洞'))
  assert(includes('下-844', '木剑'))
  assert(includes('下-959', '最终战斗'))
})
