export const APP_ID = 'wandering-swords-guide'
export const STORAGE_KEY = 'wandering-swords-guide:v1'
export const MAX_IMPORT_BYTES = 512 * 1024
export function freshState() {
  return {
    app: APP_ID,
    schema: 1,
    revision: '',
    statuses: {},
    notes: {},
    branch: 'medicine',
    optional: false,
    lastChapter: 'ch-0',
  }
}
export function normalizeState(value, taskIds, chapterIds) {
  if (!value || typeof value !== 'object' || value.app !== APP_ID || value.schema !== 1)
    throw new Error('这不是本路书支持的进度文件（需要 schema 1）。')
  if (
    !['medicine', 'nawu', 'merchant'].includes(value.branch) ||
    typeof value.optional !== 'boolean'
  )
    throw new Error('路线设置无效，请导入原始备份文件。')
  if (
    !value.statuses ||
    typeof value.statuses !== 'object' ||
    Array.isArray(value.statuses) ||
    !value.notes ||
    typeof value.notes !== 'object' ||
    Array.isArray(value.notes)
  )
    throw new Error('任务或札记格式无效。')
  const out = freshState()
  let ignored = 0
  for (const [key, status] of Object.entries(value.statuses)) {
    if (!['done', 'skipped'].includes(status))
      throw new Error('任务状态无效，请勿手动修改备份中的状态。')
    if (taskIds.has(key)) out.statuses[key] = status
    else ignored++
  }
  for (const [key, note] of Object.entries(value.notes)) {
    if (typeof note !== 'string' || note.length > 10000)
      throw new Error('每章札记必须是文本，且不超过 10000 字。')
    if (chapterIds.has(key)) out.notes[key] = note
    else ignored++
  }
  Object.assign(out, {
    branch: value.branch,
    optional: value.optional,
    lastChapter: chapterIds.has(value.lastChapter) ? value.lastChapter : 'ch-0',
    revision: typeof value.revision === 'string' ? value.revision.slice(0, 200) : '',
  })
  return { state: out, ignored }
}
export function selectTasks(chapters, state) {
  return chapters
    .flatMap((c) => c.tasks)
    .filter(
      (t) =>
        (t.branch === 'all' || t.branch === state.branch) && (state.optional || t.kind !== '见闻'),
    )
}
export function countProgress(tasks, statuses) {
  const done = tasks.filter((t) => statuses[t.id] === 'done').length
  const skipped = tasks.filter((t) => statuses[t.id] === 'skipped').length
  return {
    total: tasks.length,
    done,
    skipped,
    pending: tasks.length - done - skipped,
    percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  }
}
export function searchTasks(tasks, query) {
  const words = query
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('zh-CN')
    .split(/\s+/)
    .filter(Boolean)
  return tasks.filter((t) => {
    const text = [t.title, t.summary, t.warning, ...t.steps.map((s) => s.text)]
      .join(' ')
      .normalize('NFKC')
      .toLocaleLowerCase('zh-CN')
    return words.every((w) => text.includes(w))
  })
}
