/**
 * Vocabulary Studio Pro - iOS Edition Application Engine
 * Supports: PWA Offline, iOS HIG Design, Touch Swipe Flashcards, Chinese Speech TTS, Quiz & Data Sync
 */

// Initial Application State
let vocabState = {
  version: 1,
  vocabulary: {},
  sourceFileName: 'Vocabulary',
  activeTab: 'directory',
  theme: localStorage.getItem('ios_vocab_theme') || 'dark',
  searchQuery: '',
  sortBy: 'count-desc',
  editingWord: null,

  // Flashcards state
  flashcardIndex: 0,
  flashcardFlipped: false,
  flashcardList: [],

  // Quiz state
  quizCurrentQuestion: null,
  quizScore: 0,
  quizTotal: 0,
  quizStreak: 0,
  quizAnswered: false,

  // Touch Swipe State
  isDragging: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0
};

// Rich Default Sample Vocabulary (Chinese HSK / Common words)
const SAMPLE_VOCABULARY = {
  "version": 1,
  "vocabulary": {
    "由于": {
      "count": 5,
      "first_seen": "2026-07-25T14:48:25.110Z",
      "last_seen": "2026-07-25T15:13:41.613Z",
      "pinyin": "yóu yú",
      "han_viet": "do vu",
      "meaning": "bởi vì, do"
    },
    "债务": {
      "count": 7,
      "first_seen": "2026-07-25T15:00:14.912Z",
      "last_seen": "2026-07-28T16:53:09.253Z",
      "pinyin": "zhài wù",
      "han_viet": "trái vụ",
      "meaning": "nợ, nợ nần"
    },
    "严格": {
      "count": 3,
      "first_seen": "2026-07-25T15:06:30.123Z",
      "last_seen": "2026-07-25T15:06:30.123Z",
      "pinyin": "yán gé",
      "han_viet": "nghiêm cách",
      "meaning": "nghiêm ngặt, chặt chẽ"
    },
    "没有": {
      "count": 12,
      "first_seen": "2026-07-25T15:13:41.613Z",
      "last_seen": "2026-08-01T16:43:50.147Z",
      "pinyin": "méi yǒu",
      "han_viet": "một hữu",
      "meaning": "không có"
    },
    "孩子": {
      "count": 8,
      "first_seen": "2026-07-25T15:13:41.613Z",
      "last_seen": "2026-08-05T10:20:00.000Z",
      "pinyin": "hái zi",
      "han_viet": "hài tử",
      "meaning": "trẻ em, con cái"
    },
    "学习": {
      "count": 15,
      "first_seen": "2026-07-20T08:00:00.000Z",
      "last_seen": "2026-08-08T14:30:00.000Z",
      "pinyin": "xué xí",
      "han_viet": "học tập",
      "meaning": "học tập, nghiên cứu"
    },
    "成功": {
      "count": 10,
      "first_seen": "2026-07-22T09:15:00.000Z",
      "last_seen": "2026-08-07T11:45:00.000Z",
      "pinyin": "chéng gōng",
      "han_viet": "thành công",
      "meaning": "thành công, đạt kết quả"
    },
    "希望": {
      "count": 6,
      "first_seen": "2026-07-21T10:00:00.000Z",
      "last_seen": "2026-08-06T18:20:00.000Z",
      "pinyin": "xī wàng",
      "han_viet": "hi vọng",
      "meaning": "hy vọng, mong muốn"
    }
  }
};

// Application Initialization
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadData();
  bindNavigation();
  bindEvents();
  initTouchSwipe();
  registerServiceWorker();
  renderApp();
});

// Register Service Worker for PWA
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[SW] Registered successfully:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  }
}

// Theme Management
function initTheme() {
  document.documentElement.setAttribute('data-theme', vocabState.theme);
}

function toggleTheme() {
  vocabState.theme = vocabState.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('ios_vocab_theme', vocabState.theme);
  document.documentElement.setAttribute('data-theme', vocabState.theme);
}

// Data Persistence
// Data Persistence (Multi-File JSON Support & Auto-Persistence)
function loadData() {
  const saved = localStorage.getItem('ios_vocab_data');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      // Auto-purge old sample words if user's storage only contains original test words
      const keys = Object.keys(parsed.vocabulary || {});
      const isSampleOnly = keys.length > 0 && keys.every(k => ['希望', '学习', '方便', '债务', '才'].includes(k));

      if (isSampleOnly) {
        vocabState.vocabulary = {};
        vocabState.studyLogs = {};
        vocabState.sourceFileName = 'Danh sách trống';
        vocabState.allFiles = { 'Danh sách trống': { vocabulary: {}, studyLogs: {} } };
        saveData();
        return;
      }

      vocabState.allFiles = parsed.allFiles || {};
      vocabState.sourceFileName = parsed.sourceFileName || 'Danh sách trống';

      if (vocabState.allFiles[vocabState.sourceFileName]) {
        vocabState.vocabulary = vocabState.allFiles[vocabState.sourceFileName].vocabulary || {};
        vocabState.studyLogs = vocabState.allFiles[vocabState.sourceFileName].studyLogs || {};
      } else if (parsed.vocabulary) {
        vocabState.vocabulary = parsed.vocabulary || {};
        vocabState.studyLogs = parsed.studyLogs || {};
        vocabState.allFiles[vocabState.sourceFileName] = {
          vocabulary: vocabState.vocabulary,
          studyLogs: vocabState.studyLogs
        };
      }
    } catch (e) {
      console.error('Error parsing stored data:', e);
      vocabState.vocabulary = {};
      vocabState.studyLogs = {};
      vocabState.sourceFileName = 'Danh sách trống';
    }
  } else {
    // App defaults to 100% empty (No sample words, no sample json)
    vocabState.vocabulary = {};
    vocabState.studyLogs = {};
    vocabState.sourceFileName = 'Danh sách trống';
    vocabState.allFiles = {
      'Danh sách trống': {
        vocabulary: {},
        studyLogs: {}
      }
    };
  }
}

