<template>
  <div class="flex flex-col h-screen" :class="themeClass">
    <!-- Top Bar (toggleable) — in flip mode use absolute overlay so it doesn't affect pagination -->
    <div v-show="effectiveToolbarVisible" class="h-11 flex items-center justify-between px-3 border-b transition-all duration-300"
         :class="[
           isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200',
           (readMode === 'flip' || readMode === 'paginate' || readMode === 'scroll') ? 'absolute top-0 left-0 right-0 z-[100]' : ''
         ]">
      <div class="flex items-center gap-3">
        <button class="w-8 h-8 flex items-center justify-center" @click="$router.push('/')">
          <i class="fas fa-arrow-left"></i>
        </button>
        <button class="w-8 h-8 flex items-center justify-center" @click="showToc = true">
          <i class="fas fa-list"></i>
        </button>
      </div>
      <span class="font-semibold text-sm truncate max-w-[40%]">{{ booksStore.currentBook?.title || time }}</span>
      <div class="flex items-center gap-3">
        <button class="w-8 h-8 flex items-center justify-center" @click="toggleSearch">
          <i class="fas fa-search"></i>
        </button>
        <button class="w-8 h-8 flex items-center justify-center" @click="handleAddBookmark">
          <i class="fas fa-bookmark" :class="isCurrentPageBookmarked ? 'text-yellow-500' : ''"></i>
        </button>
        <button class="w-8 h-8 flex items-center justify-center" @click="showBookmarkList = !showBookmarkList">
          <i class="fas fa-list-ul text-sm"></i>
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <div v-if="showSearch" class="flex items-center gap-2 px-3 py-2 border-b"
         :class="[
           isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200',
           'absolute top-11 left-0 right-0 z-[100]'
         ]">
      <input ref="searchInput" v-model="searchKeyword" type="text" placeholder="搜索内容..."
             class="flex-1 px-3 py-1.5 rounded text-sm border"
             :class="isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'"
             @keydown.enter="doSearch" />
      <button class="text-sm px-2 py-1" @click="doSearch">
        <i class="fas fa-search"></i>
      </button>
      <button class="text-sm px-2 py-1" @click="booksStore.prevSearchResult(); goToSearchResult()">
        <i class="fas fa-chevron-up"></i>
      </button>
      <button class="text-sm px-2 py-1" @click="booksStore.nextSearchResult(); goToSearchResult()">
        <i class="fas fa-chevron-down"></i>
      </button>
      <span v-if="booksStore.searchResults.length > 0" class="text-xs whitespace-nowrap"
            :class="isDark ? 'text-gray-400' : 'text-gray-500'">
        {{ booksStore.searchIndex + 1 }}/{{ booksStore.searchResults.length }}
      </span>
      <button class="text-sm px-2 py-1" @click="closeSearch">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- Bookmark List Panel -->
    <div v-if="showBookmarkList" class="absolute top-11 right-0 w-72 max-h-80 overflow-y-auto z-[150] rounded-bl-lg shadow-lg border"
         :class="isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'">
      <div class="p-3 border-b font-semibold text-sm flex items-center justify-between"
           :class="isDark ? 'border-gray-700' : 'border-gray-200'">
        <span>书签列表</span>
        <button class="text-xs px-2 py-1 rounded"
                :class="isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'"
                @click="handleAddBookmark">
          <i class="fas fa-plus mr-1"></i>添加书签
        </button>
      </div>
      <div v-if="booksStore.bookmarks.length === 0" class="p-3 text-center text-gray-400 text-sm">
        暂无书签
      </div>
      <div v-for="bm in booksStore.bookmarks" :key="bm.id"
           class="flex items-center justify-between px-3 py-2 border-b cursor-pointer text-sm"
           :class="isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'"
           @click="jumpToBookmark(bm.page)">
        <div class="flex-1 min-w-0">
          <div class="text-xs text-gray-400">第 {{ bm.page + 1 }} 页</div>
          <div v-if="editingBookmarkId !== bm.id" class="truncate">{{ bm.note || '未命名书签' }}</div>
          <input v-else
                 v-model="editingBookmarkNote"
                 class="w-full text-sm px-1 py-0.5 rounded border mt-0.5"
                 :class="isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'"
                 @click.stop
                 @keydown.enter="saveBookmarkNote(bm.id)"
                 @blur="saveBookmarkNote(bm.id)" />
        </div>
        <div class="flex items-center gap-1 ml-2 shrink-0">
          <button class="text-gray-400 hover:text-blue-500 text-xs" @click.stop="startEditBookmark(bm)">
            <i class="fas fa-pen"></i>
          </button>
          <button class="text-gray-400 hover:text-red-500 text-xs" @click.stop="booksStore.removeBookmark(bm.id)">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Reader Content -->
    <div class="flex-1 overflow-hidden relative" :class="readerBg">
      <!-- Scroll Mode -->
      <div v-if="readMode === 'scroll'" ref="pageContainer" class="absolute inset-0 overflow-y-auto"
           :style="{ top: effectiveToolbarVisible ? '2.75rem' : '0' }"
           @scroll="onScrollUpdate">
        <div v-for="(page, idx) in booksStore.currentPages" :key="idx"
             :ref="el => { if (el) scrollPageRefs[idx] = el }"
             class="scroll-page page-content max-w-[600px] mx-auto text-lg text-justify px-8 py-5"
             :style="contentStyle"
             v-html="page">
        </div>
      </div>

      <!-- Paginate Mode -->
      <div v-else-if="readMode === 'paginate'" class="absolute inset-0 flex flex-col" ref="pageEl"
           :style="{ top: effectiveToolbarVisible ? '2.75rem' : '0' }">
        <!-- Scrollable page content area -->
        <div class="flex-1 overflow-y-auto px-8 py-6 relative" ref="pageContentEl" @scroll="onPaginateScroll">
          <!-- Book title on first page -->
          <div v-if="booksStore.currentPage === 0 && booksStore.currentBook"
               class="text-center font-bold text-[22px] mb-5"
               :class="isDark ? 'text-white' : ''">
            {{ booksStore.currentBook.title }}
          </div>
          <div class="page-content max-w-[600px] mx-auto text-lg text-justify"
               :style="contentStyle"
               v-html="highlightedPageContent">
          </div>
          <!-- Side navigation buttons (floating) -->
          <button v-if="booksStore.currentPage > 0"
                  class="fixed left-1 top-1/2 -translate-y-1/2 w-8 h-16 flex items-center justify-center rounded-r-lg opacity-30 hover:opacity-80 transition-opacity z-20"
                  :class="isDark ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-600'"
                  @click="booksStore.prevPage()">
            <i class="fas fa-chevron-left text-sm"></i>
          </button>
          <button v-if="booksStore.currentPage < booksStore.totalPages - 1"
                  class="fixed right-1 top-1/2 -translate-y-1/2 w-8 h-16 flex items-center justify-center rounded-l-lg opacity-30 hover:opacity-80 transition-opacity z-20"
                  :class="isDark ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-600'"
                  @click="booksStore.nextPage()">
            <i class="fas fa-chevron-right text-sm"></i>
          </button>

          <!-- Bottom page navigation bar (inside content area) -->
          <div class="max-w-[600px] mx-auto mt-8 mb-2 flex items-center justify-between gap-2 py-3 px-2 border-t"
               :class="isDark ? 'border-gray-700' : 'border-gray-200'">
            <button class="h-9 px-4 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                    :class="booksStore.currentPage > 0
                      ? (isDark ? 'bg-gray-700 text-gray-200 active:bg-gray-600' : 'bg-gray-100 text-gray-700 active:bg-gray-200')
                      : (isDark ? 'bg-gray-800 text-gray-600' : 'bg-gray-50 text-gray-300')"
                    :disabled="booksStore.currentPage <= 0"
                    @click="booksStore.prevPage()">
              <i class="fas fa-chevron-left text-xs"></i> 上一页
            </button>
            <div class="flex items-center gap-1 text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              <input type="number" :min="1" :max="booksStore.totalPages"
                     :value="booksStore.currentPage + 1"
                     class="w-12 text-center py-1 border rounded text-sm"
                     :class="isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'"
                     @keydown.enter="jumpToPage($event)"
                     @blur="jumpToPage($event)" />
              <span>/ {{ booksStore.totalPages }}</span>
            </div>
            <button class="h-9 px-4 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                    :class="booksStore.currentPage < booksStore.totalPages - 1
                      ? (isDark ? 'bg-gray-700 text-gray-200 active:bg-gray-600' : 'bg-gray-100 text-gray-700 active:bg-gray-200')
                      : (isDark ? 'bg-gray-800 text-gray-600' : 'bg-gray-50 text-gray-300')"
                    :disabled="booksStore.currentPage >= booksStore.totalPages - 1"
                    @click="booksStore.nextPage()">
              下一页 <i class="fas fa-chevron-right text-xs"></i>
            </button>
          </div>
        </div>

        <!-- Paginate Footer -->
        <div v-show="!paginateBarsHidden" class="flex justify-center items-center py-2 px-4 text-xs z-20"
             :class="isDark ? 'text-gray-500' : 'text-gray-400'">
          <span>{{ readingProgress }}%</span>
        </div>
      </div>

      <!-- Flip Mode -->
      <div v-else class="absolute inset-0 flex flex-col" ref="flipEl"
           :style="{ top: effectiveToolbarVisible ? '2.75rem' : '0' }">
        <!-- Touch/Click zones -->
        <div class="absolute inset-0 flex z-10"
             @touchstart="onTouchStart" @touchend="onTouchEnd">
          <div class="w-1/3 h-full" @click="handleZoneClick('left')"></div>
          <div class="w-1/3 h-full" @click="handleZoneClick('center')"></div>
          <div class="w-1/3 h-full" @click="handleZoneClick('right')"></div>
        </div>

        <!-- Single discrete page (no scrolling) -->
        <div class="flex-1 overflow-hidden px-8 py-6" ref="flipContainer">
          <div class="page-content max-w-[600px] mx-auto text-lg text-justify h-full"
               :style="contentStyle"
               v-html="currentFlipPageContent">
          </div>
        </div>

        <!-- Hidden measurement div for page splitting -->
        <div ref="flipMeasure" class="absolute" style="visibility:hidden;left:-9999px;top:0;overflow:hidden;"></div>

        <!-- Flip Footer -->
        <div class="flex justify-between items-center py-2 px-4 text-sm z-20"
             :class="isDark ? 'text-gray-400' : 'text-gray-500'">
          <div class="flex items-center gap-1">
            <span>{{ flipCurrentPage + 1 }} / {{ flipPages.length || 1 }}</span>
          </div>
          <div class="text-xs">{{ flipProgress }}%</div>
        </div>
      </div>
    </div>

    <!-- Tab Bar -->
    <TabBar :active-tab="'shelf'" :hidden="!effectiveToolbarVisible" @switch="handleTabSwitch" />

    <!-- Settings Panel -->
    <Settings :visible="showSettings" @close="showSettings = false" />

    <!-- Table of Contents -->
    <TableOfContents :visible="showToc" @close="showToc = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useBooksStore } from '../stores/books'
