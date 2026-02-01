let books = JSON.parse(localStorage.getItem('reader_books')) || [];
let currentBookId = null;
let currentPage = 0;
let totalPages = 0;
let isFavorite = false;
const sampleContent = `

第一章 经济篇

当我写下这些文字，或者说当我把大部分文字写下来时，我正独自住在森林里，就在马萨诸塞州康科德镇的瓦尔登湖畔。我住在一座自己建造的木屋里，紧挨着湖岸，方圆一英里内没有任何邻居。我完全靠双手劳动来养活自己。我在那里生活了两年又两个月。如今，我又是文明生活中的一位过客了。

我本不想对读者们絮叨太多私事，但镇上的人们对我的生活方式提出了诸多疑问，有些人觉得我是在炫耀，有些人则非常关心我的饮食和感受，是否曾感到孤独或恐惧等等。这些便是本书试图回答的部分问题。

第二章 我生活的地方；我为何生活

我来到这片森林是因为我希望谨慎地生活，只面对生活的基本事实，看看我是否无法学到生活要教给我的东西，以免在弥留之际发现自己没有生活过。我不希望过不是生活的生活，活着是这样珍贵；也不希望听天由命，除非万不得已。我希望深入地生活，汲取生活所有的精髓。

清晨，我打开房门，让新鲜的空气进来。这是一个美好的早晨，整个世界都显得格外清晰。我听到鸟儿在歌唱，听到风吹过树梢的声音，听到湖水轻轻拍打岸边的声音。

自然从不匆忙，却总是一切就绪。她以完美的节奏运行，每个季节都有其独特的美。

第三章 阅读

对于一本好书，我们需要做的就是认真地读它。我们必须虔诚地打开它，用我们最好的时光来阅读它。如果我们第一次读它时没有得到什么，也许第二次或第三次读时会有收获。`;

function updateTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  document.getElementById('current-time').textContent = `${hours}:${minutes}`;
}
function initPage() {
  updateTime();
  setInterval(updateTime, 60000);
  checkBookshelf();
}
function checkBookshelf() {
  if (books.length === 0) {
    document.getElementById('empty-shelf').style.display = 'flex';
    document.getElementById('shelf-view').style.display = 'none';
  } else {
    document.getElementById('empty-shelf').style.display = 'none';
    document.getElementById('shelf-view').style.display = 'flex';
    renderBooks();
  }
}

let lastPageScroll = 0; // 全局记录当前页滚动位置（用于判断方向）

function renderPages(pages) {
  const container = document.getElementById('page-container');
  container.innerHTML = '';

  const pageElement = document.createElement('div');
  pageElement.className = 'page';

  // 只在第一页显示标题
  let titleHTML = '';
  if (currentPage === 0) {
    titleHTML = `<div class="page-title">${books.find(b => b.id === currentBookId)?.title || ''}</div>`;
  }

  // 翻页按钮（判断是否显示）
  let prevBtn = currentPage > 0
    ? `<button class="page-btn prev-btn" onclick="prevPage()">‹</button>`
    : '';
  let nextBtn = currentPage < totalPages - 1
    ? `<button class="page-btn next-btn" onclick="nextPage()">›</button>`
    : '';

  pageElement.innerHTML = `
    ${titleHTML}
    <div class="page-content">${pages[currentPage] || ''}</div>
    <div class="page-footer">
      <div class="footer-left">${prevBtn}</div>
      <div class="footer-center">
        <input type="number" id="page-input" min="1" max="${totalPages}" value="${currentPage + 1}" style="width:50px;text-align:center;margin-top:auto;margin-bottom:auto;">
        / ${totalPages}
      </div>
      <div class="footer-right">${nextBtn}</div>
    </div>
  `;

  container.appendChild(pageElement);

  // --- 绑定 scroll 监听 ---
  pageElement.removeEventListener('scroll', onPageScroll);
  pageElement.addEventListener('scroll', onPageScroll);
  lastPageScroll = 0;

  // 应用字体大小
  const savedFontSize = localStorage.getItem('fontSize');
  if (savedFontSize) {
    const content = pageElement.querySelector('.page-content');
    if (content) {
      content.style.fontSize = savedFontSize + 'px';
    }
  }

  // ===== 新增：页码输入跳转逻辑 =====
  const pageInput = document.getElementById('page-input');
  if (pageInput) {
    // 按回车跳转
    pageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const page = parseInt(pageInput.value) - 1;
        if (!isNaN(page) && page >= 0 && page < totalPages) {
          currentPage = page;
          updateBookProgress();
          renderPages(currentPages);
          showTabBar();
        } else {
          pageInput.value = currentPage + 1;
        }
      }
    });

    // 失焦也跳转
    pageInput.addEventListener('blur', () => {
      const page = parseInt(pageInput.value) - 1;
      if (!isNaN(page) && page >= 0 && page < totalPages) {
        currentPage = page;
        updateBookProgress();
        renderPages(currentPages);
        showTabBar();
      } else {
        pageInput.value = currentPage + 1;
      }
    });
  }
}

