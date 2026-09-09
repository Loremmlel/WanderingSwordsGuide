<script setup lang="ts">
import type { Chapter } from '../types'
defineProps<{
  chapters: Chapter[]
  current: string
  counts: Record<string, { done: number; total: number }>
  percent: number
  done: number
  total: number
  skipped: number
}>()
defineEmits<{ select: [id: string]; settings: [] }>()
</script>
<template>
  <div class="nav-inner">
    <div class="brand">
      <span class="seal" aria-hidden="true">逸</span>
      <div><strong>再入江湖</strong><small>逸剑风云决 · 二周目路书</small></div>
    </div>
    <div class="nav-progress">
      <div>
        <span>本轮旅程</span><strong>{{ percent }}<small>%</small></strong>
      </div>
      <progress :value="done" :max="total || 1" aria-label="本轮完成进度" />
      <p>
        {{ done }} / {{ total }} 项完成 <span v-if="skipped">· {{ skipped }} 项跳过</span>
      </p>
    </div>
    <nav class="chapter-nav" aria-label="章节目录">
      <template v-for="(c, i) in chapters" :key="c.id">
        <p v-if="[0, 7, 13].includes(i)" class="nav-group">
          {{ i === 0 ? '上篇 · 初入江湖' : i === 7 ? '中篇 · 风云渐起' : '下篇 · 山河故人' }}
        </p>
        <a
          :href="`#chapter=${c.id}&view=route`"
          :aria-current="current === c.id ? 'page' : undefined"
          :class="{ active: current === c.id }"
          @click.prevent="$emit('select', c.id)"
          ><span class="nav-number">{{ String(i).padStart(2, '0') }}</span
          ><span>{{ c.title }}</span
          ><span class="nav-count"
            >{{ counts[c.id]?.done || 0 }}/{{ counts[c.id]?.total || 0 }}</span
          ></a
        >
      </template>
    </nav>
    <button class="nav-settings" @click="$emit('settings')">
      行囊与进度备份 <span aria-hidden="true">↗</span>
    </button>
  </div>
</template>
