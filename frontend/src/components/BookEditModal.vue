<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white dark:bg-gray-800 rounded-2xl w-[90%] max-w-md p-5 shadow-xl">
        <h2 class="text-lg font-bold dark:text-white mb-4">编辑书籍信息</h2>

        <!-- Cover preview -->
        <div class="flex justify-center mb-4">
          <div class="w-24 h-32 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
            <img v-if="form.cover_url" :src="form.cover_url" class="w-full h-full object-cover" @error="coverError = true" />
            <span v-else class="text-2xl font-bold text-gray-300 dark:text-gray-500">
              {{ (form.title || '').substring(0, 2) }}
            </span>
          </div>
        </div>

        <!-- Form -->
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">书名</label>
            <input v-model="form.title" type="text"
              class="w-full px-3 py-2 rounded-lg border text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">作者</label>
            <input v-model="form.author" type="text"
              class="w-full px-3 py-2 rounded-lg border text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">封面图片URL</label>
            <input v-model="form.cover_url" type="text" placeholder="https://..."
              class="w-full px-3 py-2 rounded-lg border text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
          </div>
        </div>
        <!-- Buttons -->
        <div class="flex gap-3 mt-5">
          <button @click="$emit('close')"
            class="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            取消
          </button>
          <button @click="handleSave" :disabled="saving"
            class="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { useBooksStore } from '../stores/books'

const props = defineProps({
  book: { type: Object, required: true },
})
const emit = defineEmits(['close', 'saved'])

const booksStore = useBooksStore()
const saving = ref(false)
const coverError = ref(false)

const form = reactive({
  title: props.book.title || '',
  author: props.book.author || '',
  cover_url: props.book.cover_url || '',
})

watch(() => props.book, (b) => {
  form.title = b.title || ''
  form.author = b.author || ''
  form.cover_url = b.cover_url || ''
})

watch(() => form.cover_url, () => {
  coverError.value = false
})

async function handleSave() {
  saving.value = true
  try {
    await booksStore.updateBookMetadata(props.book.id, {
      title: form.title,
      author: form.author,
      cover_url: form.cover_url,
    })
    emit('saved')
    emit('close')
  } catch (e) {
    alert('保存失败: ' + (e.response?.data?.detail || e.message))
  } finally {
    saving.value = false
  }
}
</script>
