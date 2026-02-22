<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" @click.self="$emit('close')">
    <div class="bg-white dark:bg-gray-800 w-4/5 max-w-[400px] rounded-2xl p-6 text-center">
      <h2 class="text-xl font-semibold mb-4 dark:text-white">导入书籍</h2>
      <div class="flex flex-col gap-3 mb-5">
        <button
          class="py-4 bg-gray-100 dark:bg-gray-700 rounded-xl border-none text-base dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
          @click="triggerFileInput"
        >
          <i class="fas fa-file-upload mr-2"></i>从设备导入TXT/MD文件
        </button>
      </div>

      <!-- Progress bar -->
      <div v-if="uploading" class="w-full bg-gray-200 dark:bg-gray-600 h-1.5 rounded-full mt-2 mb-3">
        <div class="h-full bg-green-500 rounded-full transition-all" :style="{ width: progress + '%' }"></div>
      </div>

      <p class="text-gray-400 text-xs mb-4">为保证服务质量，您的文件会被保存在服务端，请注意隐私安全</p>

      <button class="bg-transparent border-none text-primary font-semibold text-base" @click="$emit('close')">
        取消
      </button>

      <input ref="fileInput" type="file" accept=".txt,.md" class="hidden" @change="handleFile" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useBooksStore } from '../stores/books'

const emit = defineEmits(['close'])
const booksStore = useBooksStore()

const fileInput = ref(null)
const uploading = ref(false)
const progress = ref(0)

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleFile(e) {
  const file = e.target.files[0]
  if (!file) return

  if (!/\.(txt|md)$/i.test(file.name)) {
    alert('只支持上传 .txt 或 .md 文件')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    alert('文件太大，请上传小于 10MB 的文件')
    return
  }

  uploading.value = true
  progress.value = 0
  try {
    await booksStore.uploadBook(file, (p) => { progress.value = p })
    emit('close')
  } catch (err) {
    alert(err.response?.data?.detail || '上传失败，请重试')
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}
</script>
