<template>
  <div class="flex flex-col cursor-pointer group" @click="$emit('open')">
    <!-- Book cover -->
    <div class="relative aspect-[3/4] rounded-lg overflow-hidden shadow-md group-hover:shadow-lg group-hover:-translate-y-1 transition-all duration-200">
      <!-- Cover image or placeholder -->
      <div class="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center"
           :class="coverColors">
        <img
          v-if="book.cover_url && !imgFailed"
          :src="book.cover_url"
          :alt="book.title"
          class="absolute inset-0 w-full h-full object-cover"
          @error="imgFailed = true"
        />
        <div v-if="!book.cover_url || imgFailed" class="flex flex-col items-center justify-center px-2 text-center">
          <span class="text-white/90 text-2xl font-bold leading-tight drop-shadow">
            {{ book.title.substring(0, 2) }}
          </span>
          <span class="text-white/50 text-[10px] mt-1.5 truncate max-w-full">{{ book.author }}</span>
        </div>
      </div>
      <!-- Book spine effect (left edge) -->
      <div class="absolute left-0 top-0 bottom-0 w-[3px] bg-black/15"></div>
      <!-- Top highlight -->
      <div class="absolute top-0 left-0 right-0 h-px bg-white/20"></div>
      <!-- Action buttons overlay -->
      <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
        <button
          class="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm"
          @click.stop="$emit('delete')"
        >
          <i class="fas fa-times text-[10px]"></i>
        </button>
        <button
          class="absolute top-1.5 left-1.5 w-6 h-6 bg-black/50 hover:bg-primary text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm"
          @click.stop="$emit('edit')"
        >
          <i class="fas fa-pen text-[10px]"></i>
        </button>
      </div>
<!-- PLACEHOLDER_PROGRESS -->
      <!-- Progress bar at bottom of cover -->
      <div class="absolute bottom-0 left-0 right-0 h-[3px] bg-black/20">
        <div class="h-full bg-green-400 transition-all duration-300"
             :style="{ width: progressPercent + '%' }"></div>
      </div>
      <!-- Favorite badge -->
      <div v-if="book.favorite" class="absolute top-0 right-0">
        <div class="w-0 h-0 border-t-[20px] border-t-yellow-400 border-l-[20px] border-l-transparent"></div>
        <i class="fas fa-star text-[6px] text-white absolute top-[2px] right-[2px]"></i>
      </div>
    </div>
    <!-- Book info below cover -->
    <div class="mt-2 px-0.5">
      <div class="text-xs font-semibold dark:text-white leading-tight truncate">{{ book.title }}</div>
      <div class="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{{ book.author }}</div>
      <div class="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">
        {{ progressPercent > 0 ? '已读 ' + progressPercent + '%' : '未读' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  book: { type: Object, required: true },
})
defineEmits(['open', 'delete', 'edit'])

const imgFailed = ref(false)

const progressPercent = computed(() => {
  if (!props.book.total_pages || props.book.total_pages === 0) return 0
  return Math.round(((props.book.current_page || 0) + 1) / props.book.total_pages * 100)
})

// Deterministic color based on book id
const colorPalettes = [
  'from-blue-500/90 to-blue-700',
  'from-emerald-500/90 to-emerald-700',
  'from-violet-500/90 to-violet-700',
  'from-amber-500/90 to-amber-700',
  'from-rose-500/90 to-rose-700',
  'from-cyan-500/90 to-cyan-700',
  'from-indigo-500/90 to-indigo-700',
  'from-teal-500/90 to-teal-700',
]

const coverColors = computed(() => {
  if (props.book.cover_url && !imgFailed.value) return ''
  return colorPalettes[props.book.id % colorPalettes.length]
})
</script>