import TabBar from '../components/TabBar.vue'
import Settings from '../components/Settings.vue'
import TableOfContents from '../components/TableOfContents.vue'

const route = useRoute()
const router = useRouter()
const booksStore = useBooksStore()

const time = ref('')
const showToolbar = ref(true)
const showSettings = ref(false)
const showToc = ref(false)
const showSearch = ref(false)
const showBookmarkList = ref(false)
const editingBookmarkId = ref(null)
const editingBookmarkNote = ref('')
const searchKeyword = ref('')
const searchInput = ref(null)
const pageContainer = ref(null)
const pageEl = ref(null)
const pageContentEl = ref(null)
const flipEl = ref(null)
const flipContainer = ref(null)
const flipMeasure = ref(null)

// Scroll mode page refs for position tracking
const scrollPageRefs = ref({})
let scrollSaveTimer = null

// Paginate mode auto-hide bars
const paginateBarsHidden = ref(false)
let paginateLastScrollTop = 0

// Scroll mode auto-hide bars
const scrollBarsHidden = ref(false)
let scrollLastScrollTop = 0

// Flip mode local state
const flipPages = ref([])
const flipCurrentPage = ref(0)
let flipPageStartIndices = [] // tracks which child element index starts each page
let storePageChildCounts = [] // cumulative child count per store page
let syncingFlipPage = false // prevent circular sync between flipCurrentPage and booksStore.currentPage
let pendingFlipRestore = null // flip page to restore on first build

