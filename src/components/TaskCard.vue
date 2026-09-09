<script setup lang="ts">
import { ref } from 'vue'
import type { Task } from '../types'
const props = defineProps<{
  task: Task
  status?: string
  index?: number
  chapterTitle?: string
  highlight?: boolean
}>()
defineEmits<{
  status: [id: string, status: 'done' | 'skipped' | 'todo']
  source: [task: Task]
  locate: [task: Task]
}>()
const expanded = ref(false)
const parts = (text: string) => text.split(/→|；/).filter(Boolean)
</script>
<template>
  <article
    :id="`task-${task.id}`"
    class="task-card"
    :class="[status || 'todo', { highlighted: highlight }]"
  >
    <span class="timeline-dot" aria-hidden="true">{{
      status === 'done'
        ? '✓'
        : status === 'skipped'
          ? '−'
          : String((index || 0) + 1).padStart(2, '0')
    }}</span>
    <div class="task-head">
      <div>
        <span
          class="badge"
          :class="{
            major: task.kind === '主线',
            special: task.kind === 'DLC' || task.kind === '分歧',
          }"
          >{{ task.kind }}</span
        ><span v-if="chapterTitle" class="task-chapter">{{ chapterTitle }}</span
        ><span v-if="status" class="task-state">{{ status === 'done' ? '已完成' : '已跳过' }}</span>
      </div>
      <button
        class="complete-button"
        :aria-label="`${status === 'done' ? '撤销完成' : '标记完成'}：${task.title}`"
        :aria-pressed="status === 'done'"
        @click="$emit('status', task.id, status === 'done' ? 'todo' : 'done')"
      >
        <span aria-hidden="true">{{ status === 'done' ? '✓' : '○' }}</span>
      </button>
    </div>
    <h3>{{ task.title }}</h3>
    <p class="task-summary">{{ task.summary }}</p>
    <p v-if="task.warning" class="task-warning">
      <span aria-hidden="true">⚑</span>{{ task.warning }}
    </p>
    <div v-if="expanded" :id="`details-${task.id}`" class="task-details">
      <section v-for="step in task.steps" :key="step.line">
        <p v-for="(part, p) in parts(step.text)" :key="p">{{ part }}</p>
      </section>
    </div>
    <footer class="task-footer">
      <button
        class="text-button"
        :aria-expanded="expanded"
        :aria-controls="expanded ? `details-${task.id}` : undefined"
        @click="expanded = !expanded"
      >
        {{ expanded ? '收起步骤' : '展开步骤' }}
        <span aria-hidden="true">{{ expanded ? '−' : '+' }}</span></button
      ><button class="source-button" @click="$emit('source', task)">
        原文 · {{ task.source.file }}篇 {{ task.source.start }}–{{ task.source.end }}</button
      ><button v-if="chapterTitle" class="text-button" @click="$emit('locate', task)">
        定位章节</button
      ><button
        class="skip-button"
        @click="$emit('status', task.id, status === 'skipped' ? 'todo' : 'skipped')"
      >
        {{ status === 'skipped' ? '恢复待办' : '本轮跳过' }}
      </button>
    </footer>
  </article>
</template>