function clearAllStorage() {
  if (confirm('Bạn có chắc chắn muốn xóa sạch bộ nhớ tạm cũ trên trình duyệt và đưa ứng dụng về trạng thái trống 100% không?')) {
    localStorage.removeItem('ios_vocab_data');
    vocabState.vocabulary = {};
    vocabState.studyLogs = {};
    vocabState.sourceFileName = 'Danh sách trống';
    vocabState.allFiles = {
      'Danh sách trống': {
        vocabulary: {},
        studyLogs: {}
      }
    };
    saveData();
    renderApp();
    alert('Đã xóa sạch bộ nhớ tạm! Ứng dụng hiện đang hoàn toàn trống.');
  }
}

async function saveData() {
  if (!vocabState.allFiles) vocabState.allFiles = {};

  // Auto-persist changes into active file dataset!
  vocabState.allFiles[vocabState.sourceFileName] = {
    vocabulary: vocabState.vocabulary,
    studyLogs: vocabState.studyLogs || {},
    lastModified: new Date().toISOString()
  };

  const payload = {
    version: vocabState.version,
    sourceFileName: vocabState.sourceFileName,
    allFiles: vocabState.allFiles,
    vocabulary: vocabState.vocabulary,
    studyLogs: vocabState.studyLogs || {}
  };
  localStorage.setItem('ios_vocab_data', JSON.stringify(payload));
  updateStatsHeader();

  // REAL-TIME DIRECT DISK AUTO-SAVE TO THE JSON FILE ON YOUR COMPUTER!
  if (vocabState.activeFileHandle) {
    try {
      const writable = await vocabState.activeFileHandle.createWritable();
      await writable.write(JSON.stringify(payload, null, 2));
      await writable.close();
      console.log(`[Auto-Save] Successfully saved changes directly into file "${vocabState.sourceFileName}" on your disk!`);
    } catch (err) {
      console.warn('[Auto-Save] Direct disk file write error:', err);
    }
  }
}

// Navigation Handler
function bindNavigation() {
  const navBtns = document.querySelectorAll('.ios-bottom-nav .nav-item');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabName) {
  vocabState.activeTab = tabName;
  
  // Update Nav Items
  document.querySelectorAll('.ios-bottom-nav .nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  // Update View Panels
  document.querySelectorAll('.tab-view').forEach(panel => {
    panel.classList.toggle('active', panel.id === `view-${tabName}`);
  });

  // Trigger tab-specific renders
  if (tabName === 'directory') renderDirectory();
  if (tabName === 'flashcards') prepareFlashcards();
  if (tabName === 'quiz') generateQuizQuestion();
  if (tabName === 'stats') renderStats();
}

// Event Bindings
function bindEvents() {
  // Theme Toggle
  document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);

  // Search & Filter
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearchBtn');
  
  searchInput?.addEventListener('input', (e) => {
    vocabState.searchQuery = e.target.value;
    clearBtn.style.display = vocabState.searchQuery ? 'flex' : 'none';
    renderDirectory();
  });

  clearBtn?.addEventListener('click', () => {
    searchInput.value = '';
    vocabState.searchQuery = '';
    clearBtn.style.display = 'none';
    renderDirectory();
  });

  document.getElementById('sortSelect')?.addEventListener('change', (e) => {
    vocabState.sortBy = e.target.value;
    renderDirectory();
  });

  // Modal Open/Close & Meaning Rows
  document.getElementById('openAddWordModalBtn')?.addEventListener('click', () => openWordModal());
  document.getElementById('closeModalBtn')?.addEventListener('click', closeWordModal);
  document.getElementById('cancelModalBtn')?.addEventListener('click', closeWordModal);
  document.getElementById('addMeaningRowBtn')?.addEventListener('click', () => addMeaningInputRow(''));

  // Auto Lookup Pinyin & Hán Việt AFTER user finishes entering Hanzi (Từ gốc)
  const wordInput = document.getElementById('inputWord');
  let isComposingChinese = false;
  let lookupTimer = null;

  const triggerAutoLookup = () => {
    if (vocabState.editingWord) return;
    if (!wordInput) return;

    const val = wordInput.value.trim();
    const pinyinInput = document.getElementById('inputPinyin');
    const hanvietInput = document.getElementById('inputHanViet');

    // If word input is erased/empty, clear Pinyin & Hán Việt immediately
    if (!val) {
      if (pinyinInput) pinyinInput.value = '';
      if (hanvietInput) hanvietInput.value = '';
      return;
    }

    const res = lookupHanzi(val);
    if (pinyinInput && res.pinyin) {
      pinyinInput.value = res.pinyin;
    }
    if (hanvietInput && res.hanviet) {
      hanvietInput.value = res.hanviet;
    }
  };

  if (wordInput) {
    // When typing via Chinese IME keyboard
    wordInput.addEventListener('compositionstart', () => {
      isComposingChinese = true;
    });

    wordInput.addEventListener('compositionend', () => {
      isComposingChinese = false;
      triggerAutoLookup();
    });

    // When focus leaves the input field (Blur)
    wordInput.addEventListener('blur', () => {
      triggerAutoLookup();
    });

    // When value change completes (Enter or selection)
    wordInput.addEventListener('change', () => {
      triggerAutoLookup();
    });

    // Input event (clears immediately if empty, or debounces lookup)
    wordInput.addEventListener('input', (e) => {
      if (!wordInput.value.trim()) {
        triggerAutoLookup();
        return;
      }

      if (e.isComposing || isComposingChinese) return;

      clearTimeout(lookupTimer);
      lookupTimer = setTimeout(() => {
        triggerAutoLookup();
      }, 500);
    });
  }

  // Form Submit
  document.getElementById('wordForm')?.addEventListener('submit', handleWordFormSubmit);

  // Open File / Create / Close File Buttons
  document.getElementById('openFilePickerBtn')?.addEventListener('click', openFileWithPicker);
  document.getElementById('createNewFileBtn')?.addEventListener('click', createNewFile);
  document.getElementById('settingsCreateNewFileBtn')?.addEventListener('click', createNewFile);
  document.getElementById('closeCurrentFileBtn')?.addEventListener('click', closeCurrentFile);
  document.getElementById('settingsCloseCurrentFileBtn')?.addEventListener('click', closeCurrentFile);

  // Clear Storage Reset Button
  document.getElementById('clearAllStorageBtn')?.addEventListener('click', clearAllStorage);

  // File Import / Export
  document.getElementById('importJsonFile')?.addEventListener('change', handleFileImport);
  document.getElementById('settingsImportJsonFile')?.addEventListener('change', handleFileImport);
  document.getElementById('exportJsonBtn')?.addEventListener('click', exportDataJson);
  document.getElementById('settingsExportJsonBtn')?.addEventListener('click', exportDataJson);
  document.getElementById('loadSampleDataBtn')?.addEventListener('click', () => {
    if (confirm('Tải dữ liệu mẫu sẽ bổ sung từ vựng mới vào danh sách hiện tại. Tiếp tục?')) {
      vocabState.vocabulary = { ...vocabState.vocabulary, ...SAMPLE_VOCABULARY.vocabulary };
      saveData();
      renderApp();
      alert('Đã tải dữ liệu mẫu thành công!');
    }
  });

  // Anki SRS Rating Buttons
  document.getElementById('ankiAgainBtn')?.addEventListener('click', () => rateAnkiCard('again'));
  document.getElementById('ankiHardBtn')?.addEventListener('click', () => rateAnkiCard('hard'));
  document.getElementById('ankiGoodBtn')?.addEventListener('click', () => rateAnkiCard('good'));
  document.getElementById('ankiEasyBtn')?.addEventListener('click', () => rateAnkiCard('easy'));

  // Flashcards Controls
  document.getElementById('fcFlipBtn')?.addEventListener('click', flipFlashcard);
  document.getElementById('fcPassBtn')?.addEventListener('click', () => passFlashcard(true));
  document.getElementById('fcReviewBtn')?.addEventListener('click', () => passFlashcard(false));
  document.getElementById('fcAudioBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const currentWord = vocabState.flashcardList[vocabState.flashcardIndex];
    if (currentWord) speakChinese(currentWord.hanzi);
  });

  // Quiz Controls
  document.getElementById('nextQuizBtn')?.addEventListener('click', generateQuizQuestion);
  document.getElementById('quizAudioBtn')?.addEventListener('click', () => {
    if (vocabState.quizCurrentQuestion) speakChinese(vocabState.quizCurrentQuestion.hanzi);
  });
}