// Touch tracking
let touchStartX = 0
let touchStartY = 0

// Debounced position save
let positionSaveTimer = null

function saveCurrentPosition() {
  const bookId = booksStore.currentBook?.id
  if (!bookId) return
  const extra = {}
  if (readMode.value === 'scroll' && pageContainer.value) {
    extra.scrollTop = pageContainer.value.scrollTop
  }
  if (readMode.value === 'flip') {
    extra.flipPage = flipCurrentPage.value
  }
  booksStore.saveReadingPosition(bookId, extra)
}

function debouncedSavePosition() {
  clearTimeout(positionSaveTimer)
  positionSaveTimer = setTimeout(saveCurrentPosition, 500)
}

const readMode = computed(() => booksStore.settings.readMode)
const isDark = computed(() => booksStore.settings.nightMode)

const effectiveToolbarVisible = computed(() => {
  if (readMode.value === 'paginate') return !paginateBarsHidden.value
  if (readMode.value === 'scroll') return !scrollBarsHidden.value
  return showToolbar.value
})

const themeClass = computed(() => {
  const t = booksStore.settings.theme
  if (isDark.value) return 'dark'
  if (t === 'sepia') return 'theme-sepia'
  if (t === 'green') return 'theme-green'
  return ''
})

const readerBg = computed(() => {
  if (isDark.value) return 'bg-[#1a1a1a] text-gray-300'
  const t = booksStore.settings.theme
  if (t === 'sepia') return 'bg-[#f0e6d2] text-[#5b4636]'
  if (t === 'green') return 'bg-[#edf7ed] text-[#2d5a2d]'
  return 'bg-[#f9f9f9] text-gray-800'
})

