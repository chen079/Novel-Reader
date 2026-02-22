<template>
  <div :class="{ dark: isDark }" class="h-screen flex flex-col">
    <router-view />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBooksStore } from './stores/books'

const booksStore = useBooksStore()
const isDark = computed(() => booksStore.settings.nightMode)
</script>