function onPageScroll(e) {
  const tabBar = document.querySelector('.tab-bar');
  const scrollTop = e.target.scrollTop;
  if (scrollTop > lastPageScroll + 5) { // 加一点阈值避免抖动
    tabBar.classList.add('hidden');
  } else if (scrollTop < lastPageScroll - 5) {
    tabBar.classList.remove('hidden');
  }
  lastPageScroll = scrollTop;
}

let currentPages = []; // 缓存当前书的分页结果

function openBook(bookId) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;

  currentBookId = bookId;
  currentPage = loadReadingProgress(bookId)
  isFavorite = book.favorite || false;

  // ✅ 分页：按章节切分原始文本，然后再转 HTML
  currentPages = paginateContent(book.content);
  totalPages = currentPages.length;
  book.totalPages = totalPages;
  saveBooks();

  renderPages(currentPages);

  document.getElementById('empty-shelf').style.display = 'none';
  document.getElementById('shelf-view').style.display = 'none';
  document.getElementById('reader-view').style.display = 'flex';
  document.getElementById('favorite-btn').textContent = isFavorite ? '★' : '☆';
}

function paginateContent(content, pageSize = 2000) {
  // 1️⃣ 统一换行和清理开头空格
  content = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.replace(/^[\s　\t]+/, ''))
    .filter(line => line.trim() !== '') // 移除空行
    .join('\n');

  // 2️⃣ 定义章节标题的正则表达式
  const chapterRegex = /^(第[零一二三四五六七八九十百千万\d]+章|第[零一二三四五六七八九十百千万\d]+节|Chapter \d+|CHAPTER \d+|Section \d+|章节 \d+|\d+\.\s+.*)/;

  // 3️⃣ 分割内容为页面
  let pages = [];
  let currentPage = '';
  let lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检查是否是章节标题
    if (chapterRegex.test(line)) {
      // 如果当前页有内容，先保存
      if (currentPage.trim().length > 0) {
        pages.push(currentPage.trim());
        currentPage = '';
      }
      
      // 将章节标题放入div中
      currentPage += `<div class="chapter-title">${line}</div>\n\n`;
    } else {
      // 普通内容行
      currentPage += `<p>${line}</p>\n`;
      
      // 检查是否达到分页长度
      if (currentPage.length >= pageSize) {
        // 找最近的换行符分页
        let lastNewLine = currentPage.lastIndexOf('\n', pageSize);
        if (lastNewLine > 0) {
          const pageContent = currentPage.substring(0, lastNewLine).trim();
          if (pageContent) {
            pages.push(pageContent);
          }
          currentPage = currentPage.substring(lastNewLine + 1);
        } else {
          // 如果没有换行符，强制分页
          pages.push(currentPage.trim());
          currentPage = '';
        }
      }
    }
  }
  
  // 添加最后一页
  if (currentPage.trim().length > 0) {
    pages.push(currentPage.trim());
  }
  
  return pages;
}

function showTabBar() {
  const tabBar = document.querySelector('.tab-bar');
  if (!tabBar) return;
  tabBar.classList.remove('hidden');
}

function nextPage() {
  if (currentPage < totalPages - 1) {
    currentPage++;
    saveReadingProgress(currentBookId, currentPage);
    updateBookProgress();
    renderPages(currentPages);
    showTabBar(); // 翻页时展开
  }
}

function toggleScrollMode() {
  const reader = document.getElementById('page-container');
  const mode = localStorage.getItem('scrollMode') === 'true';

  localStorage.setItem('scrollMode', !mode);

  if (!mode) {
    // 开启滚动模式
    renderScrollMode();
  } else {
    // 返回分页模式
    renderPages(currentPages);
  }
}


function renderScrollMode() {
  const container = document.getElementById('page-container');
  container.innerHTML = currentPages.map(p => 
    `<div class="scroll-page">${p}</div>`
  ).join('');

  container.style.overflowY = 'auto';
}

function showSearch() {
  const keyword = prompt("请输入搜索内容：");
  if (!keyword) return;

  const content = books.find(b => b.id === currentBookId).content;

  const index = content.indexOf(keyword);
  if (index === -1) {
    alert("未找到内容");
    return;
  }

  const pageIndex = Math.floor(index / 2000); // 简单根据字符定位页数
  currentPage = pageIndex;
  renderPages(currentPages);

  setTimeout(() => {
    const pageDom = document.querySelector('.page-content');
    pageDom.innerHTML = pageDom.innerHTML.replace(keyword, `<mark>${keyword}</mark>`);
  }, 100);
}