const fontFamilyMap = {
  default: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
  songti: '"SimSun", "宋体", serif',
  kaiti: '"KaiTi", "楷体", serif',
  heiti: '"SimHei", "黑体", sans-serif',
}

const contentStyle = computed(() => ({
  fontSize: booksStore.settings.fontSize + 'px',
  lineHeight: String(booksStore.settings.lineHeight),
  fontFamily: fontFamilyMap[booksStore.settings.fontFamily] || fontFamilyMap.default,
}))

const readingProgress = computed(() => {
  if (booksStore.totalPages === 0) return 0
  return Math.round(((booksStore.currentPage + 1) / booksStore.totalPages) * 100)
})

const flipProgress = computed(() => {
  if (flipPages.value.length === 0) return 0
  return Math.round(((flipCurrentPage.value + 1) / flipPages.value.length) * 100)
})

// Current flip page content (one discrete screen)
const currentFlipPageContent = computed(() => {
  if (flipPages.value.length === 0) return ''
  return flipPages.value[flipCurrentPage.value] || ''
})

const currentPageContent = computed(() =>
  booksStore.currentPages[booksStore.currentPage] || ''
)

const isCurrentPageBookmarked = computed(() =>
  booksStore.bookmarks.some(b => b.page === booksStore.currentPage)
)

// Highlight search keyword in current page content
const highlightedPageContent = computed(() => {
  const content = currentPageContent.value
  if (booksStore.searchResults.length === 0 || booksStore.searchIndex < 0) return content
  const result = booksStore.searchResults[booksStore.searchIndex]
  if (!result || result.page !== booksStore.currentPage) return content
  const keyword = result.keyword
  if (!keyword) return content
  // Highlight all occurrences of keyword in the HTML text nodes
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return content.replace(/>([^<]*)</g, (match, text) => {
    return '>' + text.replace(regex, '<mark class="search-highlight">$1</mark>') + '<'
  })
})

