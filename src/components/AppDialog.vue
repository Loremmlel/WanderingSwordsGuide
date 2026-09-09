<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
const props = defineProps<{ open: boolean; title: string; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const element = ref<HTMLDialogElement>()
let previous: HTMLElement | null = null
watch(
  () => props.open,
  async (open) => {
    await nextTick()
    const el = element.value
    if (!el) return
    if (open) {
      previous = document.activeElement as HTMLElement
      if (!el.open) el.showModal()
      document.body.classList.add('modal-open')
    } else {
      el.close()
      document.body.classList.remove('modal-open')
      if (previous?.isConnected) previous.focus()
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => document.body.classList.remove('modal-open'))
</script>
<template>
  <dialog
    ref="element"
    :class="['app-dialog', { wide }]"
    aria-labelledby="dialog-title"
    @cancel.prevent="emit('close')"
    @click="
      (e) => {
        if (e.target === element) {
          const box = element.getBoundingClientRect()
          if (
            e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom
          )
            emit('close')
        }
      }
    "
  >
    <header class="dialog-header">
      <h2 id="dialog-title">{{ title }}</h2>
      <button class="icon-button" aria-label="关闭弹窗" autofocus @click="emit('close')">×</button>
    </header>
    <div class="dialog-body"><slot /></div>
  </dialog>
</template>
