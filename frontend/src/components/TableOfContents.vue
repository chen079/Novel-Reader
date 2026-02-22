<template>
  <!-- Backdrop -->
  <div v-if="visible" class="fixed inset-0 bg-black/40 z-[200]" @click="$emit('close')"></div>
  <!-- Drawer -->
  <div
    class="fixed top-0 left-0 bottom-0 w-[280px] z-[201] transition-transform duration-300 overflow-y-auto"
    :class="[
      visible ? 'translate-x-0' : '-translate-x-full',
      isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
    ]"
  >
    <div class="sticky top-0 p-4 border-b font-semibold text-lg"
         :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'">
      目录
      <span class="text-sm font-normal text-gray-400 ml-2">{{ chapters.length }} 章</span>
    </div>
    <div v-if="chapters.length === 0" class="p-4 text-center text-gray-400 text-sm">
      未检测到章节
    </div>
    <div
      v-for="(ch, idx) in chapters"
      :key="idx"
      class="px-4 py-3 border-b cursor-pointer text-sm transition-colors"
      :class="[
        isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50',
        isCurrentChapter(idx) ? (isDark ? 'bg-gray-700 text-blue-400' : 'bg-blue-50 text-blue-600') : ''
      ]"
      @click="jumpToChapter(ch.pageIndex)"
    >
      <div class="truncate">{{ ch.title }}</div>
      <div class="text-xs text-gray-400 mt-0.5">第 {{ ch.pageIndex + 1 }} 页</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBooksStore } from '../stores/books'

const props = defineProps({
  visible: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const booksStore = useBooksStore()
const isDark = computed(() => booksStore.settings.nightMode)
const chapters = computed(() => booksStore.chapters)

function isCurrentChapter(idx) {
  const current = booksStore.currentPage
  const ch = booksStore.chapters
  const start = ch[idx].pageIndex
  const end = idx < ch.length - 1 ? ch[idx + 1].pageIndex : booksStore.totalPages
  return current >= start && current < end
}

function jumpToChapter(pageIndex) {
  booksStore.goToPage(pageIndex)
  emit('close')
}
</script>