function updateTime() {
  const now = new Date()
  time.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

// Click zone handler (used by flip mode)
function handleZoneClick(zone) {
  if (zone === 'left') {
    flipPrev()
  } else if (zone === 'right') {
    flipNext()
  } else {
    showToolbar.value = !showToolbar.value
    showBookmarkList.value = false
  }
}

// Flip mode navigation
function flipNext() {
  if (flipCurrentPage.value < flipPages.value.length - 1) {
    flipCurrentPage.value++
  }
}

function flipPrev() {
  if (flipCurrentPage.value > 0) {
    flipCurrentPage.value--
  }
}

// Build discrete flip pages by measuring actual element heights
function buildFlipPages() {
  if (!flipContainer.value || !flipMeasure.value) return

  const cs = getComputedStyle(flipContainer.value)
  const padTop = parseFloat(cs.paddingTop)
  const padBottom = parseFloat(cs.paddingBottom)
  const padLeft = parseFloat(cs.paddingLeft)
  const padRight = parseFloat(cs.paddingRight)
  const availableH = flipContainer.value.clientHeight - padTop - padBottom
  const innerW = flipContainer.value.clientWidth - padLeft - padRight

  if (availableH <= 0 || innerW <= 0) return

  const allHtml = booksStore.currentPages.join('')
  if (!allHtml) {
    flipPages.value = []
    return
  }

  const fs = booksStore.settings.fontSize
  const lh = booksStore.settings.lineHeight
  const ff = fontFamilyMap[booksStore.settings.fontFamily] || fontFamilyMap.default

  // Render all content into hidden measurement div with identical styling
  const measure = flipMeasure.value
  measure.style.width = innerW + 'px'
  measure.innerHTML = '<div class="page-content" style="max-width:600px;margin:0 auto;font-size:' + fs + 'px;line-height:' + lh + ';font-family:' + ff + ';text-align:justify;">' + allHtml + '</div>'

  const wrapper = measure.firstElementChild
  const children = Array.from(wrapper.children)

  if (children.length === 0) {
    flipPages.value = [allHtml]
    return
  }

  // Pre-compute cumulative child counts for store pages (for page index conversion)
  storePageChildCounts = []
  let cumCount = 0
  for (const pageHtml of booksStore.currentPages) {
    const tmp = document.createElement('div')
    tmp.innerHTML = pageHtml
    cumCount += tmp.children.length
    storePageChildCounts.push(cumCount)
  }

  // Record the anchor child index from the current page before rebuilding
  let anchorChildIdx = 0
  if (flipPageStartIndices.length > 0 && flipCurrentPage.value < flipPageStartIndices.length) {
    anchorChildIdx = flipPageStartIndices[flipCurrentPage.value]
  } else if (flipPageStartIndices.length === 0 && booksStore.currentPage > 0 && storePageChildCounts.length > 0) {
    // First build: use saved store page to determine anchor
    anchorChildIdx = booksStore.currentPage > 0 && booksStore.currentPage <= storePageChildCounts.length
      ? storePageChildCounts[booksStore.currentPage - 1] : 0
  }

  // Group children into pages by measuring offsetTop
  // Force page break before chapter titles
  const pages = []
  const startIndices = []
  let pageStartIdx = 0
  let pageStartOffset = children[0].offsetTop

  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const isChapter = child.classList && child.classList.contains('chapter-title')
    const childBottom = child.offsetTop + child.offsetHeight - pageStartOffset

    // Start a new page if: content overflows OR this is a chapter title (and not the first element on the page)
    if ((childBottom > availableH || isChapter) && i > pageStartIdx) {
      pages.push(children.slice(pageStartIdx, i).map(c => c.outerHTML).join(''))
      startIndices.push(pageStartIdx)
      pageStartIdx = i
      pageStartOffset = children[i].offsetTop
    }
  }
  // Last page
  if (pageStartIdx < children.length) {
    pages.push(children.slice(pageStartIdx).map(c => c.outerHTML).join(''))
    startIndices.push(pageStartIdx)
  }

  flipPages.value = pages
  flipPageStartIndices = startIndices

  // Find the page that contains the anchor child index
  let newPage = 0
  for (let i = 0; i < startIndices.length; i++) {
    if (startIndices[i] <= anchorChildIdx) {
      newPage = i
    } else {
      break
    }
  }
  flipCurrentPage.value = Math.min(newPage, Math.max(0, pages.length - 1))

  // Restore from localStorage on first build if available
  if (pendingFlipRestore !== null) {
    const target = Math.min(pendingFlipRestore, Math.max(0, pages.length - 1))
    flipCurrentPage.value = target
    pendingFlipRestore = null
  }

  // Clean up measurement div
  measure.innerHTML = ''

  // Sync store page from the new flip page
  syncingFlipPage = true
  const newStorePage = flipPageToStorePage(flipCurrentPage.value)
  if (newStorePage !== booksStore.currentPage) {
    booksStore.goToPage(newStorePage)
  }
  nextTick(() => { syncingFlipPage = false })
}

// Convert store page index to flip page index
function storePageToFlipPage(storePageIdx) {
  if (flipPageStartIndices.length === 0) return 0
  const targetChildIdx = storePageIdx > 0 && storePageIdx <= storePageChildCounts.length
    ? storePageChildCounts[storePageIdx - 1] : 0
  let flipPage = 0
  for (let i = 0; i < flipPageStartIndices.length; i++) {
    if (flipPageStartIndices[i] <= targetChildIdx) {
      flipPage = i
    } else {
      break
    }
  }
  return Math.min(flipPage, Math.max(0, flipPages.value.length - 1))
}