/* ==========================================================================
   MULTI-FILE MANAGEMENT & JSON PERSISTENCE
   ========================================================================== */
async function createNewFile() {
  let defaultName = prompt('Nhập tên file từ vựng mới (ví dụ: HSK1.json):', 'HSK1.json');
  if (!defaultName || !defaultName.trim()) return;
  defaultName = defaultName.trim();
  if (!defaultName.endsWith('.json')) defaultName += '.json';

  let fileName = defaultName;

  // 1. Native Save File Picker API (Opens OS File Explorer / Directory Selector)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultName,
        types: [{
          description: 'Tệp Từ Vựng JSON',
          accept: { 'application/json': ['.json'] }
        }]
      });

      fileName = handle.name || defaultName;

      // Save active file progress first
      saveData();

      // Create initial JSON payload and write to chosen directory path
      const initialPayload = {
        version: vocabState.version,
        sourceFileName: fileName,
        vocabulary: {},
        studyLogs: {}
      };

      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(initialPayload, null, 2));
      await writable.close();

      // Switch active file dataset in app
      vocabState.activeFileHandle = handle;
      vocabState.sourceFileName = fileName;
      vocabState.vocabulary = {};
      vocabState.studyLogs = {};
      saveData();

      renderApp();
      alert(`Đã tạo và chọn đường dẫn lưu file thành công tại: "${fileName}"! Bất kỳ chỉnh sửa nào cũng sẽ được tự động ghi đè trực tiếp vào file này.`);
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // User cancelled save dialog
      console.warn('Native file picker fallback:', err);
    }
  }

  // 2. Fallback: Switch dataset & prompt browser file download to choose save path
  saveData();

  vocabState.sourceFileName = fileName;
  vocabState.vocabulary = {};
  vocabState.studyLogs = {};
  saveData();

  exportDataJson();

  renderApp();
  alert(`Đã tạo file mới "${fileName}"! Bạn có thể lưu file vào bất kỳ thư mục nào mong muốn.`);
}

async function openFileWithPicker() {
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'Tệp Từ Vựng JSON',
          accept: { 'application/json': ['.json'] }
        }],
        multiple: false
      });

      const file = await handle.getFile();
      const content = await file.text();
      const data = JSON.parse(content);

      // Store handle for direct real-time disk auto-saving!
      vocabState.activeFileHandle = handle;
      vocabState.sourceFileName = handle.name;
      vocabState.vocabulary = data.vocabulary || data;
      vocabState.studyLogs = data.studyLogs || {};

      saveData();
      renderApp();
      alert(`Đã mở file "${handle.name}". Bất kỳ chỉnh sửa nào từ bây giờ cũng sẽ được TỰ ĐỘNG LƯU TRỰC TIẾP vào file JSON này trên máy tính của bạn!`);
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('File open picker fallback:', err);
    }
  }

  // Fallback to traditional file input
  document.getElementById('importJsonFile')?.click();
}

async function flushDiskSave() {
  if (vocabState.activeFileHandle) {
    try {
      const payload = {
        version: vocabState.version,
        sourceFileName: vocabState.sourceFileName,
        vocabulary: vocabState.vocabulary,
        studyLogs: vocabState.studyLogs || {}
      };
      const writable = await vocabState.activeFileHandle.createWritable();
      await writable.write(JSON.stringify(payload, null, 2));
      await writable.close();
      console.log(`[Flush] Saved "${vocabState.sourceFileName}" directly to disk.`);
    } catch (e) {
      console.warn('[Flush] Could not flush to disk handle:', e);
    }
  }
}

