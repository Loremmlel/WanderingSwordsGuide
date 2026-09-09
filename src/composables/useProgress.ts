import { ref, watch, onBeforeUnmount } from 'vue'
import { freshState, normalizeState, STORAGE_KEY } from '../lib/progress.js'
import type { ProgressState } from '../types'
export function useProgress(taskIds: Set<string>, chapterIds: Set<string>) {
  const state = ref<ProgressState>(freshState() as ProgressState)
  const error = ref('')
  const conflict = ref(false)
  const original = ref('')
  let baseline: string | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let paused = false
  try {
    baseline = localStorage.getItem(STORAGE_KEY)
    if (baseline) {
      try {
        state.value = normalizeState(JSON.parse(baseline), taskIds, chapterIds)
          .state as ProgressState
      } catch (e) {
        original.value = baseline
        paused = true
        error.value =
          '本机进度损坏，已保留原始内容且暂停保存。请先导出原始数据，再导入有效备份或重置。'
      }
    }
  } catch {
    error.value = '浏览器不允许保存本地数据。本次变化仅保留在当前页面，请及时导出进度。'
  }
  function persist(force = false) {
    if ((paused || conflict.value) && !force) return
    try {
      const current = localStorage.getItem(STORAGE_KEY)
      if (!force && current !== baseline) {
        conflict.value = true
        return
      }
      if (!force && baseline) {
        const saved = { ...JSON.parse(baseline), revision: '' }
        const draft = { ...state.value, revision: '' }
        if (JSON.stringify(saved) === JSON.stringify(draft)) return
      }
      const next = {
        ...state.value,
        revision: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }
      const serialized = JSON.stringify(next)
      localStorage.setItem(STORAGE_KEY, serialized)
      baseline = serialized
      if (force) {
        paused = false
        conflict.value = false
        original.value = ''
      }
      error.value = ''
    } catch {
      error.value =
        '保存失败：可能已超出浏览器存储空间。本次变化仍在页面内，请导出进度，避免刷新后丢失。'
    }
  }
  watch(
    state,
    () => {
      clearTimeout(timer)
      timer = setTimeout(() => persist(), 180)
    },
    { deep: true },
  )
  function apply(next: ProgressState) {
    clearTimeout(timer)
    state.value = JSON.parse(JSON.stringify(next))
    persist(true)
  }
  function loadOther() {
    clearTimeout(timer)
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const next = raw
        ? (normalizeState(JSON.parse(raw), taskIds, chapterIds).state as ProgressState)
        : (freshState() as ProgressState)
      baseline = raw
      state.value = next
      conflict.value = false
      paused = false
      original.value = ''
      error.value = ''
    } catch {
      error.value = '另一标签页的数据无法读取，当前进度未被替换。请导出当前进度再处理。'
    }
  }
  function onStorage(e: StorageEvent) {
    if ((e.key === STORAGE_KEY || e.key === null) && e.newValue !== baseline) {
      clearTimeout(timer)
      conflict.value = true
    }
  }
  function flush() {
    clearTimeout(timer)
    persist()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener('pagehide', flush)
  onBeforeUnmount(() => {
    flush()
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('pagehide', flush)
  })
  return { state, error, conflict, original, persist, apply, loadOther, flush }
}