function saveReadingProgress(bookId, page) {
  let history = JSON.parse(localStorage.getItem('reading_history')) || {};
  history[bookId] = page;
  localStorage.setItem('reading_history', JSON.stringify(history));
}

function loadReadingProgress(bookId) {
  let history = JSON.parse(localStorage.getItem('reading_history')) || {};
  return history[bookId] || 0;
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    saveReadingProgress(currentBookId, currentPage);
    updateBookProgress();
    renderPages(currentPages);
    showTabBar(); // 翻页时展开
  }
}

function updateBookProgress() {
  const bookIndex = books.findIndex(b => b.id === currentBookId);
  if (bookIndex !== -1) {
    books[bookIndex].currentPage = currentPage;
    saveBooks();
  }
}
function closeReader() {
  document.getElementById('reader-view').style.display = 'none';
  checkBookshelf();
}

function toggleFavorite() {
  const bookIndex = books.findIndex(b => b.id === currentBookId);
  if (bookIndex !== -1) {
    books[bookIndex].favorite = !books[bookIndex].favorite;
    isFavorite = books[bookIndex].favorite;
    saveBooks();
    document.getElementById('favorite-btn').textContent = isFavorite ? '★' : '☆';
    renderBooks();
  }
}

function showFavorites() {
  const container = document.getElementById('books-container');
  container.innerHTML = '';

  const favoriteBooks = books.filter(b => b.favorite);

  if (favoriteBooks.length === 0) {
    container.innerHTML = '<p style="text-align:center;margin-top:20px;">你还没有收藏任何书籍</p>';
  } else {
    favoriteBooks.forEach(book => {
      const bookElement = document.createElement('div');
      bookElement.className = 'book-card';
      bookElement.innerHTML = `
        <div class="book-cover">${book.title.substring(0, 2)}</div>
        <div class="book-title">${book.title}</div>
        <div class="book-author">${book.author || '未知作者'}</div>
        <div class="book-meta">
          <span>${book.currentPage || 0}/${book.totalPages || 0}页</span>
          <span>${book.favorite ? '★' : ''}</span>
        </div>
        <button class="delete-book-btn">x</button>
      `;

      // 点击书卡打开阅读
      bookElement.addEventListener('click', (e) => {
        if (!e.target.classList.contains('delete-book-btn')) {
          openBook(book.id);
        }
      });

      // 点击删除按钮删除书籍
      const deleteBtn = bookElement.querySelector('.delete-book-btn');
      deleteBtn.addEventListener('click', () => {
        if (confirm(`确认删除《${book.title}》吗？`)) {
          books = books.filter(b => b.id !== book.id);
          saveBooks();
          showFavorites(); // 更新收藏界面
        }
      });

      container.appendChild(bookElement);
    });
  }

  document.getElementById('empty-shelf').style.display = 'none';
  document.getElementById('shelf-view').style.display = 'flex';
  document.getElementById('reader-view').style.display = 'none';
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.match(/\.(txt|md)$/i)) {
    alert('只支持上传 .txt 或 .md 文件');
    return;
  }

  const maxFileSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxFileSize) {
    alert('文件太大，请上传小于 10MB 的文件');
    return;
  }

  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  if (progressContainer && progressBar) {
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
  }

  const formData = new FormData();
  formData.append('file', file);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/upload', true);

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable && progressBar) {
      const percent = (e.loaded / e.total) * 100;
      progressBar.style.width = percent + '%';
    }
  });

  xhr.onload = () => {
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText);

      // 上传完成隐藏进度条
      if (progressContainer) progressContainer.style.display = 'none';
      event.target.value = '';

      if (data.exists) {
        alert('加载成功');
        // 可选：如果你想同步服务器上的内容到书架
        if (!books.some(b => b.md5 === data.md5)) {
          const title = data.filename
            .replace(/\.(txt|md)$/i, '')
            .replace(/_\d{13}_[a-f0-9]{32}$/, '');
          const newBook = {
            id: Date.now().toString(),
            title,
            author: '未知作者',
            content: data.content,
            md5: data.md5,
            favorite: false,
            currentPage: 0,
            totalPages: 0,
            importDate: new Date().toISOString()
          };
          books.push(newBook);
          saveBooks();
        }
        hideImportPanel();
        renderBooks();
        return;
      }

      // 新文件上传成功
      const title = data.filename
        .replace(/\.(txt|md)$/i, '')
        .replace(/_\d{13}_[a-f0-9]{32}$/, '');
      const newBook = {
        id: Date.now().toString(),
        title,
        author: '未知作者',
        content: data.content,
        md5: data.md5,
        favorite: false,
        currentPage: 0,
        totalPages: 0,
        importDate: new Date().toISOString()
      };
      books.push(newBook);
      saveBooks();
      renderBooks();
      hideImportPanel();
    } else {
      console.error('上传失败:', xhr.statusText);
      alert('上传失败，请重试');
      if (progressContainer) progressContainer.style.display = 'none';
    }
  };


  xhr.onerror = () => {
    console.error('上传发生错误');
    alert('上传错误，请重试');
    if (progressContainer) progressContainer.style.display = 'none';
  };

  xhr.send(formData);
}