// Convert flip page index to store page index
function flipPageToStorePage(flipPageIdx) {
  if (flipPageStartIndices.length === 0 || storePageChildCounts.length === 0) return 0
  const targetChildIdx = flipPageStartIndices[flipPageIdx] || 0
  for (let i = 0; i < storePageChildCounts.length; i++) {
    if (storePageChildCounts[i] > targetChildIdx) return i
  }
  return Math.max(0, booksStore.currentPages.length - 1)
}

// Touch swipe handlers
function onTouchStart(e) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  // Only trigger if horizontal swipe > 50px and more horizontal than vertical
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) {
      // Swipe left -> next page
      flipNext()
    } else {
      // Swipe right -> prev page
      flipPrev()
    }
  }
}

function jumpToPage(e) {
  const page = parseInt(e.target.value) - 1
  if (!isNaN(page) && page >= 0 && page < booksStore.totalPages) {
    booksStore.goToPage(page)
  } else {
    e.target.value = booksStore.currentPage + 1
  }
}

// Scroll mode: track which page is visible, save progress, auto-hide bars
function onScrollUpdate() {
  if (readMode.value !== 'scroll' || !pageContainer.value) return

  // Auto-hide bars based on scroll direction
  const scrollTop = pageContainer.value.scrollTop
  if (scrollTop > scrollLastScrollTop && scrollTop > 30) {
    scrollBarsHidden.value = true
  } else if (scrollTop < scrollLastScrollTop) {
    scrollBarsHidden.value = false
  }
  scrollLastScrollTop = scrollTop

  clearTimeout(scrollSaveTimer)
  scrollSaveTimer = setTimeout(() => {
    const containerTop = pageContainer.value.scrollTop
    const containerH = pageContainer.value.clientHeight
    const midPoint = containerTop + containerH / 3
    let visiblePage = 0
    for (const [idx, el] of Object.entries(scrollPageRefs.value)) {
      if (el && el.offsetTop <= midPoint) {
        visiblePage = parseInt(idx)
      }
    }
    if (visiblePage !== booksStore.currentPage) {
      booksStore.goToPage(visiblePage)
    }
    debouncedSavePosition()
  }, 300)
}

// Scroll mode: scroll to saved page position (prefer exact scrollTop from localStorage)
function scrollToSavedPage() {
  if (!pageContainer.value) return
  const bookId = booksStore.currentBook?.id
  const localPos = bookId ? booksStore.loadReadingPosition(bookId) : null
  if (localPos && localPos.scrollTop > 0) {
    pageContainer.value.scrollTop = localPos.scrollTop
    return
  }
  const targetPage = booksStore.currentPage
  const el = scrollPageRefs.value[targetPage]
  if (el) {
    el.scrollIntoView({ behavior: 'instant', block: 'start' })
  }
}

// Paginate mode: auto-hide bars on scroll down, show on scroll up / not scrollable
function onPaginateScroll() {
  if (!pageContentEl.value) return
  const el = pageContentEl.value
  const scrollTop = el.scrollTop
  const isScrollable = el.scrollHeight > el.clientHeight + 10

  if (!isScrollable) {
    paginateBarsHidden.value = false
    paginateLastScrollTop = 0
    return
  }

  if (scrollTop > paginateLastScrollTop && scrollTop > 30) {
    // Scrolling down
    paginateBarsHidden.value = true
  } else if (scrollTop < paginateLastScrollTop) {
    // Scrolling up
    paginateBarsHidden.value = false
  }
  paginateLastScrollTop = scrollTop
}

// Search
function toggleSearch() {
  showSearch.value = !showSearch.value
  if (showSearch.value) {
    nextTick(() => searchInput.value?.focus())
  } else {
    closeSearch()
  }
}

function doSearch() {
  booksStore.searchInBook(searchKeyword.value)
  goToSearchResult()
}

function goToSearchResult() {
  const results = booksStore.searchResults
  const idx = booksStore.searchIndex
  if (results.length > 0 && idx >= 0) {
    booksStore.goToPage(results[idx].page)
  }
}

function closeSearch() {
  showSearch.value = false
  searchKeyword.value = ''
  booksStore.searchInBook('')
}

// Bookmarks
async function handleAddBookmark() {
  const note = prompt('书签名称（可留空）：', '') ?? ''
  await booksStore.addBookmark(note)
}

