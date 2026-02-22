<template>
  <div class="fixed bottom-0 left-0 right-0 h-[60px] bg-white dark:bg-gray-800 flex justify-around items-center border-t border-gray-200 dark:border-gray-700 transition-transform duration-300 z-50"
       :class="{ 'translate-y-full': hidden }">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="flex flex-col items-center justify-center bg-transparent border-none text-xs"
      :class="activeTab === tab.key ? 'text-primary' : 'text-gray-500 dark:text-gray-400'"
      @click="$emit('switch', tab.key)"
    >
      <i :class="tab.icon" class="text-xl mb-1"></i>
      <span>{{ tab.label }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  activeTab: { type: String, default: 'shelf' },
  hidden: { type: Boolean, default: false },
})
defineEmits(['switch'])

const tabs = [
  { key: 'shelf', icon: 'fas fa-book', label: '书架' },
  { key: 'favorites', icon: 'fas fa-star', label: '收藏' },
  { key: 'import', icon: 'fas fa-plus-circle', label: '导入' },
  { key: 'settings', icon: 'fas fa-cog', label: '设置' },
]
</script>