async function closeCurrentFile() {
  if (confirm(`Bạn có muốn đóng file "${vocabState.sourceFileName}" và quay về danh sách trống không?`)) {
    await flushDiskSave(); // Ensure disk file is updated before closing
    saveData(); // Save current file progress in localStorage

    vocabState.activeFileHandle = null;
    vocabState.sourceFileName = 'Danh sách trống';
    vocabState.vocabulary = {};
    vocabState.studyLogs = {};
    
    if (!vocabState.allFiles) vocabState.allFiles = {};
    vocabState.allFiles['Danh sách trống'] = {
      vocabulary: {},
      studyLogs: {}
    };

    saveData();
    renderApp();
    alert('Đã lưu tiến trình và đóng file thành công.');
  }
}

function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data && (data.vocabulary || typeof data === 'object')) {
        const diskVocab = data.vocabulary || data;
        const fileName = file.name || 'Imported.json';

        // Flush active file first
        await flushDiskSave();
        saveData();

        // Smart Merge: Preserve newly added/edited words stored in local memory for this file!
        let mergedVocab = { ...diskVocab };
        if (vocabState.allFiles && vocabState.allFiles[fileName] && vocabState.allFiles[fileName].vocabulary) {
          const storedVocab = vocabState.allFiles[fileName].vocabulary;
          mergedVocab = { ...diskVocab, ...storedVocab };
        }

        vocabState.activeFileHandle = null;
        vocabState.sourceFileName = fileName;
        vocabState.vocabulary = mergedVocab;
        vocabState.studyLogs = data.studyLogs || (vocabState.allFiles[fileName] ? vocabState.allFiles[fileName].studyLogs : {});

        saveData(); // Auto-persist merged dataset!
        renderApp();
        alert(`Đã mở file "${fileName}" (${Object.keys(vocabState.vocabulary).length} từ vựng). Toàn bộ từ mới đã được bảo toàn 100%!`);
      } else {
        alert('File JSON không đúng định dạng từ vựng!');
      }
    } catch (err) {
      alert('Không thể đọc file JSON này. Vui lòng kiểm tra lại!');
      console.error(err);
    }
  };
  reader.readAsText(file);
}