function startEditBookmark(bm) {
  editingBookmarkId.value = bm.id
  editingBookmarkNote.value = bm.note || ''
}

async function saveBookmarkNote(bookmarkId) {
  if (editingBookmarkId.value === bookmarkId) {
    await booksStore.updateBookmark(bookmarkId, editingBookmarkNote.value)
    editingBookmarkId.value = null
    editingBookmarkNote.value = ''
  }
}

function jumpToBookmark(page) {
  booksStore.goToPage(page)
  showBookmarkList.value = false
}

function handleTabSwitch(tab) {
  if (tab === 'shelf') {
    router.push('/')
  } else if (tab === 'favorites') {
    router.push('/')
  } else if (tab === 'settings') {
    showSettings.value = !showSettings.value
  }
}

// Reset scroll on page change (paginate mode) & sync flip page from store page
watch(() => booksStore.currentPage, () => {
  if (pageContentEl.value) {
    pageContentEl.value.scrollTop = 0
  }
  // Reset bars visibility on page change, then check if content is scrollable
  if (readMode.value === 'paginate') {
    paginateBarsHidden.value = false
    paginateLastScrollTop = 0
    nextTick(() => {
      if (pageContentEl.value) {
        const isScrollable = pageContentEl.value.scrollHeight > pageContentEl.value.clientHeight + 10
        if (!isScrollable) {
          paginateBarsHidden.value = false
        }
      }
    })
  }
  // Sync store page → flip page (e.g. TOC jump, bookmark jump)
  if (readMode.value === 'flip' && !syncingFlipPage && flipPages.value.length > 0) {
    syncingFlipPage = true
    flipCurrentPage.value = storePageToFlipPage(booksStore.currentPage)
    nextTick(() => { syncingFlipPage = false })
  }
  debouncedSavePosition()
})

// Sync flip page → store page (user navigating in flip mode)
watch(flipCurrentPage, (newPage) => {
  if (readMode.value === 'flip' && !syncingFlipPage && flipPageStartIndices.length > 0) {
    syncingFlipPage = true
    const storePage = flipPageToStorePage(newPage)
    if (storePage !== booksStore.currentPage) {
      booksStore.goToPage(storePage)
    }
    nextTick(() => { syncingFlipPage = false })
  }
  debouncedSavePosition()
})

// Recalc flip pages when mode switches to flip or content/settings change
watch([readMode, () => booksStore.currentPages, () => booksStore.settings.fontSize, () => booksStore.settings.lineHeight, () => booksStore.settings.fontFamily], () => {
  if (readMode.value === 'flip') {
    nextTick(() => buildFlipPages())
  }
})

let timer
let resizeObserver = null

function onBeforeUnloadHandler() {
  saveCurrentPosition()
}

onMounted(async () => {
  updateTime()
  timer = setInterval(updateTime, 60000)
  window.addEventListener('beforeunload', onBeforeUnloadHandler)

  const bookId = parseInt(route.params.id)
  if (bookId) {
    await booksStore.openBook(bookId)
    const localPos = booksStore.loadReadingPosition(bookId)

    // Restore position based on mode
    if (readMode.value === 'scroll') {
      nextTick(() => {
        requestAnimationFrame(() => scrollToSavedPage())
      })
    } else if (readMode.value === 'flip' && localPos?.flipPage !== undefined) {
      // Flip mode: restore after flip pages are built (handled in buildFlipPages via anchor)
      // Store the target flip page for the first build
      pendingFlipRestore = localPos.flipPage
    }
  }
  // Setup resize observer for flip mode
  nextTick(() => {
    if (flipContainer.value) {
      resizeObserver = new ResizeObserver(() => buildFlipPages())
      resizeObserver.observe(flipContainer.value)
    }
  })
  // Watch for flip container appearing later (mode switch)
  watch(() => flipContainer.value, (el) => {
    if (resizeObserver) resizeObserver.disconnect()
    if (el) {
      resizeObserver = new ResizeObserver(() => buildFlipPages())
      resizeObserver.observe(el)
      nextTick(() => buildFlipPages())
    }
  })
})

onBeforeRouteLeave(() => {
  saveCurrentPosition()
})

onUnmounted(() => {
  saveCurrentPosition()
  clearInterval(timer)
  clearTimeout(positionSaveTimer)
  window.removeEventListener('beforeunload', onBeforeUnloadHandler)
  if (resizeObserver) resizeObserver.disconnect()
})
</script>
