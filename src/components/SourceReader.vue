<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
const props = defineProps<{
  number?: number
  focus?: { file: string; start: number; end: number }
}>()
type Section = { number: number; file: string; title: string; start: number; end: number }
const data = ref<{ files: Record<string, string>; sections: Section[] }>()
const selected = ref(props.number || 0)
const loading = ref(false)
const error = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}source/guide.json`)
    if (!response.ok) throw new Error()
    const json = await response.json()
    if (!json.files || !Array.isArray(json.sections)) throw new Error()
    data.value = json
  } catch {
    error.value = '原文读取失败。请检查网络或静态文件是否完整，然后重新读取。'
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(
  () => props.number,
  (n) => (selected.value = n || 0),
)
const section = computed(() => data.value?.sections.find((s) => s.number === selected.value))
const range = computed(() => props.focus || section.value)
const lines = computed(() => {
  const r = range.value
  if (!r || !data.value) return []
  return data.value.files[r.file]
    .split('\n')
    .slice(r.start - 1, r.end)
    .map((text, i) => ({ text, n: r.start + i }))
})
</script>
<template>
  <div class="source-reader">
    <p class="source-notice">
      原始攻略 · ver.1.24.32。以下保留原文，含全收集、其他结局与剧透；它与推荐路书的取舍不同。
    </p>
    <p v-if="loading" class="loading-state" role="status">正在读取原文…</p>
    <div v-else-if="error" class="inline-error" role="alert">
      <p>{{ error }}</p>
      <button class="button" @click="load">重新读取</button>
    </div>
    <template v-else-if="data">
      <div v-if="!focus" class="source-select">
        <label for="source-section">原文章节</label
        ><select id="source-section" v-model="selected">
          <option v-for="s in data.sections" :key="s.number" :value="s.number">
            {{ s.file }}篇 · {{ s.title }}
          </option>
        </select>
      </div>
      <p class="source-range">{{ range?.file }}篇 · 第 {{ range?.start }}–{{ range?.end }} 行</p>
      <div class="source-lines">
        <div v-for="line in lines" :key="line.n" class="source-line">
          <span class="line-number" aria-hidden="true">{{ line.n }}</span>
          <p>{{ line.text || ' ' }}</p>
        </div>
      </div>
      <p class="muted">
        原攻略中的收集表格图片未纳入路书；保留图片文件名供对照原始压缩包。世界地图可在「行囊」查看。
      </p>
    </template>
  </div>
</template>
