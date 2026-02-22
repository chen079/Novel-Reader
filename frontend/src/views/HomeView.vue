<template>
  <div class="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Status Bar -->
    <div class="h-11 flex items-center justify-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <span class="font-semibold text-base dark:text-white">{{ time }}</span>
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden relative">
      <!-- Empty Shelf -->
      <div v-if="!booksStore.loading && booksStore.books.length === 0 && !showFavoritesView"
           class="flex flex-col items-center justify-center h-full px-10 text-center">
        <i class="fas fa-book-open text-6xl text-gray-300 dark:text-gray-600 mb-5"></i>
        <p class="text-lg text-gray-500 dark:text-gray-400 mb-8">书架空空如也<br>导入书籍开始阅读吧</p>
        <button @click="showImport = true"
                class="px-8 py-4 bg-primary text-white rounded-xl text-base font-semibold">
          导入书籍
        </button>
      </div>

      <!-- Has books -->
      <div v-else class="h-full overflow-y-auto pb-20">
        <!-- Continue Reading Card -->
        <div v-if="lastReadBook && !showFavoritesView" class="px-4 pt-4">
          <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm cursor-pointer flex items-center gap-4"
               @click="handleOpenBook(lastReadBook.id)">
            <div class="w-12 h-16 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-lg font-bold text-gray-400 dark:text-gray-500 flex-shrink-0 overflow-hidden">
              <img v-if="lastReadBook.cover_url" :src="lastReadBook.cover_url" class="w-full h-full object-cover" />
              <span v-else>{{ lastReadBook.title.substring(0, 1) }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs text-primary mb-1">继续阅读</div>
              <div class="font-semibold truncate dark:text-white">{{ lastReadBook.title }}</div>
              <div class="text-xs text-gray-400 mt-1">
                已读 {{ lastReadProgress }}% · 第 {{ (lastReadBook.current_page || 0) + 1 }} 页
              </div>
            </div>
            <div class="flex-shrink-0">
              <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <i class="fas fa-play text-primary text-sm"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Book Shelf -->
        <BookShelf
          :books="displayBooks"
          :title="showFavoritesView ? '我的收藏' : '我的书架'"
          @open="handleOpenBook"
          @delete="handleDeleteBook"
          @edit="handleEditBook"
        />
      </div>
    </div>

    <!-- Tab Bar -->
    <TabBar
      :active-tab="activeTab"
      @switch="handleTabSwitch"
    />

    <!-- Import Panel -->
    <ImportPanel v-if="showImport" @close="showImport = false" />

    <!-- Settings Panel -->
    <Settings :visible="showSettingsPanel" @close="showSettingsPanel = false" />

    <!-- Book Edit Modal -->
    <BookEditModal
      v-if="editingBook"
      :book="editingBook"
      @close="editingBook = null"
      @saved="editingBook = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBooksStore } from '../stores/books'
import { useUserStore } from '../stores/user'
import BookShelf from '../components/BookShelf.vue'
import TabBar from '../components/TabBar.vue'
import ImportPanel from '../components/ImportPanel.vue'
import Settings from '../components/Settings.vue'
import BookEditModal from '../components/BookEditModal.vue'

const router = useRouter()
const booksStore = useBooksStore()
const userStore = useUserStore()

const time = ref('')
const activeTab = ref('shelf')
const showImport = ref(false)
const showSettingsPanel = ref(false)
const showFavoritesView = ref(false)
const editingBook = ref(null)

const displayBooks = computed(() =>
  showFavoritesView.value ? booksStore.favoriteBooks : booksStore.books
)

// Find the most recently read book (has progress > 0)
const lastReadBook = computed(() => {
  const withProgress = booksStore.books.filter(b => b.current_page > 0 && b.total_pages > 0)
  if (withProgress.length === 0) return null
  return withProgress.reduce((latest, b) =>
    new Date(b.created_at) > new Date(latest.created_at) ? b : latest
  )
})

const lastReadProgress = computed(() => {
  if (!lastReadBook.value || !lastReadBook.value.total_pages) return 0
  return Math.round(((lastReadBook.value.current_page || 0) + 1) / lastReadBook.value.total_pages * 100)
})

function updateTime() {
  const now = new Date()
  time.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

let timer
onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 60000)
  booksStore.fetchBooks()
})
onUnmounted(() => clearInterval(timer))

function handleTabSwitch(tab) {
  activeTab.value = tab
  if (tab === 'shelf') {
    showFavoritesView.value = false
    showSettingsPanel.value = false
  } else if (tab === 'favorites') {
    showFavoritesView.value = true
    showSettingsPanel.value = false
  } else if (tab === 'import') {
    showImport.value = true
  } else if (tab === 'settings') {
    showSettingsPanel.value = !showSettingsPanel.value
  }
}

function handleOpenBook(bookId) {
  router.push(`/reader/${bookId}`)
}

async function handleDeleteBook(bookId) {
  const book = booksStore.books.find(b => b.id === bookId)
  if (book && confirm(`确认删除《${book.title}》吗？`)) {
    await booksStore.deleteBook(bookId)
  }
}

function handleEditBook(book) {
  editingBook.value = book
}
</script>