function exportDataJson() {
  const payload = {
    version: vocabState.version,
    sourceFileName: vocabState.sourceFileName,
    vocabulary: vocabState.vocabulary,
    studyLogs: vocabState.studyLogs || {}
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  const downloadName = vocabState.sourceFileName.endsWith('.json') ? vocabState.sourceFileName : `${vocabState.sourceFileName}.json`;
  downloadAnchor.setAttribute("download", downloadName);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Master Render
function renderApp() {
  updateStatsHeader();
  renderDirectory();
  prepareFlashcards();
}

function updateStatsHeader() {
  const count = Object.keys(vocabState.vocabulary).length;
  const countBadge = document.getElementById('vocabCountBadge');
  if (countBadge) countBadge.textContent = `${count} từ vựng`;
  
  const fileNameEl = document.getElementById('currentFileName');
  if (fileNameEl) fileNameEl.textContent = vocabState.sourceFileName;
}

/* ==========================================================================
   VIEW 1: DIRECTORY RENDERER
   ========================================================================== */
function getFilteredAndSortedVocab() {
  let entries = Object.entries(vocabState.vocabulary).map(([hanzi, details]) => ({
    hanzi,
    ...details
  }));

  // Search Filter
  if (vocabState.searchQuery.trim()) {
    const q = vocabState.searchQuery.toLowerCase().trim();
    entries = entries.filter(item => 
      item.hanzi.toLowerCase().includes(q) ||
      (item.pinyin && item.pinyin.toLowerCase().includes(q)) ||
      (item.han_viet && item.han_viet.toLowerCase().includes(q)) ||
      (item.meaning && item.meaning.toLowerCase().includes(q))
    );
  }

  // Sorting
  entries.sort((a, b) => {
    if (vocabState.sortBy === 'count-desc') {
      return (b.count || 0) - (a.count || 0);
    } else if (vocabState.sortBy === 'recent-desc') {
      const timeA = a.last_seen ? new Date(a.last_seen).getTime() : 0;
      const timeB = b.last_seen ? new Date(b.last_seen).getTime() : 0;
      return timeB - timeA;
    } else if (vocabState.sortBy === 'az') {
      return a.hanzi.localeCompare(b.hanzi, 'zh-Hans');
    }
    return 0;
  });

  return entries;
}

function renderDirectory() {
  const container = document.getElementById('vocabListContainer');
  const emptyState = document.getElementById('emptyListState');
  if (!container) return;

  const list = getFilteredAndSortedVocab();

  if (list.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  container.innerHTML = list.map(item => `
    <div class="ios-vocab-card" onclick="editWord('${escapeHtml(item.hanzi)}')">
      <div class="vocab-left-side">
        <div class="vocab-hanzi">${escapeHtml(item.hanzi)}</div>
        <div class="vocab-info">
          <div class="vocab-pinyin">${escapeHtml(item.pinyin || '')}</div>
          <div class="vocab-meaning">${formatMeaningDisplay(item.meaning)}</div>
          ${item.han_viet ? `<div class="vocab-hanviet">Hán Việt: ${escapeHtml(item.han_viet)}</div>` : ''}
        </div>
      </div>
      <div class="vocab-right-side">
        <span class="vocab-count-tag">📅 ${formatDateDisplay(item.first_seen || item.last_seen)}</span>
        <div class="vocab-card-actions">
          <button class="ios-audio-btn" onclick="event.stopPropagation(); speakChinese('${escapeHtml(item.hanzi)}')" title="Phát âm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          </button>
          <button class="ios-action-icon-btn" onclick="event.stopPropagation(); deleteWord('${escapeHtml(item.hanzi)}')" title="Xóa từ">
            🗑️
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   VIEW 2: TOUCH SWIPE FLASHCARDS (ANKI SRS ENGINE)
   ========================================================================== */
function prepareFlashcards() {
  vocabState.flashcardList = Object.entries(vocabState.vocabulary).map(([hanzi, data]) => ({
    hanzi,
    ...data
  }));

  // Shuffle flashcards for effective learning
  vocabState.flashcardList.sort(() => Math.random() - 0.5);
  vocabState.flashcardIndex = 0;
  vocabState.flashcardFlipped = false;

  updateAnkiDeckStatus();
  renderCurrentFlashcard();
}

function renderCurrentFlashcard() {
  const card = document.getElementById('swipeFlashcard');
  const progressBar = document.getElementById('flashcardProgressBar');

  if (!card) return;

  const total = vocabState.flashcardList.length;
  if (total === 0) {
    if (progressBar) progressBar.style.width = "0%";
    return;
  }

  const current = vocabState.flashcardList[vocabState.flashcardIndex];

  if (progressBar) progressBar.style.width = `${((vocabState.flashcardIndex + 1) / total) * 100}%`;

  // Reset Card Transform & Flip
  card.classList.remove('flipped');
  card.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
  card.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  vocabState.flashcardFlipped = false;

  // Set Content
  document.getElementById('fcHanzi').textContent = current.hanzi;
  document.getElementById('fcCountBadge').textContent = `📅 ${formatDateDisplay(current.first_seen || current.last_seen)}`;
  document.getElementById('fcPinyin').textContent = current.pinyin || '';
  document.getElementById('fcHanViet').textContent = current.han_viet ? `Hán Việt: ${current.han_viet}` : '';
  document.getElementById('fcMeaning').innerHTML = formatMeaningDisplay(current.meaning);

  // Update Anki Rating Dynamic Time Labels
  const interval = current.interval || 0;
  const easeFactor = current.ease_factor || 2.5;

  const hardDays = interval === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
  const goodDays = interval === 0 ? 1 : Math.round(interval * easeFactor);
  const easyDays = interval === 0 ? 4 : Math.round(interval * easeFactor * 1.3);

  const elHard = document.getElementById('timeHardLabel');
  const elGood = document.getElementById('timeGoodLabel');
  const elEasy = document.getElementById('timeEasyLabel');

  if (elHard) elHard.textContent = `${hardDays} ngày`;
  if (elGood) elGood.textContent = `${goodDays} ngày`;
  if (elEasy) elEasy.textContent = `${easyDays} ngày`;

  // Reset Stamps
  const passStamp = document.querySelector('.stamp-pass');
  const reviewStamp = document.querySelector('.stamp-review');
  if (passStamp) passStamp.style.opacity = '0';
  if (reviewStamp) reviewStamp.style.opacity = '0';

  updateAnkiDeckStatus();
}

function rateAnkiCard(rating) {
  if (!vocabState.flashcardList || vocabState.flashcardList.length === 0) return;
  const currentItem = vocabState.flashcardList[vocabState.flashcardIndex];
  if (!currentItem) return;

  const wordKey = currentItem.hanzi;
  const wordData = vocabState.vocabulary[wordKey] || currentItem;

  let interval = wordData.interval || 0;
  let easeFactor = wordData.ease_factor || 2.5;
  const now = new Date();

  if (rating === 'again') {
    interval = 0;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (rating === 'hard') {
    interval = interval === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
    easeFactor = Math.max(1.3, easeFactor - 0.15);
  } else if (rating === 'good') {
    interval = interval === 0 ? 1 : Math.round(interval * easeFactor);
  } else if (rating === 'easy') {
    interval = interval === 0 ? 4 : Math.round(interval * easeFactor * 1.3);
    easeFactor = easeFactor + 0.15;
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  if (interval === 0) {
    nextReviewDate.setMinutes(nextReviewDate.getMinutes() + 1);
  } else {
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);
  }

  // Log study session into daily heatmap history
  const todayStr = now.toISOString().slice(0, 10);
  if (!vocabState.studyLogs) vocabState.studyLogs = {};
  vocabState.studyLogs[todayStr] = (vocabState.studyLogs[todayStr] || 0) + 1;

  // Save word SRS stats
  vocabState.vocabulary[wordKey] = {
    ...wordData,
    count: (wordData.count || 1) + 1,
    interval,
    ease_factor: easeFactor,
    next_review: nextReviewDate.toISOString(),
    last_seen: now.toISOString()
  };

  saveData();
  passFlashcard(rating !== 'again');
}

function updateAnkiDeckStatus() {
  const now = new Date();
  let newCount = 0;
  let learnCount = 0;
  let dueCount = 0;

  Object.values(vocabState.vocabulary).forEach(item => {
    if (!item.next_review && !item.interval) {
      newCount++;
    } else if (item.next_review && new Date(item.next_review) <= now) {
      dueCount++;
    } else {
      learnCount++;
    }
  });

  const elNew = document.getElementById('ankiNewCount');
  const elLearn = document.getElementById('ankiLearnCount');
  const elDue = document.getElementById('ankiDueCount');

  if (elNew) elNew.textContent = `🔵 ${newCount} Mới`;
  if (elLearn) elLearn.textContent = `🟠 ${learnCount} Đang học`;
  if (elDue) elDue.textContent = `🟢 ${dueCount} Đến hạn`;
}

function flipFlashcard() {
  const card = document.getElementById('swipeFlashcard');
  if (!card) return;
  vocabState.flashcardFlipped = !vocabState.flashcardFlipped;
  card.classList.toggle('flipped', vocabState.flashcardFlipped);
  card.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  card.style.transform = vocabState.flashcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
}

function passFlashcard(isPass) {
  const card = document.getElementById('swipeFlashcard');
  if (!card) return;

  const targetX = isPass ? 400 : -400;
  const rotation = isPass ? 25 : -25;
  const currentFlip = vocabState.flashcardFlipped ? 'rotateY(180deg)' : '';

  card.style.transition = 'transform 0.35s ease-out, opacity 0.35s ease-out';
  card.style.transform = `translate3d(${targetX}px, 0, 0) rotate(${rotation}deg) ${currentFlip}`;
  card.style.opacity = '0';

  setTimeout(() => {
    card.style.opacity = '1';
    vocabState.flashcardIndex = (vocabState.flashcardIndex + 1) % vocabState.flashcardList.length;
    renderCurrentFlashcard();
  }, 350);
}

/* TOUCH DRAG SWIPE ENGINE */
function initTouchSwipe() {
  const card = document.getElementById('swipeFlashcard');
  const stage = document.querySelector('.flashcard-stage');
  if (!card || !stage) return;

  const passStamp = document.querySelector('.stamp-pass');
  const reviewStamp = document.querySelector('.stamp-review');

  const onStart = (e) => {
    vocabState.isDragging = true;
    const touch = e.touches ? e.touches[0] : e;
    vocabState.startX = touch.clientX;
    vocabState.startY = touch.clientY;
    vocabState.currentX = 0;
    vocabState.currentY = 0;
    card.style.transition = 'none';
  };

  const onMove = (e) => {
    if (!vocabState.isDragging) return;
    const touch = e.touches ? e.touches[0] : e;
    vocabState.currentX = touch.clientX - vocabState.startX;
    vocabState.currentY = touch.clientY - vocabState.startY;

    const rotation = vocabState.currentX / 15;
    const baseFlip = vocabState.flashcardFlipped ? 'rotateY(180deg)' : '';
    card.style.transform = `translate3d(${vocabState.currentX}px, ${vocabState.currentY * 0.3}px, 0) rotate(${rotation}deg) ${baseFlip}`;

    // Opacity stamps logic
    const passRatio = Math.min(Math.max(vocabState.currentX / 100, 0), 1);
    const reviewRatio = Math.min(Math.max(-vocabState.currentX / 100, 0), 1);

    if (passStamp) passStamp.style.opacity = passRatio.toString();
    if (reviewStamp) reviewStamp.style.opacity = reviewRatio.toString();
  };

  const onEnd = () => {
    if (!vocabState.isDragging) return;
    vocabState.isDragging = false;

    if (passStamp) passStamp.style.opacity = '0';
    if (reviewStamp) reviewStamp.style.opacity = '0';

    if (vocabState.currentX > 100) {
      passFlashcard(true); // Swipe Right Pass
    } else if (vocabState.currentX < -100) {
      passFlashcard(false); // Swipe Left Review
    } else if (Math.abs(vocabState.currentX) < 8 && Math.abs(vocabState.currentY) < 8) {
      flipFlashcard(); // Tap Flip
    } else {
      // Snap back
      card.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      card.style.transform = vocabState.flashcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
    }

    vocabState.currentX = 0;
    vocabState.currentY = 0;
  };

  // Touch Events for Mobile/iOS
  stage.addEventListener('touchstart', onStart, { passive: true });
  stage.addEventListener('touchmove', onMove, { passive: true });
  stage.addEventListener('touchend', onEnd);

  // Mouse Events for Desktop Testing
  stage.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
}

/* ==========================================================================
   VIEW 3: TRẮC NGHIỆM (QUIZ ENGINE)
   ========================================================================== */
function generateQuizQuestion() {
  const keys = Object.keys(vocabState.vocabulary);
  if (keys.length < 2) {
    alert('Cần ít nhất 2 từ vựng để bắt đầu Trắc nghiệm!');
    return;
  }

  vocabState.quizAnswered = false;
  document.getElementById('nextQuizBtn').style.display = 'none';

  // Pick target word
  const correctKey = keys[Math.floor(Math.random() * keys.length)];
  const correctItem = { hanzi: correctKey, ...vocabState.vocabulary[correctKey] };

  // Pick 3 distractors
  const distractors = [];
  while (distractors.length < Math.min(3, keys.length - 1)) {
    const rKey = keys[Math.floor(Math.random() * keys.length)];
    if (rKey !== correctKey && !distractors.includes(rKey)) {
      distractors.push(rKey);
    }
  }

  // Build Options List
  const options = [correctItem, ...distractors.map(k => ({ hanzi: k, ...vocabState.vocabulary[k] }))];
  options.sort(() => Math.random() - 0.5);

  vocabState.quizCurrentQuestion = {
    correctHanzi: correctKey,
    correctMeaning: correctItem.meaning,
    hanzi: correctItem.hanzi,
    pinyin: correctItem.pinyin,
    options
  };

  // Render Question
  document.getElementById('quizQuestionHanzi').textContent = correctItem.hanzi;
  document.getElementById('quizQuestionPinyin').textContent = correctItem.pinyin || '';

  const optionsContainer = document.getElementById('quizOptionsContainer');
  optionsContainer.innerHTML = options.map(opt => `
    <button class="quiz-option-btn" onclick="handleQuizAnswer('${escapeHtml(opt.hanzi)}')">
      ${escapeHtml(opt.meaning || opt.pinyin || opt.hanzi)}
    </button>
  `).join('');
}

function handleQuizAnswer(selectedHanzi) {
  if (vocabState.quizAnswered) return;
  vocabState.quizAnswered = true;

  const q = vocabState.quizCurrentQuestion;
  const isCorrect = selectedHanzi === q.correctHanzi;

  vocabState.quizTotal++;
  if (isCorrect) {
    vocabState.quizScore += 10;
    vocabState.quizStreak++;
  } else {
    vocabState.quizStreak = 0;
  }

  // Update Score Board
  document.getElementById('quizScoreText').textContent = vocabState.quizScore;
  document.getElementById('quizStreakText').textContent = vocabState.quizStreak;
  document.getElementById('quizTotalText').textContent = vocabState.quizTotal;

  // Highlight Options
  const optionBtns = document.querySelectorAll('.quiz-option-btn');
  optionBtns.forEach(btn => {
    const btnText = btn.textContent.trim();
    if (q.options.find(o => o.hanzi === q.correctHanzi && (o.meaning === btnText || o.pinyin === btnText || o.hanzi === btnText))) {
      btn.classList.add('correct');
    } else if (q.options.find(o => o.hanzi === selectedHanzi && (o.meaning === btnText || o.pinyin === btnText || o.hanzi === btnText))) {
      btn.classList.add('wrong');
    }
  });

  document.getElementById('nextQuizBtn').style.display = 'inline-flex';
}

/* ==========================================================================
   VIEW 4: THỐNG KÊ (STATS)
   ========================================================================== */
function renderStats() {
  const entries = Object.entries(vocabState.vocabulary);
  const totalWords = entries.length;

  let totalEncountered = 0;
  entries.forEach(([_, val]) => {
    totalEncountered += (val.count || 1);
  });

  const avgCount = totalWords > 0 ? (totalEncountered / totalWords).toFixed(1) : 0;
  const masteredCount = entries.filter(([_, val]) => (val.count || 1) >= 5).length;
  const masteryRate = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

  document.getElementById('statTotalWords').textContent = totalWords;
  document.getElementById('statTotalEncountered').textContent = totalEncountered;
  document.getElementById('statAvgCount').textContent = avgCount;
  document.getElementById('statMasteryRate').textContent = `${masteryRate}%`;

  // Top 5 words
  const sorted = [...entries].sort((a, b) => (b[1].count || 0) - (a[1].count || 0)).slice(0, 5);

  const topListEl = document.getElementById('topWordsList');
  if (topListEl) {
    topListEl.innerHTML = sorted.map(([hanzi, val]) => `
      <div class="top-word-item">
        <div>
          <strong style="color: var(--accent-primary); font-size: 1.1rem;">${escapeHtml(hanzi)}</strong>
          <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 8px;">(${escapeHtml(val.pinyin || '')})</span>
        </div>
        <span class="vocab-count-tag">${val.count || 1} lần</span>
      </div>
    `).join('');
  }
}

/* ==========================================================================
   CHINESE TEXT-TO-SPEECH (SPEECH SYNTHESIS)
   ========================================================================== */
function speakChinese(text) {
  if (!('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported on this browser.');
    return;
  }

  window.speechSynthesis.cancel(); // Stop ongoing speech

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.85; // Natural pace

  // Try finding a native Chinese voice
  const voices = window.speechSynthesis.getVoices();
  const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('CN') || v.name.includes('Chinese'));
  if (zhVoice) utterance.voice = zhVoice;

  window.speechSynthesis.speak(utterance);
}

/* ==========================================================================
   MODAL & CRUD ACTIONS (DYNAMIC MULTIPLE MEANINGS)
   ========================================================================== */
function addMeaningInputRow(val = '') {
  const container = document.getElementById('meaningsContainer');
  if (!container) return;

  const rowId = 'meaning_row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  const div = document.createElement('div');
  div.className = 'meaning-row';
  div.id = rowId;
  div.innerHTML = `
    <input type="text" class="meaning-input-field" value="${escapeHtml(val)}" placeholder="Nhập nghĩa của từ..." required autocomplete="off">
    <button type="button" class="btn-remove-meaning" onclick="removeMeaningRow('${rowId}')" title="Xóa nghĩa này">🗑️</button>
  `;
  container.appendChild(div);
}

function removeMeaningRow(rowId) {
  const row = document.getElementById(rowId);
  const container = document.getElementById('meaningsContainer');
  if (row && container) {
    if (container.children.length > 1) {
      row.remove();
    } else {
      alert('Từ vựng phải có ít nhất 1 nghĩa tiếng Việt!');
    }
  }
}

function openWordModal(wordKey = null) {
  vocabState.editingWord = wordKey;
  const modal = document.getElementById('wordModal');
  const title = document.getElementById('modalTitle');
  const meaningsContainer = document.getElementById('meaningsContainer');
  if (meaningsContainer) meaningsContainer.innerHTML = '';

  if (wordKey && vocabState.vocabulary[wordKey]) {
    const data = vocabState.vocabulary[wordKey];
    title.textContent = `Chỉnh Sửa Từ: ${wordKey}`;
    document.getElementById('inputWord').value = wordKey;
    document.getElementById('inputWord').disabled = true; // Key cannot be edited
    document.getElementById('inputPinyin').value = data.pinyin || '';
    document.getElementById('inputHanViet').value = data.han_viet || '';
    const dateInput = document.getElementById('inputSavedDate');
    if (dateInput) {
      dateInput.disabled = true;
      dateInput.value = formatDateDisplay(data.first_seen || data.last_seen);
    }

    // Parse existing meanings (split by ';' or numbered '1. ...')
    const rawMeaning = data.meaning || '';
    const parts = rawMeaning.split(';');
    const cleanParts = parts.map(p => {
      const trimmed = p.trim();
      const stripped = trimmed.replace(/^\d+[\.\:]\s+/, '').trim();
      return stripped || trimmed;
    }).filter(Boolean);

    if (cleanParts.length > 0) {
      cleanParts.forEach(m => addMeaningInputRow(m));
    } else {
      addMeaningInputRow('');
    }
  } else {
    title.textContent = 'Thêm Từ Vựng Mới';
    document.getElementById('inputWord').value = '';
    document.getElementById('inputWord').disabled = false;
    document.getElementById('inputPinyin').value = '';
    document.getElementById('inputHanViet').value = '';
    const dateInput = document.getElementById('inputSavedDate');
    if (dateInput) {
      dateInput.disabled = true;
      dateInput.value = formatDateDisplay(new Date().toISOString());
    }
    addMeaningInputRow('');
  }

  modal.classList.add('active');
}

function closeWordModal() {
  document.getElementById('wordModal').classList.remove('active');
  vocabState.editingWord = null;
}

function handleWordFormSubmit(e) {
  e.preventDefault();

  const word = document.getElementById('inputWord').value.trim();
  const pinyin = document.getElementById('inputPinyin').value.trim();
  const hanViet = document.getElementById('inputHanViet').value.trim();
  
  const existingWordData = vocabState.editingWord ? vocabState.vocabulary[vocabState.editingWord] : null;
  const count = existingWordData ? (existingWordData.count || 1) : 1;

  // Gather all dynamic meaning fields
  const meaningInputs = document.querySelectorAll('.meaning-input-field');
  const meanings = [];
  meaningInputs.forEach(input => {
    const rawVal = input.value.trim();
    if (!rawVal) return;
    // Only strip prefix if it matches numbered format like "1. ", "2: "
    const cleanVal = rawVal.replace(/^\d+[\.\:]\s+/, '').trim();
    meanings.push(cleanVal || rawVal);
  });

  if (!word || !pinyin || meanings.length === 0) {
    alert('Vui lòng điền đầy đủ Từ gốc, Pinyin và ít nhất 1 Nghĩa tiếng Việt!');
    return;
  }

  // Format multiple meanings matching PC version (1. nghĩa A; 2. nghĩa B)
  let finalMeaning = '';
  if (meanings.length === 1) {
    finalMeaning = meanings[0];
  } else if (meanings.length > 1) {
    finalMeaning = meanings.map((m, idx) => `${idx + 1}. ${m}`).join('; ');
  }

  const now = new Date().toISOString();

  if (vocabState.editingWord) {
    // Edit existing word
    vocabState.vocabulary[vocabState.editingWord] = {
      ...vocabState.vocabulary[vocabState.editingWord],
      pinyin,
      han_viet: hanViet,
      meaning: finalMeaning,
      count,
      last_seen: now
    };
  } else {
    // Add new word
    vocabState.vocabulary[word] = {
      count,
      first_seen: now,
      last_seen: now,
      pinyin,
      han_viet: hanViet,
      meaning: finalMeaning
    };
  }

  saveData();
  closeWordModal();
  renderApp();
}

function editWord(wordKey) {
  openWordModal(wordKey);
}

function deleteWord(wordKey) {
  if (confirm(`Bạn có chắc muốn xóa từ "${wordKey}"?`)) {
    delete vocabState.vocabulary[wordKey];
    saveData();
    renderApp();
  }
}

/* ==========================================================================
   FILE IMPORT & EXPORT
   ========================================================================== */
function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data && (data.vocabulary || typeof data === 'object')) {
        const newVocab = data.vocabulary || data;
        vocabState.vocabulary = { ...vocabState.vocabulary, ...newVocab };
        vocabState.sourceFileName = file.name.replace('.json', '');
        saveData();
        renderApp();
        alert(`Đã nhập thành công từ file: ${file.name}`);
      } else {
        alert('File JSON không đúng định dạng từ vựng!');
      }
    } catch (err) {
      alert('Không thể đọc file JSON này. Vui lòng kiểm tra lại!');
      console.error(err);
    }
  };
  reader.readAsText(file);
}

function exportDataJson() {
  const payload = {
    version: vocabState.version,
    vocabulary: vocabState.vocabulary
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `vocabulary-counter_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Utility Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMeaningDisplay(rawMeaning) {
  if (!rawMeaning) return '';
  const parts = rawMeaning.split(';').map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts.map(p => escapeHtml(p)).join('<br>');
  }
  return escapeHtml(rawMeaning);
}

/* ==========================================================================
   OFFLINE HANZI AUTO LOOKUP ENGINE (PINYIN & HÁN VIỆT)
   ========================================================================== */
const TONE_MAP = {
  a: ['ā', 'á', 'ǎ', 'à', 'a'],
  e: ['ē', 'é', 'ě', 'è', 'e'],
  i: ['ī', 'í', 'ǐ', 'ì', 'i'],
  o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
  u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
  v: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü']
};

function formatPinyinWithTone(rawPy) {
  if (!rawPy) return '';

  // If rawPy already contains tone-marked vowels, clean extra non-letters and return
  if (/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i.test(rawPy)) {
    return rawPy.replace(/[\*\?\(\)\[\]]/g, '').trim();
  }

  // Clean raw pinyin from asterisks, parentheses
  let cleanPy = rawPy.replace(/[\*\?\(\)\[\]]/g, '').trim();

  // Convert numbered pinyin e.g. cai2 -> cái, fang1 bian4 -> fāng biàn
  const converted = cleanPy.replace(/([a-veü]+)([1-5])/gi, (match, syllable, toneNum) => {
    const tone = parseInt(toneNum, 10) - 1;
    if (tone < 0 || tone >= 4) return syllable;

    // Standard Pinyin tone placement priority: a, e, ou, or last vowel
    if (syllable.includes('a')) return syllable.replace('a', TONE_MAP.a[tone]);
    if (syllable.includes('e')) return syllable.replace('e', TONE_MAP.e[tone]);
    if (syllable.includes('ou')) return syllable.replace('o', TONE_MAP.o[tone]);

    for (let i = syllable.length - 1; i >= 0; i--) {
      const char = syllable[i];
      if (TONE_MAP[char]) {
        return syllable.substring(0, i) + TONE_MAP[char][tone] + syllable.substring(i + 1);
      }
    }
    return syllable;
  });

  return converted.replace(/[*?]/g, '').trim();
}

function lookupHanzi(text) {
  if (!text) return { pinyin: '', hanviet: '' };

  // 1. Direct match check in existing vocabulary
  if (vocabState.vocabulary[text]) {
    return {
      pinyin: vocabState.vocabulary[text].pinyin || '',
      hanviet: vocabState.vocabulary[text].han_viet || ''
    };
  }

  let pinyinResult = '';
  let hanvietResult = '';

  if (typeof HANVIET_DICT !== 'undefined') {
    // 2. Direct match check in 122,000+ word CVDICT dictionary
    if (HANVIET_DICT[text]) {
      const entry = HANVIET_DICT[text];
      if (entry.py) pinyinResult = formatPinyinWithTone(entry.py);
      if (entry.hv) hanvietResult = entry.hv.split(',')[0].replace(/['"\[\]]/g, '').trim();
    }

    // 3. Fallback character-by-character lookup
    const pyList = [];
    const hvList = [];

    for (const char of text) {
      if (HANVIET_DICT[char]) {
        const info = HANVIET_DICT[char];
        if (info.py) pyList.push(formatPinyinWithTone(info.py));
        if (info.hv) {
          const cleanHv = info.hv.split(',')[0].replace(/['"\[\]]/g, '').trim();
          hvList.push(cleanHv);
        }
      } else {
        pyList.push(char);
        hvList.push(char);
      }
    }

    if (!pinyinResult && pyList.length > 0) {
      pinyinResult = pyList.join(' ');
    }
    if (!hanvietResult && hvList.length > 0) {
      hanvietResult = hvList.join(' ');
    }
  }

  return {
    pinyin: pinyinResult,
    hanviet: hanvietResult
  };
}

function formatDateDisplay(isoStr) {
  if (!isoStr) return new Date().toLocaleDateString('vi-VN');
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch (e) {
    return isoStr;
  }
}
