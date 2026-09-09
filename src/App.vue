<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import guide from './data/guide.json'
import {
  freshState,
  normalizeState,
  MAX_IMPORT_BYTES,
  selectTasks,
  countProgress,
  searchTasks,
} from './lib/progress.js'
import { useProgress } from './composables/useProgress'
import type { ProgressState, Task } from './types'
import AppDialog from './components/AppDialog.vue'
import ChapterNav from './components/ChapterNav.vue'
import TaskCard from './components/TaskCard.vue'
import SourceReader from './components/SourceReader.vue'
const chapters = guide.chapters
const baseUrl = import.meta.env.BASE_URL
const allTasks = chapters.flatMap((c) => c.tasks)
const taskIds = new Set(allTasks.map((t) => t.id))
const chapterIds = new Set(chapters.map((c) => c.id))
const store = useProgress(taskIds, chapterIds)
const { state, error: storageError, conflict, original } = store
const chapterId = ref(state.value.lastChapter)
const view = ref('route')
const query = ref('')
const draftQuery = ref('')
const pending = ref(false)
const highlight = ref('')
const searchInput = ref<HTMLInputElement>()
const fileInput = ref<HTMLInputElement>()
const heading = ref<HTMLElement>()
const modal = ref('')
const toast = ref('')
const importError = ref('')
const importing = ref(false)
const sourceTask = ref<Task>()
const mapError = ref(false)
const importPreview = ref<{ state: ProgressState; ignored: number }>()
let toastTimer: ReturnType<typeof setTimeout> | undefined
let highlightTimer: ReturnType<typeof setTimeout> | undefined
const chapter = computed(() => chapters.find((c) => c.id === chapterId.value) || chapters[0])
const eligible = computed(() => selectTasks(chapters, state.value) as Task[])
const progress = computed(() => countProgress(eligible.value, state.value.statuses))
const chapterTasks = computed(() => eligible.value.filter((t) => t.chapter === chapter.value.id))
const chapterProgress = computed(() => countProgress(chapterTasks.value, state.value.statuses))
const counts = computed(() =>
  Object.fromEntries(
    chapters.map((c) => [
      c.id,
      countProgress(
        eligible.value.filter((t) => t.chapter === c.id),
        state.value.statuses,
      ),
    ]),
  ),
)
const warnings = computed(() =>
  chapterTasks.value.filter((t) => t.warning && !state.value.statuses[t.id]),
)
const visibleTasks = computed(() => {
  let list = query.value
    ? (searchTasks(eligible.value, query.value) as Task[])
    : view.value === 'risks'
      ? eligible.value.filter((t) => t.warning)
      : chapterTasks.value
  if (pending.value) list = list.filter((t) => !state.value.statuses[t.id])
  return list
})
const branchName = computed(
  () => ({ medicine: '药圣', nawu: '娜乌', merchant: '商人' })[state.value.branch],
)
const nextChapterTitle = computed(
  () => chapters.find((c) => c.id === nextTask.value?.chapter)?.title || '',
)
const nextTask = computed(
  () =>
    chapterTasks.value.find((t) => !state.value.statuses[t.id]) ||
    eligible.value.find((t) => !state.value.statuses[t.id]),
)
const note = computed({
  get: () => state.value.notes[chapter.value.id] || '',
  set: (value: string) => {
    state.value.notes[chapter.value.id] = value.slice(0, 10000)
  },
})
const dialogTitle = computed(
  () =>
    ({
      nav: '章节目录',
      settings: '行囊与进度备份',
      source: '对照原文',
      import: '导入进度',
      reset: '重置本轮旅程',
      overwrite: '覆盖另一标签页的进度',
      map: '江湖地图',
    })[modal.value] || '路书',
)
function notify(message: string) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 3000)
}
function writeHash(push = false) {
  const params = new URLSearchParams({ chapter: chapterId.value, view: view.value })
  if (query.value) params.set('q', query.value)
  if (pending.value) params.set('pending', '1')
  if (highlight.value) params.set('task', highlight.value)
  const url = `#${params.toString()}`
  if (push) history.pushState(null, '', url)
  else history.replaceState(null, '', url)
}
function readHash() {
  const params = new URLSearchParams(location.hash.slice(1))
  chapterId.value = chapterIds.has(params.get('chapter') || '')
    ? params.get('chapter')!
    : state.value.lastChapter
  view.value = ['route', 'risks', 'source'].includes(params.get('view') || '')
    ? params.get('view')!
    : 'route'
  query.value = (params.get('q') || '').slice(0, 150)
  draftQuery.value = query.value
  pending.value = params.get('pending') === '1'
  highlight.value = taskIds.has(params.get('task') || '') ? params.get('task')! : ''
  state.value.lastChapter = chapterId.value
  updateTitle()
}
function updateTitle() {
  document.title = `${query.value ? `搜索：${query.value}` : view.value === 'risks' ? '易错过内容' : view.value === 'source' ? '原文查阅' : chapter.value.title} · 再入江湖`
}
async function navigate(id: string, focusId = '') {
  chapterId.value = id
  state.value.lastChapter = id
  query.value = ''
  draftQuery.value = ''
  view.value = 'route'
  pending.value = false
  highlight.value = focusId
  modal.value = ''
  writeHash(true)
  updateTitle()
  await nextTick()
  const target = focusId ? document.getElementById(`task-${focusId}`) : heading.value
  target?.scrollIntoView({ block: 'start', behavior: 'instant' })
  if (!focusId) heading.value?.focus({ preventScroll: true })
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => (highlight.value = ''), 4000)
}
function setView(value: string) {
  view.value = value
  query.value = ''
  draftQuery.value = ''
  highlight.value = ''
  writeHash(true)
  updateTitle()
}
function commitSearch(event?: Event) {
  if (event instanceof InputEvent && event.isComposing) return
  query.value = draftQuery.value.trim().slice(0, 150)
  highlight.value = ''
  writeHash()
  updateTitle()
}
function clearSearch() {
  query.value = ''
  draftQuery.value = ''
  writeHash()
  updateTitle()
  nextTick(() => searchInput.value?.focus())
}
function setStatus(id: string, status: 'done' | 'skipped' | 'todo') {
  if (status === 'todo') delete state.value.statuses[id]
  else state.value.statuses[id] = status
  notify(
    status === 'done'
      ? '已记下完成进度'
      : status === 'skipped'
        ? '本轮已跳过，可随时恢复'
        : '已恢复为待办',
  )
}
function showSource(task: Task) {
  sourceTask.value = task
  modal.value = 'source'
}
function download(content: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function exportProgress() {
  store.flush()
  download(
    JSON.stringify(state.value, null, 2),
    `再入江湖-进度-${new Date().toISOString().slice(0, 10)}.json`,
  )
  notify('进度已导出，换设备时导入此文件即可')
}
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importError.value = ''
  importing.value = true
  try {
    if (file.size > MAX_IMPORT_BYTES) throw new Error('进度文件不能超过 512 KiB。')
    const result = normalizeState(JSON.parse(await file.text()), taskIds, chapterIds)
    importPreview.value = result as { state: ProgressState; ignored: number }
    modal.value = 'import'
  } catch (e) {
    importError.value =
      e instanceof SyntaxError
        ? '文件不是有效的 JSON，请选择从本路书导出的备份。'
        : e instanceof Error
          ? e.message
          : '导入失败，当前数据未改变。'
  } finally {
    importing.value = false
    input.value = ''
  }
}
function confirmImport() {
  if (!importPreview.value) return
  store.apply(importPreview.value.state)
  navigate(state.value.lastChapter)
  notify('已导入备份进度')
  importPreview.value = undefined
}
function loadOtherPage() {
  store.loadOther()
  navigate(state.value.lastChapter)
}
function showAll() {
  pending.value = false
  writeHash()
}
function overwritePage() {
  store.persist(true)
  modal.value = ''
  notify('已保存本页进度')
}
function reset() {
  store.apply(freshState() as ProgressState)
  navigate('ch-0')
  notify('本轮进度、札记与设置已重置')
}
function shortcut(event: KeyboardEvent) {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || modal.value) return
  const element = event.target as HTMLElement
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable) return
  if (event.key === '/') {
    event.preventDefault()
    searchInput.value?.focus()
  }
}
onMounted(() => {
  readHash()
  window.addEventListener('hashchange', readHash)
  window.addEventListener('popstate', readHash)
  window.addEventListener('keydown', shortcut)
  if (highlight.value)
    nextTick(() => document.getElementById(`task-${highlight.value}`)?.scrollIntoView())
})
onBeforeUnmount(() => {
  clearTimeout(toastTimer)
  clearTimeout(highlightTimer)
  window.removeEventListener('hashchange', readHash)
  window.removeEventListener('popstate', readHash)
  window.removeEventListener('keydown', shortcut)
})
</script>
<template>
  <a href="#main" class="skip-link">跳到路书正文</a>
  <aside class="sidebar">
    <ChapterNav
      :chapters="chapters"
      :current="chapterId"
      :counts="counts"
      v-bind="progress"
      @select="navigate"
      @settings="modal = 'settings'"
    />
  </aside>
  <div class="page-shell">
    <header class="topbar">
      <button class="mobile-menu icon-button" aria-label="打开章节目录" @click="modal = 'nav'">
        ☰
      </button>
      <div class="breadcrumb">
        <span>逸剑风云决</span><span aria-hidden="true">/</span><strong>二周目路书</strong>
      </div>
      <div class="search">
        <span aria-hidden="true">⌕</span
        ><label class="sr-only" for="guide-search">搜索人物、任务或地点</label
        ><input
          id="guide-search"
          ref="searchInput"
          v-model="draftQuery"
          type="search"
          maxlength="150"
          placeholder="搜索人物、任务、地点"
          @input="commitSearch"
          @compositionend="commitSearch"
          @keydown.enter="
            (e) => {
              if (!e.isComposing) commitSearch()
            }
          "
        /><button v-if="draftQuery" class="search-clear" aria-label="清空搜索" @click="clearSearch">
          ×</button
        ><kbd v-else>/</kbd>
      </div>
      <button
        class="icon-button settings-button"
        aria-label="打开行囊与进度备份"
        title="行囊与进度备份"
        @click="modal = 'settings'"
      >
        ⚙
      </button>
    </header>
    <div v-if="storageError" class="global-warning" role="alert">
      <span>{{ storageError }}</span
      ><button class="text-button" @click="exportProgress">导出当前进度</button
      ><button
        v-if="original"
        class="text-button"
        @click="download(original, '路书-损坏数据原样备份.json')"
      >
        导出原始数据
      </button>
    </div>
    <div v-if="conflict" class="global-warning" role="alert">
      <span>另一标签页已修改进度。本页暂停保存，避免相互覆盖。</span
      ><button class="button" @click="loadOtherPage">加载另一页</button
      ><button class="text-button" @click="modal = 'overwrite'">保留本页并覆盖</button>
    </div>
    <main id="main" class="main-content">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">新主线 · 人物支线 · 易错过内容</p>
          <h1 id="hero-title">再入江湖，不留遗憾<span>。</span></h1>
          <p>把值得遇见的故事，一段一段走完。<br />不为全收集奔忙，也不必重刷每一种结局。</p>
          <div class="hero-meta">
            <span>{{ chapters.length }} 个章节</span><span>{{ branchName }}路线</span
            ><span>本机自动保存</span>
          </div>
        </div>
        <div class="mountains" aria-hidden="true"><i /><i /><i /></div>
        <button
          class="continue-card"
          @click="nextTask ? navigate(nextTask.chapter, nextTask.id) : navigate(chapterId)"
        >
          <span
            >{{ nextTask ? '接着走这一段' : '本轮待办已处理' }}
            <span aria-hidden="true">↗</span></span
          ><strong>{{ nextTask?.title || '再翻翻那些江湖故事' }}</strong
          ><small>{{ nextTask ? nextChapterTitle : '跳过的内容仍可恢复' }}</small>
        </button>
      </section>
      <nav class="view-tabs" aria-label="路书视图">
        <button
          v-for="tab in [
            { id: 'route', label: '流程路书' },
            { id: 'risks', label: '易错过内容' },
            { id: 'source', label: '原文查阅' },
          ]"
          :key="tab.id"
          :class="{ selected: view === tab.id && !query }"
          :aria-pressed="view === tab.id && !query"
          @click="setView(tab.id)"
        >
          {{ tab.label
          }}<span v-if="tab.id === 'risks'" class="tab-count">{{
            eligible.filter((t) => t.warning).length
          }}</span></button
        ><button class="map-link" @click="modal = 'map'">
          江湖地图 <span aria-hidden="true">↗</span>
        </button>
      </nav>
      <section class="chapter-header">
        <div>
          <p class="eyebrow">
            {{
              query
                ? '全路书搜索'
                : view === 'risks'
                  ? '推进之前 · 先看一眼'
                  : view === 'source'
                    ? '保留原始资料 · 随时对照'
                    : `第 ${String(chapter.order).padStart(2, '0')} 章`
            }}
          </p>
          <h2 ref="heading" tabindex="-1">
            {{
              query
                ? `“${query}”`
                : view === 'risks'
                  ? '别让故事擦肩而过'
                  : view === 'source'
                    ? '原文查阅'
                    : chapter.title
            }}
          </h2>
          <p>
            {{
              query
                ? `找到 ${visibleTasks.length} 项 · 在当前路线与见闻范围内搜索`
                : view === 'risks'
                  ? '只汇总有明确分歧或截止提醒的条目，不把普通任务都标成紧急。'
                  : view === 'source'
                    ? '完整文字与原始行号；不将全结局指令混入推荐流程。'
                    : chapter.subtitle
            }}
          </p>
          <div v-if="view === 'route' && !query" class="route-line">
            <span aria-hidden="true">◇</span>{{ chapter.route }}
          </div>
        </div>
        <div v-if="view === 'route' && !query" class="chapter-number" aria-hidden="true">
          {{ String(chapter.order).padStart(2, '0') }}
        </div>
      </section>
      <SourceReader v-if="view === 'source' && !query" :number="chapter.number" />
      <template v-else>
        <div class="list-toolbar">
          <span
            >{{ visibleTasks.length }} 个指引{{
              !query && view === 'route'
                ? ` · 已完成 ${chapterProgress.done} · 跳过 ${chapterProgress.skipped}`
                : ''
            }}</span
          ><label class="check-label"
            ><input v-model="pending" type="checkbox" @change="writeHash()" />只看待办</label
          >
        </div>
        <div class="reading-layout" :class="{ 'single-column': query || view === 'risks' }">
          <aside v-if="!query && view === 'route'" class="chapter-aside">
            <section class="before-leaving">
              <div class="aside-heading">
                <span aria-hidden="true">⚑</span>
                <h3>推进前，先确认</h3>
              </div>
              <template v-if="warnings.length"
                ><button
                  v-for="t in warnings"
                  :key="t.id"
                  class="warning-jump"
                  @click="navigate(t.chapter, t.id)"
                >
                  {{ t.warning }}<span aria-hidden="true"> ↗</span>
                </button></template
              >
              <p v-else>本章没有尚未处理的重点提醒。照着路书慢慢走，遇见的故事可以随手记下。</p>
            </section>
            <section class="companions">
              <h3>本章同行提示</h3>
              <p>{{ chapter.party }}</p>
              <small>按剧情和战斗需要带队；“已完成”由你手动确认。</small>
            </section>
          </aside>
          <div class="task-list">
            <div v-if="!visibleTasks.length" class="empty-state">
              <span aria-hidden="true">◇</span>
              <h3>{{ query ? '没有找到对应内容' : '这一页没有待办了' }}</h3>
              <p>
                {{
                  query
                    ? '试试人物全名、任务名，或在行囊中开启顺路见闻。'
                    : '可关闭待办筛选查看已完成或跳过的指引。'
                }}
              </p>
              <button v-if="query" class="button" @click="clearSearch">清空搜索</button
              ><button v-else-if="pending" class="button" @click="showAll">查看全部指引</button>
            </div>
            <TaskCard
              v-for="(task, i) in visibleTasks"
              :key="task.id"
              :task="task"
              :index="i"
              :status="state.statuses[task.id]"
              :highlight="highlight === task.id"
              :chapter-title="
                query || view === 'risks'
                  ? chapters.find((c) => c.id === task.chapter)?.title
                  : undefined
              "
              @status="setStatus"
              @source="showSource"
              @locate="(t) => navigate(t.chapter, t.id)"
            />
            <div v-if="!query && view === 'route'" class="chapter-pager">
              <button
                v-if="chapter.order > 0"
                class="button secondary"
                @click="navigate(chapters[chapter.order - 1].id)"
              >
                ← 上一章</button
              ><button
                v-if="chapter.order < chapters.length - 1"
                class="button"
                @click="navigate(chapters[chapter.order + 1].id)"
              >
                下一章 · {{ chapters[chapter.order + 1].title }} →</button
              ><span v-else>这一程，走到这里。</span>
            </div>
          </div>
          <section v-if="!query && view === 'route'" class="notes-panel">
            <div class="aside-heading">
              <h3>随行札记</h3>
              <span>{{ note.length }}/10000</span>
            </div>
            <label class="sr-only" for="chapter-note">{{ chapter.title }}的札记</label
            ><textarea
              id="chapter-note"
              v-model="note"
              maxlength="10000"
              rows="7"
              placeholder="记下存档名、暂缓的任务，或这一段江湖里的小事。"
            />
            <p>只存于当前浏览器。换设备前记得导出进度。</p>
          </section>
        </div>
      </template>
      <footer class="site-footer">
        <span>再入江湖 · 依据所提供攻略 ver.1.24.32 整理</span
        ><span>未逐条在游戏内复测 · 以实际版本为准</span
        ><a
          href="https://github.com/Loremmlel/WanderingSwordsGuide"
          target="_blank"
          rel="noopener noreferrer"
          >GitHub ↗</a
        >
      </footer>
    </main>
  </div>
  <div class="toast" :class="{ visible: toast }" role="status" aria-live="polite">{{ toast }}</div>
  <AppDialog
    :open="!!modal"
    :title="dialogTitle"
    :wide="['source', 'map'].includes(modal)"
    @close="modal = ''"
  >
    <ChapterNav
      v-if="modal === 'nav'"
      :chapters="chapters"
      :current="chapterId"
      :counts="counts"
      v-bind="progress"
      @select="navigate"
      @settings="modal = 'settings'"
    />
    <template v-else-if="modal === 'settings'">
      <p class="settings-lead">这一轮只选一条金蝎路线。切换不会删除已记下的进度。</p>
      <fieldset class="branch-options">
        <legend>异种金蝎的去向</legend>
        <label
          v-for="b in [
            { id: 'medicine', name: '药圣路线', text: '默认推荐 · 柳麻衣 → 商葶苧' },
            { id: 'nawu', name: '娜乌路线', text: '在洞口赠蝎 · 后续仍走新主线' },
            { id: 'merchant', name: '商人路线', text: '交给元疆 · 人面鬼蛛与古卷' },
          ]"
          :key="b.id"
          :class="{ chosen: state.branch === b.id }"
          ><input v-model="state.branch" type="radio" name="branch" :value="b.id" /><span
            ><strong>{{ b.name }}</strong
            ><small>{{ b.text }}</small></span
          ></label
        >
      </fieldset>
      <label class="optional-setting"
        ><input v-model="state.optional" type="checkbox" /><span
          ><strong>显示顺路见闻与收集挑战</strong
          ><small>额外展示蓬莱遗珍、蜃楼幻境等；人物小故事默认保留。</small></span
        ></label
      >
      <section class="settings-section">
        <h3>随身带走这段旅程</h3>
        <p>备份包含全部分支的进度、每章札记和设置，不含游戏存档。</p>
        <div class="button-row">
          <button class="button" @click="exportProgress">导出进度</button
          ><button class="button secondary" :disabled="importing" @click="fileInput?.click()">
            {{ importing ? '正在读取…' : '导入进度' }}
          </button>
        </div>
        <input
          ref="fileInput"
          class="sr-only"
          type="file"
          accept="application/json,.json"
          aria-label="选择路书进度文件"
          :disabled="importing"
          @change="importFile"
        />
        <p v-if="importError" class="inline-error" role="alert">{{ importError }}</p>
      </section>
      <section class="settings-section">
        <h3>资料与边界</h3>
        <p>
          收录新主线、支线与双
          DLC；原攻略的旧主线和全结局速通仍可在原文查看。网站不读取游戏状态，也不能替你判定任务是否错过。
        </p>
        <button class="button secondary" @click="modal = 'map'">查看江湖地图</button>
      </section>
      <section class="reset-section">
        <p>开始新一轮前，先保存一份备份。</p>
        <button class="text-button danger" @click="modal = 'reset'">重置本轮旅程</button>
      </section>
    </template>
    <SourceReader v-else-if="modal === 'source' && sourceTask" :focus="sourceTask.source" />
    <template v-else-if="modal === 'import' && importPreview"
      ><p>将替换本机所有任务进度、札记和路线设置，不会与现有进度合并。</p>
      <div class="import-preview">
        <strong>{{ Object.keys(importPreview.state.statuses).length }} 项已处理</strong
        ><span>{{ Object.values(importPreview.state.notes).filter(Boolean).length }} 篇札记</span
        ><span v-if="importPreview.ignored"
          >忽略 {{ importPreview.ignored }} 个当前版本不认识的条目</span
        >
      </div>
      <p>覆盖前，可先导出当前进度。</p>
      <div class="button-row">
        <button class="button secondary" @click="modal = 'settings'">取消</button
        ><button class="button secondary" @click="exportProgress">先导出当前进度</button
        ><button class="button" @click="confirmImport">确认替换进度</button>
      </div></template
    >
    <template v-else-if="modal === 'reset'"
      ><p>将清空全部任务状态、所有章节札记和路线设置。这个操作不能自动撤销。</p>
      <div class="button-row">
        <button class="button secondary" @click="modal = 'settings'">取消</button
        ><button class="button secondary" @click="exportProgress">先导出进度</button
        ><button class="button danger-solid" @click="reset">确认重置</button>
      </div></template
    >
    <template v-else-if="modal === 'overwrite'"
      ><p>另一标签页的新进度将被本页当前内容覆盖。请先确认哪一份是你需要保留的版本。</p>
      <div class="button-row">
        <button class="button secondary" @click="modal = ''">取消</button
        ><button class="button secondary" @click="exportProgress">先导出本页</button
        ><button class="button danger-solid" @click="overwritePage">用本页覆盖</button>
      </div></template
    >
    <template v-else-if="modal === 'map'"
      ><p>原攻略提供的世界地图。可横向滚动查看，手机上可用浏览器缩放。</p>
      <p v-if="mapError" class="inline-error">地图未能加载，请检查站点静态资源是否完整。</p>
      <div v-else class="map-container" tabindex="0" aria-label="可滚动的江湖地图">
        <img
          :src="`${baseUrl}source/assets/image.webp`"
          alt="逸剑风云决世界地点地图，来自原攻略"
          width="1280"
          height="720"
          @error="mapError = true"
        /></div
    ></template>
  </AppDialog>
</template>