function addSampleBook() {
  const newBook = {
    id: Date.now().toString(),
    title: '瓦尔登湖',
    author: '亨利·戴维·梭罗',
    content: sampleContent,
    favorite: false,
    currentPage: 0,
    totalPages: 0,
    importDate: new Date().toISOString()
  };
  books.push(newBook);
  saveBooks();
  checkBookshelf();
  hideImportPanel();
}

function saveBooks() {
  localStorage.setItem('reader_books', JSON.stringify(books));
}

function renderBooks() {
  const container = document.getElementById('books-container');
  container.innerHTML = '';

  books.forEach(book => {
    const bookElement = document.createElement('div');
    bookElement.className = 'book-card';
    bookElement.innerHTML = `
      <div class="book-cover">${book.title.substring(0, 2)}</div>
      <div class="book-title">${book.title}</div>
      <div class="book-author">${book.author || '未知作者'}</div>
      <div class="book-meta">
        <span>${book.currentPage + 1 || 0}/${book.totalPages || 0}页</span>
        <span>${book.favorite ? '★' : ''}</span>
      </div>
      <button class="delete-book-btn">x</button>
    `;

    // 点击书卡打开阅读
    bookElement.addEventListener('click', (e) => {
      if (!e.target.classList.contains('delete-book-btn')) {
        openBook(book.id);
      }
    });

    // 点击删除按钮删除书籍
    const deleteBtn = bookElement.querySelector('.delete-book-btn');
    deleteBtn.addEventListener('click', () => {
      if (confirm(`确认删除《${book.title}》吗？`)) {
        books = books.filter(b => b.id !== book.id);
        saveBooks();
        renderBooks();
      }
    });

    container.appendChild(bookElement);
  });
}


function showImportPanel() {
  document.getElementById('import-panel').style.display = 'flex';
}
function hideImportPanel() {
  document.getElementById('import-panel').style.display = 'none';
}
function showSettings() {
  const panel = document.getElementById('settings-panel');
  panel.classList.toggle('active');
}

function hideSettings() {
  const panel = document.getElementById('settings-panel');
  const settingsBtn = document.querySelector('.tab-item[onclick*="showSettings"]');

  if (panel.classList.contains('active') && !panel.contains(event.target) && !settingsBtn.contains(event.target)) {
    panel.classList.remove('active');
  }
}

function changeFontSize(action) {
  const content = document.querySelector('.page-content');
  if (!content) return;

  // 获取当前字体大小
  let currentSize = parseInt(window.getComputedStyle(content).fontSize);

  // 增大字体
  if (action === 'increase' && currentSize < 24) {
    currentSize += 2;
  }
  // 减小字体
  else if (action === 'decrease' && currentSize > 14) {
    currentSize -= 2;
  }

  // 保存字体大小到 localStorage
  localStorage.setItem('fontSize', currentSize);

  // 更新页面字体大小
  content.style.fontSize = currentSize + 'px';
}

function toggleNightMode() {
  document.body.classList.toggle('night-mode');
}
function changeTheme(theme) {
  const readerContainer = document.getElementById('reader-container');
  if (!readerContainer) return;
  readerContainer.classList.remove('theme-light', 'theme-sepia', 'theme-dark', 'theme-green');
  if (theme !== 'light') {
    readerContainer.classList.add('theme-' + theme);
  }
  document.getElementById('settings-panel').classList.remove('active');
}
function switchView(view) {
  if (view === 'shelf') {
    closeReader();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initPage();

  let lastScrollY = 0;
  const tabBar = document.querySelector('.tab-bar');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsBtn = document.querySelector('.tab-item[onclick*="showSettings"]');

  const pageContainer = document.getElementById('page-container'); // 确保你监听的是正确的容器

  // 监听实际可滚动的容器
  pageContainer.addEventListener('scroll', () => {
    const scrollTop = pageContainer.scrollTop;

    // 判断滚动方向
    if (scrollTop > lastScrollY) {
      tabBar.classList.add('hidden');   // 向下滚动 → 隐藏
    } else {
      tabBar.classList.remove('hidden'); // 向上滚动 → 显示
    }

    lastScrollY = scrollTop < 0 ? 0 : scrollTop;
  });

  // 点击非设置区域收起设置
  document.addEventListener('click', (e) => {
    if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
      hideSettings();
    }
  });
});