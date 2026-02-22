import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'
import { getCachedBook, cacheBook, removeCachedBook } from '../utils/bookCache'

export const useBooksStore = defineStore('books', () => {
  const books = ref([])
  const currentBook = ref(null)
  const currentContent = ref('')
  const currentPages = ref([])
  const currentPage = ref(0)
  const totalPages = ref(0)
  const loading = ref(false)

  // Chapter list extracted during pagination
  const chapters = ref([])

  // Bookmarks for current book
  const bookmarks = ref([])

  // Search state
  const searchResults = ref([])
  const searchIndex = ref(-1)

  // Migrate old scrollMode → readMode
  function getInitialReadMode() {
    const stored = localStorage.getItem('readMode')
    if (stored) return stored
    // Migration: old scrollMode boolean
    const oldScroll = localStorage.getItem('scrollMode')
    if (oldScroll === 'true') {
      localStorage.setItem('readMode', 'scroll')
      localStorage.removeItem('scrollMode')
      return 'scroll'
    }
    return 'paginate'
  }

  const settings = ref({
    fontSize: parseInt(localStorage.getItem('fontSize') || '18'),
    nightMode: localStorage.getItem('nightMode') === 'true',
    readMode: getInitialReadMode(),
    theme: localStorage.getItem('theme') || 'light',
    lineHeight: parseFloat(localStorage.getItem('lineHeight') || '1.8'),
    fontFamily: localStorage.getItem('fontFamily') || 'default',
  })

  const favoriteBooks = computed(() => books.value.filter(b => b.favorite))

  async function fetchBooks() {
    loading.value = true
    try {
      const { data } = await api.get('/books')
      books.value = data
    } finally {
      loading.value = false
    }
  }

  async function uploadBook(file, onProgress) {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/books/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })
    await fetchBooks()
    return data
  }

  async function openBook(bookId) {
    loading.value = true
    try {
      const bookMeta = books.value.find(b => b.id === bookId)
      let content = null

      // Try IndexedDB cache first
      const cached = await getCachedBook(bookId)
      if (cached && bookMeta && cached.md5 === bookMeta.md5) {
        content = cached.content
      }

      // Fallback to API if not cached or md5 mismatch
      if (!content) {
        const { data } = await api.get(`/books/${bookId}/content`)
        content = data.content
        currentBook.value = bookMeta || data
        // Cache to IndexedDB
        const md5 = bookMeta?.md5 || data.md5 || ''
        await cacheBook(bookId, content, md5)

        // Use backend page if no local position
        if (!loadReadingPosition(bookId)) {
          currentPage.value = data.current_page
        }
      } else {
        currentBook.value = bookMeta
      }

      currentContent.value = content

      // Restore from localStorage if available
      const localPos = loadReadingPosition(bookId)
      if (localPos && localPos.page !== undefined) {
        currentPage.value = localPos.page
      }

      const result = paginateContent(content)
      currentPages.value = result.pages
      chapters.value = result.chapters
      totalPages.value = currentPages.value.length

      // Clamp page to valid range
      if (currentPage.value >= totalPages.value) {
        currentPage.value = Math.max(0, totalPages.value - 1)
      }

      await api.put(`/books/${bookId}/progress`, {
        current_page: currentPage.value,
        total_pages: totalPages.value,
      }).catch(() => {})

      // Load bookmarks
      await fetchBookmarks(bookId).catch(() => {})
    } finally {
      loading.value = false
    }
  }

  function paginateContent(content, pageSize = 2000) {
    content = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.replace(/^[\s\u3000\t]+/, ''))
      .filter(line => line.trim() !== '')
      .join('\n')

    const chapterRegex = /^(第[零一二三四五六七八九十百千万\d]+章|第[零一二三四五六七八九十百千万\d]+节|Chapter \d+|CHAPTER \d+|Section \d+|章节 \d+|\d+\.\s+.*)/

    const pages = []
    const chapterList = []
    let page = ''
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (chapterRegex.test(line)) {
        if (page.trim().length > 0) {
          pages.push(page.trim())
          page = ''
        }
        // Record chapter with its page index
        chapterList.push({ title: line, pageIndex: pages.length })
        page += `<div class="chapter-title">${escapeHtml(line)}</div>\n\n`
      } else {
        page += `<p>${escapeHtml(line)}</p>\n`
        if (page.length >= pageSize) {
          const lastNewLine = page.lastIndexOf('\n', pageSize)
          if (lastNewLine > 0) {
            const pageContent = page.substring(0, lastNewLine).trim()
            if (pageContent) pages.push(pageContent)
            page = page.substring(lastNewLine + 1)
          } else {
            pages.push(page.trim())
            page = ''
          }
        }
      }
    }
    if (page.trim().length > 0) {
      pages.push(page.trim())
    }
    return { pages, chapters: chapterList }
  }

  function escapeHtml(text) {
    const div = typeof document !== 'undefined' ? document.createElement('div') : null
    if (div) {
      div.textContent = text
      return div.innerHTML
    }
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  // Search in raw content, return [{page, text}]
  function searchInBook(keyword) {
    if (!keyword || !currentContent.value) {
      searchResults.value = []
      searchIndex.value = -1
      return
    }
    const results = []
    const rawLines = currentContent.value.split(/\r?\n/).filter(l => l.trim())
    // Build a map: for each line, which page does it belong to?
    // We re-scan pages to find keyword matches
    const lowerKeyword = keyword.toLowerCase()
    for (let pageIdx = 0; pageIdx < currentPages.value.length; pageIdx++) {
      const pageHtml = currentPages.value[pageIdx]
      // Strip HTML to get plain text
      const tmp = document.createElement('div')
      tmp.innerHTML = pageHtml
      const plainText = tmp.textContent || ''
      let pos = 0
      const lowerPlain = plainText.toLowerCase()
      while ((pos = lowerPlain.indexOf(lowerKeyword, pos)) !== -1) {
        const start = Math.max(0, pos - 20)
        const end = Math.min(plainText.length, pos + keyword.length + 20)
        const snippet = (start > 0 ? '...' : '') + plainText.substring(start, end) + (end < plainText.length ? '...' : '')
        results.push({ page: pageIdx, text: snippet, keyword })
        pos += keyword.length
      }
    }
    searchResults.value = results
    searchIndex.value = results.length > 0 ? 0 : -1
  }

  function nextSearchResult() {
    if (searchResults.value.length === 0) return
    searchIndex.value = (searchIndex.value + 1) % searchResults.value.length
  }

  function prevSearchResult() {
    if (searchResults.value.length === 0) return
    searchIndex.value = (searchIndex.value - 1 + searchResults.value.length) % searchResults.value.length
  }

  // Bookmark functions
  async function fetchBookmarks(bookId) {
    try {
      const { data } = await api.get(`/books/${bookId}/bookmarks`)
      bookmarks.value = data
    } catch {
      bookmarks.value = []
    }
  }

  async function addBookmark(note = '') {
    if (!currentBook.value) return
    const { data } = await api.post(`/books/${currentBook.value.id}/bookmarks`, {
      page: currentPage.value,
      note,
    })
    bookmarks.value.push(data)
    bookmarks.value.sort((a, b) => a.page - b.page)
    return data
  }

  async function removeBookmark(bookmarkId) {
    await api.delete(`/books/bookmarks/${bookmarkId}`)
    bookmarks.value = bookmarks.value.filter(b => b.id !== bookmarkId)
  }

  async function updateBookmark(bookmarkId, note) {
    const { data } = await api.put(`/books/bookmarks/${bookmarkId}`, { note })
    const idx = bookmarks.value.findIndex(b => b.id === bookmarkId)
    if (idx !== -1) bookmarks.value[idx] = data
    return data
  }

  async function nextPage() {
    if (currentPage.value < totalPages.value - 1) {
      currentPage.value++
      await saveProgress()
    }
  }

  async function prevPage() {
    if (currentPage.value > 0) {
      currentPage.value--
      await saveProgress()
    }
  }

  async function goToPage(page) {
    if (page >= 0 && page < totalPages.value) {
      currentPage.value = page
      await saveProgress()
    }
  }

  async function saveProgress() {
    if (!currentBook.value) return
    try {
      await api.put(`/books/${currentBook.value.id}/progress`, {
        current_page: currentPage.value,
        total_pages: totalPages.value,
      })
    } catch { /* silent fail */ }
  }

  async function toggleFavorite(bookId) {
    const book = books.value.find(b => b.id === bookId)
    if (!book) return
    const { data } = await api.put(`/books/${bookId}/favorite`, {
      favorite: !book.favorite,
    })
    book.favorite = data.favorite
    if (currentBook.value?.id === bookId) {
      currentBook.value.favorite = data.favorite
    }
  }

  async function deleteBook(bookId) {
    await api.delete(`/books/${bookId}`)
    books.value = books.value.filter(b => b.id !== bookId)
    await removeCachedBook(bookId)
  }

  async function updateBookMetadata(bookId, { title, author, cover_url }) {
    const payload = {}
    if (title !== undefined) payload.title = title
    if (author !== undefined) payload.author = author
    if (cover_url !== undefined) payload.cover_url = cover_url
    const { data } = await api.put(`/books/${bookId}/metadata`, payload)
    const idx = books.value.findIndex(b => b.id === bookId)
    if (idx !== -1) books.value[idx] = { ...books.value[idx], ...data }
    if (currentBook.value?.id === bookId) {
      currentBook.value = { ...currentBook.value, ...data }
    }
    return data
  }

  function updateSetting(key, value) {
    settings.value[key] = value
    localStorage.setItem(key, String(value))
  }

  // --- Reading position persistence (localStorage JSON) ---
  const POSITIONS_KEY = 'reading-positions'

  function _getAllPositions() {
    try {
      return JSON.parse(localStorage.getItem(POSITIONS_KEY) || '{}')
    } catch { return {} }
  }

  function saveReadingPosition(bookId, extra = {}) {
    if (!bookId) return
    const all = _getAllPositions()
    const book = books.value.find(b => b.id === bookId) || currentBook.value
    all[bookId] = {
      page: currentPage.value,
      readMode: settings.value.readMode,
      timestamp: Date.now(),
      // Book metadata cache
      title: book?.title || '',
      author: book?.author || '',
      cover_url: book?.cover_url || '',
      md5: book?.md5 || '',
      total_pages: totalPages.value,
      ...extra,
    }
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(all))
  }

  function loadReadingPosition(bookId) {
    if (!bookId) return null
    const all = _getAllPositions()
    return all[bookId] || null
  }

  return {
    books, currentBook, currentContent, currentPages, currentPage,
    totalPages, loading, settings, favoriteBooks, chapters,
    bookmarks, searchResults, searchIndex,
    fetchBooks, uploadBook, openBook, nextPage, prevPage, goToPage,
    saveProgress, toggleFavorite, deleteBook, updateBookMetadata, updateSetting, paginateContent,
    saveReadingPosition, loadReadingPosition,
    searchInBook, nextSearchResult, prevSearchResult,
    fetchBookmarks, addBookmark, removeBookmark, updateBookmark,
  }
})