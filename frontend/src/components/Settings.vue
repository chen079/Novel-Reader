<template>
  <!-- Backdrop overlay -->
  <div v-if="visible" class="fixed inset-0 z-[99]" @click="$emit('close')"></div>
  <div
    class="fixed bottom-0 left-0 right-0 bg-white/[0.98] dark:bg-gray-800/[0.98] rounded-t-2xl p-5 z-[100] transition-transform duration-300"
    :class="visible ? 'translate-y-0' : 'translate-y-full'"
  >
    <div class="text-center font-semibold mb-5 dark:text-white">阅读设置</div>
    <div class="flex justify-around mb-6">
      <div class="text-center">
        <button
          class="w-[50px] h-[50px] rounded-full flex items-center justify-center mb-2 bg-gray-100 dark:bg-gray-700 border-none text-xl dark:text-white"
          @click="changeFontSize('increase')"
        >A+</button>
        <div class="text-sm text-gray-500 dark:text-gray-400">增大字体</div>
      </div>
      <div class="text-center">
        <button
          class="w-[50px] h-[50px] rounded-full flex items-center justify-center mb-2 bg-gray-100 dark:bg-gray-700 border-none text-xl dark:text-white"
          @click="changeFontSize('decrease')"
        >A-</button>
        <div class="text-sm text-gray-500 dark:text-gray-400">减小字体</div>
      </div>
      <div class="text-center">
        <button
          class="w-[50px] h-[50px] rounded-full flex items-center justify-center mb-2 bg-gray-100 dark:bg-gray-700 border-none text-xl"
          @click="toggleNightMode"
        >
          <i :class="booksStore.settings.nightMode ? 'fas fa-sun text-yellow-400' : 'fas fa-moon text-gray-600'"></i>
        </button>
        <div class="text-sm text-gray-500 dark:text-gray-400">{{ booksStore.settings.nightMode ? '日间' : '夜间' }}</div>
      </div>
    </div>

    <!-- Reading Mode -->
    <div class="mb-4">
      <div class="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">阅读模式</div>
      <div class="flex justify-center gap-2">
        <button
          v-for="m in readModes"
          :key="m.key"
          class="px-3 py-1.5 rounded text-sm border"
          :class="booksStore.settings.readMode === m.key
            ? 'bg-primary text-white border-primary'
            : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white'"
          @click="setReadMode(m.key)"
        >{{ m.label }}</button>
      </div>
    </div>

    <!-- Theme selection -->
    <div class="flex justify-around mb-4">
      <button
        v-for="t in themes"
        :key="t.key"
        class="w-10 h-10 rounded-full border-2"
        :class="[t.bg, booksStore.settings.theme === t.key ? 'border-primary' : 'border-gray-300']"
        @click="setTheme(t.key)"
      ></button>
    </div>

    <!-- Line Height -->
    <div class="mb-4">
      <div class="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">行距</div>
      <div class="flex justify-center gap-2">
        <button
          v-for="lh in lineHeights"
          :key="lh"
          class="px-3 py-1.5 rounded text-sm border"
          :class="booksStore.settings.lineHeight === lh
            ? 'bg-primary text-white border-primary'
            : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white'"
          @click="booksStore.updateSetting('lineHeight', lh)"
        >{{ lh }}</button>
      </div>
    </div>

    <!-- Font Family -->
    <div class="mb-4">
      <div class="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">字体</div>
      <div class="flex justify-center gap-2 flex-wrap">
        <button
          v-for="f in fonts"
          :key="f.key"
          class="px-3 py-1.5 rounded text-sm border"
          :class="booksStore.settings.fontFamily === f.key
            ? 'bg-primary text-white border-primary'
            : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white'"
          @click="booksStore.updateSetting('fontFamily', f.key)"
        >{{ f.label }}</button>
      </div>
    </div>

    <!-- Logout -->
    <div class="text-center mt-4">
      <button class="text-red-500 text-sm border-none bg-transparent" @click="handleLogout">
        <i class="fas fa-sign-out-alt mr-1"></i>退出登录
      </button>
    </div>
  </div>
</template>

<script setup>
import { useBooksStore } from '../stores/books'
import { useUserStore } from '../stores/user'
import { useRouter } from 'vue-router'

defineProps({
  visible: { type: Boolean, default: false },
})
defineEmits(['close'])

const booksStore = useBooksStore()
const userStore = useUserStore()
const router = useRouter()

const themes = [
  { key: 'light', bg: 'bg-gray-50' },
  { key: 'sepia', bg: 'bg-[#f0e6d2]' },
  { key: 'dark', bg: 'bg-gray-700' },
  { key: 'green', bg: 'bg-[#edf7ed]' },
]

const lineHeights = [1.5, 1.8, 2.0, 2.5]

const fonts = [
  { key: 'default', label: '默认' },
  { key: 'songti', label: '宋体' },
  { key: 'kaiti', label: '楷体' },
  { key: 'heiti', label: '黑体' },
]

const readModes = [
  { key: 'scroll', label: '滚动' },
  { key: 'paginate', label: '分页' },
  { key: 'flip', label: '翻页' },
]

function changeFontSize(action) {
  let size = booksStore.settings.fontSize
  if (action === 'increase' && size < 28) size += 2
  else if (action === 'decrease' && size > 14) size -= 2
  booksStore.updateSetting('fontSize', size)
}

function toggleNightMode() {
  booksStore.updateSetting('nightMode', !booksStore.settings.nightMode)
}

function setReadMode(mode) {
  booksStore.updateSetting('readMode', mode)
}

function setTheme(theme) {
  booksStore.updateSetting('theme', theme)
}

function handleLogout() {
  userStore.logout()
  router.push('/login')
}
</script>
