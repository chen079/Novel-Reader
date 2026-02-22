<template>
  <div class="flex flex-col h-full p-4 overflow-y-auto pb-20">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center gap-2">
        <div class="w-1 h-5 bg-primary rounded-full"></div>
        <h1 class="text-xl font-bold dark:text-white">{{ title }}</h1>
        <span class="text-xs text-gray-400 dark:text-gray-500 ml-1">{{ filteredBooks.length }}本</span>
      </div>
      <div class="flex items-center gap-2">
        <button class="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-primary transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="showSearch = !showSearch">
          <i class="fas fa-search text-sm"></i>
        </button>
        <select v-model="sortBy"
                class="text-xs py-1.5 px-2.5 rounded-lg border bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 border-gray-200 text-gray-500 outline-none focus:ring-1 focus:ring-primary">
          <option value="created_at">按导入时间</option>
          <option value="title">按书名</option>
          <option value="progress">按阅读进度</option>
        </select>
      </div>
    </div>
    <!-- Search input -->
    <div v-if="showSearch" class="mb-4">
      <div class="relative">
        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-500 text-xs"></i>
        <input v-model="searchQuery" type="text" placeholder="搜索书名或作者..."
               class="w-full pl-8 pr-3 py-2 rounded-xl border text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
      </div>
    </div>
    <!-- Empty state -->
    <div v-if="filteredBooks.length === 0" class="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
      <i class="fas fa-book text-4xl mb-3 opacity-30"></i>
      <span class="text-sm">{{ searchQuery ? '未找到匹配书籍' : (title === '我的收藏' ? '你还没有收藏任何书籍' : '暂无书籍') }}</span>
    </div>
    <!-- Book grid -->
    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-3 gap-y-5">
      <BookCard
        v-for="book in filteredBooks"
        :key="book.id"
        :book="book"
        @open="$emit('open', book.id)"
        @delete="$emit('delete', book.id)"
        @edit="$emit('edit', book)"
      />
    </div>
  </div>
</template>
<!-- PLACEHOLDER_SCRIPT -->

<script setup>
import { ref, computed } from 'vue'
import BookCard from './BookCard.vue'

const props = defineProps({
  books: { type: Array, required: true },
  title: { type: String, default: '我的书架' },
})

defineEmits(['open', 'delete', 'edit'])

const showSearch = ref(false)
const searchQuery = ref('')
const sortBy = ref('created_at')

const filteredBooks = computed(() => {
  let result = props.books
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(b =>
      b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
    )
  }
  return [...result].sort((a, b) => {
    if (sortBy.value === 'title') {
      return a.title.localeCompare(b.title, 'zh')
    }
    if (sortBy.value === 'progress') {
      const pa = a.total_pages ? (a.current_page / a.total_pages) : 0
      const pb = b.total_pages ? (b.current_page / b.total_pages) : 0
      return pb - pa
    }
    return new Date(b.created_at) - new Date(a.created_at)
  })
})
</script>
