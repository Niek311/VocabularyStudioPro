/**
 * Vocabulary Studio Pro - iOS Edition Application Engine
 * Supports: PWA Offline, iOS HIG Design, Touch Swipe Flashcards, Chinese Speech TTS, Quiz & Data Sync
 */

// Initial Application State
let vocabState = {
  version: 2,
  vocabulary: {},
  sourceFileName: 'Vocabulary',
  activeTab: 'directory',
  theme: localStorage.getItem('ios_vocab_theme') || 'dark',
  searchQuery: '',
  sortBy: 'recent-desc',
  editingWord: null,

  // Flashcards state
  flashcardIndex: 0,
  flashcardFlipped: false,
  flashcardList: [],
  flashcardSession: 'new', // 'new' | 'due'

  // Quiz state
  quizMode: 'zh-to-vi', // 'zh-to-vi' | 'vi-to-zh' | 'typing'
  quizCurrentQuestion: null,
  quizScore: 0,
  quizTotal: 0,
  quizStreak: 0,
  quizHintCredits: 3, // Max 3 hints per streak
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

// Application Initialization (Fail-Proof Load Handler)
function startApp() {
  initTheme();
  loadData();
  bindNavigation();
  bindEvents();
  initTouchSwipe();
  registerServiceWorker();
  renderApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

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

function saveData() {
  const payload = {
    version: vocabState.version,
    sourceFileName: vocabState.sourceFileName || 'Từ vựng của tôi',
    vocabulary: vocabState.vocabulary,
    studyLogs: vocabState.studyLogs || {}
  };
  localStorage.setItem('ios_vocab_data', JSON.stringify(payload));
  updateStatsHeader();
}

function showSaveIndicator() {
  const dot = document.querySelector('.ios-status-dot');
  if (dot) {
    dot.style.transition = 'transform 0.2s ease, background-color 0.2s ease';
    dot.style.transform = 'scale(1.8)';
    dot.style.backgroundColor = '#30d158';
    setTimeout(() => {
      dot.style.transform = 'scale(1)';
    }, 350);
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

  // Auto Lookup Pinyin & Hán Việt AFTER user enters Hanzi (Từ gốc)
  const wordInput = document.getElementById('inputWord');
  let lookupTimer = null;

  const triggerAutoLookup = () => {
    if (vocabState.editingWord) return;
    if (!wordInput) return;

    const val = wordInput.value.trim();
    const pinyinInput = document.getElementById('inputPinyin');
    const hanvietInput = document.getElementById('inputHanViet');

    // If word input is erased/empty, clear Pinyin & Hán Việt
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
    // 1. iOS IME compositionend with timeout delay so value settles in DOM
    wordInput.addEventListener('compositionend', () => {
      setTimeout(() => triggerAutoLookup(), 80);
    });

    // 2. Focus leave (Blur)
    wordInput.addEventListener('blur', () => {
      triggerAutoLookup();
    });

    // 3. Value change & paste events
    wordInput.addEventListener('change', () => {
      triggerAutoLookup();
    });

    wordInput.addEventListener('paste', () => {
      setTimeout(() => triggerAutoLookup(), 80);
    });

    // 4. Input & Keyup event (instant for Chinese characters / debounced for typing)
    const handleInputOrKeyup = () => {
      const val = wordInput.value.trim();
      if (!val) {
        triggerAutoLookup();
        return;
      }

      // If text contains Chinese characters, trigger immediately!
      if (/[\u4e00-\u9fa5]/.test(val)) {
        triggerAutoLookup();
      }

      clearTimeout(lookupTimer);
      lookupTimer = setTimeout(() => {
        triggerAutoLookup();
      }, 250);
    };

    wordInput.addEventListener('input', handleInputOrKeyup);
    wordInput.addEventListener('keyup', handleInputOrKeyup);
  }

  // Manual Auto Lookup Button for iOS Safari users
  document.getElementById('autoLookupBtn')?.addEventListener('click', () => {
    triggerAutoLookup();
  });

  // Form Submit
  document.getElementById('wordForm')?.addEventListener('submit', handleWordFormSubmit);

  // Clear Storage Reset Button
  document.getElementById('clearAllStorageBtn')?.addEventListener('click', clearAllStorage);

  // File Import / Export ONLY
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
  document.getElementById('swipeFlashcard')?.addEventListener('click', (e) => {
    if (e.target.closest('#fcAudioBtn') || e.target.closest('.ios-audio-btn')) return;
    flipFlashcard();
  });
  document.getElementById('fcFlipBtn')?.addEventListener('click', flipFlashcard);
  document.getElementById('fcPassBtn')?.addEventListener('click', () => passFlashcard(true));
  document.getElementById('fcReviewBtn')?.addEventListener('click', () => passFlashcard(false));
  document.getElementById('fcAudioBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const currentWord = vocabState.flashcardList[vocabState.flashcardIndex];
    if (currentWord) speakChinese(currentWord.hanzi);
  });

  // Flashcards Session Selector Controls
  const bindSessionBtn = (btnId, sessionMode) => {
    document.getElementById(btnId)?.addEventListener('click', () => {
      vocabState.flashcardSession = sessionMode;
      document.querySelectorAll('.session-pill-btn').forEach(btn => btn.classList.remove('active'));
      document.getElementById(btnId)?.classList.add('active');
      prepareFlashcards();
    });
  };
  bindSessionBtn('sessionBtnNew', 'new');
  bindSessionBtn('sessionBtnDue', 'due');

  // Quiz Controls & Mode Selector
  const bindQuizModeBtn = (btnId, mode) => {
    document.getElementById(btnId)?.addEventListener('click', () => {
      vocabState.quizMode = mode;
      document.querySelectorAll('[data-quizmode]').forEach(btn => btn.classList.remove('active'));
      document.getElementById(btnId)?.classList.add('active');
      generateQuizQuestion();
    });
  };
  bindQuizModeBtn('quizModeZhVi', 'zh-to-vi');
  bindQuizModeBtn('quizModeViZh', 'vi-to-zh');
  bindQuizModeBtn('quizModeTyping', 'typing');

  document.getElementById('quizRevealHintBtn')?.addEventListener('click', () => {
    if (vocabState.quizHintCredits > 0 && vocabState.quizCurrentQuestion) {
      vocabState.quizHintCredits--;
      const elHintCount = document.getElementById('quizHintCountText');
      if (elHintCount) elHintCount.textContent = `${vocabState.quizHintCredits}/3`;

      // Reveal Pinyin in typing mode
      const pinyinEl = document.getElementById('quizQuestionPinyin');
      if (vocabState.quizCurrentQuestion.mode === 'typing' && pinyinEl) {
        pinyinEl.style.display = 'block';
        pinyinEl.textContent = `💡 Gợi ý Pinyin: ${vocabState.quizCurrentQuestion.correctPinyin || ''}`;
      }

      // Reveal Pinyin in option buttons for vi-to-zh mode
      if (vocabState.quizCurrentQuestion.mode === 'vi-to-zh') {
        document.querySelectorAll('.quiz-opt-pinyin').forEach(el => el.style.display = 'inline');
      }

      // Reveal Hán Việt in option buttons for zh-to-vi mode
      if (vocabState.quizCurrentQuestion.mode === 'zh-to-vi') {
        document.querySelectorAll('.quiz-opt-hanviet').forEach(el => el.style.display = 'inline');
      }

      const revealBtn = document.getElementById('quizRevealHintBtn');
      if (revealBtn) revealBtn.style.display = 'none';
    }
  });

  document.getElementById('quizTypingForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleTypingAnswer();
  });

  document.getElementById('nextQuizBtn')?.addEventListener('click', generateQuizQuestion);
  document.getElementById('quizAudioBtn')?.addEventListener('click', () => {
    if (vocabState.quizCurrentQuestion) speakChinese(vocabState.quizCurrentQuestion.hanzi);
  });
}

/* ==========================================================================
   JSON IMPORT & EXPORT ENGINE (CLEAN & RELIABLE)
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
        const fileName = file.name || 'Imported.json';

        vocabState.sourceFileName = fileName;
        vocabState.vocabulary = newVocab;
        vocabState.studyLogs = data.studyLogs || {};

        saveData(); // Save imported data to localStorage
        renderApp();
        alert(`✅ Đã nhập thành công file "${fileName}" (${Object.keys(vocabState.vocabulary).length} từ vựng)!`);
      } else {
        alert('❌ File JSON không đúng định dạng từ vựng!');
      }
    } catch (err) {
      alert('❌ Không thể đọc file JSON này. Vui lòng kiểm tra lại!');
      console.error(err);
    } finally {
      e.target.value = ''; // Reset file input so re-importing same file works every time
    }
  };
  reader.readAsText(file);
}

function exportDataJson() {
  const count = Object.keys(vocabState.vocabulary).length;
  if (count === 0) {
    if (!confirm('Danh sách từ vựng hiện đang trống. Bạn vẫn muốn xuất file JSON chứ?')) return;
  }

  const payload = {
    version: vocabState.version,
    sourceFileName: vocabState.sourceFileName || 'Vocabulary.json',
    vocabulary: vocabState.vocabulary,
    studyLogs: vocabState.studyLogs || {}
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const fileName = (vocabState.sourceFileName && vocabState.sourceFileName !== 'Danh sách trống') 
    ? (vocabState.sourceFileName.endsWith('.json') ? vocabState.sourceFileName : `${vocabState.sourceFileName}.json`)
    : 'Vocabulary.json';

  // Check iOS Web Share API
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isIOS && navigator.share && navigator.canShare) {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const file = new File([blob], fileName, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: fileName })
        .catch(err => console.warn('iOS Share cancelled:', err));
      return;
    }
  }

  // Desktop / Mobile Fallback Download
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
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
    if (vocabState.sortBy === 'recent-desc') {
      const timeA = a.last_seen ? new Date(a.last_seen).getTime() : (a.first_seen ? new Date(a.first_seen).getTime() : 0);
      const timeB = b.last_seen ? new Date(b.last_seen).getTime() : (b.first_seen ? new Date(b.first_seen).getTime() : 0);
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
  const now = new Date();
  const allEntries = Object.entries(vocabState.vocabulary);

  let filtered = allEntries;
  if (vocabState.flashcardSession === 'new') {
    // Filter words that have NOT graduated to REVIEW (state === 'NEW' | 'LEARNING' or interval === 0 or !next_review)
    filtered = allEntries.filter(([_, data]) => {
      const isGraduated = data.interval && data.interval > 0 && data.state === 'REVIEW';
      return !isGraduated;
    });
  } else if (vocabState.flashcardSession === 'due') {
    filtered = allEntries.filter(([_, data]) => data.next_review && new Date(data.next_review) <= now);
  }

  vocabState.flashcardList = filtered.map(([hanzi, data]) => ({ hanzi, ...data }));
  vocabState.flashcardList.sort(() => Math.random() - 0.5);
  vocabState.flashcardIndex = 0;
  vocabState.flashcardFlipped = false;

  updateAnkiDeckStatus();
  renderCurrentFlashcard();
}

function renderCurrentFlashcard() {
  const card = document.getElementById('swipeFlashcard');
  const progressBar = document.getElementById('flashcardProgressBar');
  const ratingControls = document.getElementById('ankiRatingControls');

  if (!card) return;

  const total = vocabState.flashcardList.length;
  if (total === 0) {
    if (progressBar) progressBar.style.width = "100%";
    const sessionLabel = vocabState.flashcardSession === 'new' ? 'từ mới' : 'từ đến hạn';

    document.getElementById('fcHanzi').textContent = '🎉 Hết bài';
    document.getElementById('fcCountBadge').textContent = '✨ Hoàn thành 100%';
    document.getElementById('fcPinyin').textContent = '';
    document.getElementById('fcHanViet').textContent = '';
    document.getElementById('fcMeaning').innerHTML = `<div style="padding: 10px 0;"><p style="font-size: 1.1rem; color: var(--accent-success); font-weight: 700; margin-bottom: 8px;">Chúc mừng!</p><p>Bạn đã học hết toàn bộ <strong>${sessionLabel}</strong> trong phiên này.</p></div>`;

    if (ratingControls) ratingControls.style.display = 'none';
    card.classList.remove('flipped');
    card.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
    vocabState.flashcardFlipped = false;

    updateAnkiDeckStatus();
    return;
  } else {
    if (ratingControls) ratingControls.style.display = 'flex';
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
  const isNewOrLearning = !current.next_review || current.interval === 0 || current.state === 'NEW' || current.state === 'LEARNING' || current.state === 'RELEARNING';
  const oldInterval = current.interval || 0;
  const easeFactor = current.ease_factor || 2.5;

  const elAgain = document.getElementById('timeAgainLabel');
  const elHard = document.getElementById('timeHardLabel');
  const elGood = document.getElementById('timeGoodLabel');
  const elEasy = document.getElementById('timeEasyLabel');

  if (isNewOrLearning) {
    if (elAgain) elAgain.textContent = '1 phút';
    if (elHard) elHard.textContent = '10 phút';
    if (elGood) elGood.textContent = '1 ngày';
    if (elEasy) elEasy.textContent = '4 ngày';
  } else {
    const hardDays = Math.max(1, Math.round(oldInterval * 1.2));
    const goodDays = Math.max(1, Math.round(oldInterval * easeFactor));
    const easyDays = Math.max(1, Math.round(oldInterval * easeFactor * 1.3));

    if (elAgain) elAgain.textContent = '1 phút';
    if (elHard) elHard.textContent = `${hardDays} ngày`;
    if (elGood) elGood.textContent = `${goodDays} ngày`;
    if (elEasy) elEasy.textContent = `${easyDays} ngày`;
  }

  // Reset Stamps
  document.querySelectorAll('.swipe-stamp').forEach(el => el.style.opacity = '0');

  updateAnkiDeckStatus();
}

function rateAnkiCard(rating) {
  if (!vocabState.flashcardList || vocabState.flashcardList.length === 0) return;
  const currentItem = vocabState.flashcardList[vocabState.flashcardIndex];
  if (!currentItem) return;

  const wordKey = currentItem.hanzi;
  const wordData = vocabState.vocabulary[wordKey] || currentItem;

  const oldInterval = wordData.interval || 0;
  let interval = oldInterval;
  let easeFactor = wordData.ease_factor || 2.5;
  let state = wordData.state || (!wordData.next_review && oldInterval === 0 ? 'NEW' : 'REVIEW');
  let lapseCount = wordData.lapse_count || 0;
  let reviewCount = (wordData.review_count || wordData.count || 0) + 1;

  const isNewOrLearning = state === 'NEW' || state === 'LEARNING' || state === 'RELEARNING' || (!wordData.next_review && oldInterval === 0);
  const now = new Date();
  const nextReviewDate = new Date();

  if (isNewOrLearning) {
    // Rules for NEW / LEARNING Cards
    if (rating === 'again') {
      state = 'LEARNING';
      interval = 0;
      lapseCount++;
      easeFactor = Math.max(1.3, easeFactor - 0.20);
      nextReviewDate.setMinutes(nextReviewDate.getMinutes() + 1); // 1 min
    } else if (rating === 'hard') {
      state = 'LEARNING';
      interval = 0;
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      nextReviewDate.setMinutes(nextReviewDate.getMinutes() + 10); // 10 min
    } else if (rating === 'good') {
      state = 'REVIEW';
      interval = 1; // 1 day
      nextReviewDate.setDate(nextReviewDate.getDate() + interval);
    } else if (rating === 'easy') {
      state = 'REVIEW';
      interval = 4; // 4 days
      easeFactor = easeFactor + 0.15;
      nextReviewDate.setDate(nextReviewDate.getDate() + interval);
    }
  } else {
    // Rules for REVIEW Cards (Graduated SRS)
    if (rating === 'again') {
      state = 'RELEARNING';
      lapseCount++;
      easeFactor = Math.max(1.3, easeFactor - 0.20);
      // Smart Memory Retention: preserve 20% of previous long interval rather than destroying 50d down to 1d
      interval = Math.max(1, Math.round(oldInterval * 0.20));
      nextReviewDate.setMinutes(nextReviewDate.getMinutes() + 1);
    } else if (rating === 'hard') {
      state = 'REVIEW';
      interval = Math.max(1, Math.round(oldInterval * 1.20));
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      nextReviewDate.setDate(nextReviewDate.getDate() + interval);
    } else if (rating === 'good') {
      state = 'REVIEW';
      interval = Math.max(1, Math.round(oldInterval * easeFactor));
      nextReviewDate.setDate(nextReviewDate.getDate() + interval);
    } else if (rating === 'easy') {
      state = 'REVIEW';
      interval = Math.max(1, Math.round(oldInterval * easeFactor * 1.30));
      easeFactor = easeFactor + 0.15;
      nextReviewDate.setDate(nextReviewDate.getDate() + interval);
    }
  }

  // Log study session into daily heatmap history
  const todayStr = now.toISOString().slice(0, 10);
  if (!vocabState.studyLogs) vocabState.studyLogs = {};
  vocabState.studyLogs[todayStr] = (vocabState.studyLogs[todayStr] || 0) + 1;

  // Save word SRS stats
  vocabState.vocabulary[wordKey] = {
    ...wordData,
    state,
    count: reviewCount,
    review_count: reviewCount,
    lapse_count: lapseCount,
    interval,
    ease_factor: parseFloat(easeFactor.toFixed(2)),
    next_review: nextReviewDate.toISOString(),
    last_seen: now.toISOString()
  };

  saveData();
  passFlashcard(rating);
}

function updateAnkiDeckStatus() {
  const now = new Date();
  let newCount = 0;
  let dueCount = 0;

  Object.values(vocabState.vocabulary).forEach(item => {
    const isGraduated = item.interval && item.interval > 0 && item.state === 'REVIEW';
    if (!isGraduated) {
      newCount++; // Un-graduated / Learning words stay in New/Learning count
    } else if (item.next_review && new Date(item.next_review) <= now) {
      dueCount++;
    }
  });

  // Update Session Pill Counts
  const elNewCount = document.getElementById('countSessionNew');
  const elDueCount = document.getElementById('countSessionDue');
  if (elNewCount) elNewCount.textContent = newCount.toString();
  if (elDueCount) elDueCount.textContent = dueCount.toString();
}

let lastFlashcardFlipTime = 0;

function flipFlashcard() {
  const now = Date.now();
  if (now - lastFlashcardFlipTime < 300) return; // Debounce double-flips from touch+click events!
  lastFlashcardFlipTime = now;

  const card = document.getElementById('swipeFlashcard');
  if (!card) return;
  vocabState.flashcardFlipped = !vocabState.flashcardFlipped;
  card.classList.toggle('flipped', vocabState.flashcardFlipped);
  card.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  card.style.transform = vocabState.flashcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
}

function passFlashcard(direction = 'good') {
  const card = document.getElementById('swipeFlashcard');
  if (!card) return;

  let targetX = 0;
  let targetY = 0;
  let rotation = 0;

  if (direction === 'again' || direction === 'left') {
    targetX = -450;
    rotation = -20;
  } else if (direction === 'easy' || direction === 'right') {
    targetX = 450;
    rotation = 20;
  } else if (direction === 'good' || direction === 'up') {
    targetY = -450;
  } else if (direction === 'hard' || direction === 'down') {
    targetY = 450;
  } else {
    targetX = 450;
    rotation = 20;
  }

  const currentFlip = vocabState.flashcardFlipped ? 'rotateY(180deg)' : '';

  card.style.transition = 'transform 0.35s ease-out, opacity 0.35s ease-out';
  card.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) rotate(${rotation}deg) ${currentFlip}`;
  card.style.opacity = '0';

  setTimeout(() => {
    card.style.opacity = '1';

    // Dynamic Queue Re-Filtering & Graduation Logic
    const currentItem = vocabState.flashcardList[vocabState.flashcardIndex];
    if (currentItem) {
      const liveData = vocabState.vocabulary[currentItem.hanzi] || currentItem;
      const isGraduated = liveData.next_review && liveData.interval > 0 && liveData.state === 'REVIEW';

      if (isGraduated || direction === 'good' || direction === 'easy') {
        // Remove graduated card from active session queue
        vocabState.flashcardList.splice(vocabState.flashcardIndex, 1);
        if (vocabState.flashcardIndex >= vocabState.flashcardList.length) {
          vocabState.flashcardIndex = 0;
        }
      } else {
        // Re-queue card needing review (Again / Hard) to the back of the queue
        if (vocabState.flashcardList.length > 1) {
          const [relearnItem] = vocabState.flashcardList.splice(vocabState.flashcardIndex, 1);
          vocabState.flashcardList.push(relearnItem);
        }
      }
    }

    renderCurrentFlashcard();
  }, 350);
}

/* TOUCH DRAG SWIPE ENGINE (4-WAY DIRECTIONAL ANKI SWIPING) */
function initTouchSwipe() {
  const card = document.getElementById('swipeFlashcard');
  const stage = document.querySelector('.flashcard-stage');
  if (!card || !stage) return;

  const stampAgain = document.querySelector('.stamp-again');
  const stampEasy = document.querySelector('.stamp-easy');
  const stampGood = document.querySelector('.stamp-good');
  const stampHard = document.querySelector('.stamp-hard');

  const hideAllStamps = () => {
    if (stampAgain) stampAgain.style.opacity = '0';
    if (stampEasy) stampEasy.style.opacity = '0';
    if (stampGood) stampGood.style.opacity = '0';
    if (stampHard) stampHard.style.opacity = '0';
  };

  const onStart = (e) => {
    if (e.target.closest('#fcAudioBtn') || e.target.closest('.ios-audio-btn')) {
      return; // Ignore card drag/flip when tapping the speaker audio button!
    }
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

    if (e.cancelable) e.preventDefault(); // Prevent touch scrolling during card drag

    const rotation = vocabState.currentX / 15;
    const baseFlip = vocabState.flashcardFlipped ? 'rotateY(180deg)' : '';
    card.style.transform = `translate3d(${vocabState.currentX}px, ${vocabState.currentY}px, 0) rotate(${rotation}deg) ${baseFlip}`;

    // Opacity 4-Direction Stamps logic
    hideAllStamps();

    const absX = Math.abs(vocabState.currentX);
    const absY = Math.abs(vocabState.currentY);

    if (absX > absY) {
      if (vocabState.currentX < -30 && stampAgain) {
        stampAgain.style.opacity = Math.min(absX / 80, 1).toString();
      } else if (vocabState.currentX > 30 && stampEasy) {
        stampEasy.style.opacity = Math.min(absX / 80, 1).toString();
      }
    } else {
      if (vocabState.currentY < -30 && stampGood) {
        stampGood.style.opacity = Math.min(absY / 80, 1).toString();
      } else if (vocabState.currentY > 30 && stampHard) {
        stampHard.style.opacity = Math.min(absY / 80, 1).toString();
      }
    }
  };

  const onEnd = () => {
    if (!vocabState.isDragging) return;
    vocabState.isDragging = false;
    hideAllStamps();

    const absX = Math.abs(vocabState.currentX);
    const absY = Math.abs(vocabState.currentY);

    if (absX > 60 || absY > 60) {
      if (absX > absY) {
        if (vocabState.currentX < -60) {
          rateAnkiCard('again'); // Swipe Left = Again / Học lại 🔴
        } else if (vocabState.currentX > 60) {
          rateAnkiCard('easy'); // Swipe Right = Easy / Dễ 🔵
        }
      } else {
        if (vocabState.currentY < -60) {
          rateAnkiCard('good'); // Swipe Up = Good / Tốt 🟢
        } else if (vocabState.currentY > 60) {
          rateAnkiCard('hard'); // Swipe Down = Hard / Khó 🟠
        }
      }
    } else if (absX < 25 && absY < 25) {
      flipFlashcard(); // Tap Flip (guaranteed tap detection for mobile touchscreens)
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
  stage.addEventListener('touchmove', onMove, { passive: false });
  stage.addEventListener('touchend', onEnd);

  // Mouse Events for Desktop Testing
  stage.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
}

/* ==========================================================================
   VIEW 3: TRẮC NGHIỆM ĐA DẠNG & LUYỆN GÕ (DIVERSE QUIZ & TYPING ENGINE)
   ========================================================================== */
function generateQuizQuestion() {
  const keys = Object.keys(vocabState.vocabulary);
  if (keys.length < 2) {
    alert('Cần ít nhất 2 từ vựng để bắt đầu Trắc nghiệm!');
    return;
  }

  vocabState.quizAnswered = false;
  document.getElementById('nextQuizBtn').style.display = 'none';

  const feedbackBox = document.getElementById('quizFeedbackBox');
  if (feedbackBox) feedbackBox.style.display = 'none';

  const typingForm = document.getElementById('quizTypingForm');
  const optionsContainer = document.getElementById('quizOptionsContainer');
  const typingInput = document.getElementById('quizTypingInput');
  if (typingInput) typingInput.value = '';

  // Pick Target Word
  const correctKey = keys[Math.floor(Math.random() * keys.length)];
  const correctItem = { hanzi: correctKey, ...vocabState.vocabulary[correctKey] };

  // Pick 3 Distractors
  const distractors = [];
  while (distractors.length < Math.min(3, keys.length - 1)) {
    const rKey = keys[Math.floor(Math.random() * keys.length)];
    if (rKey !== correctKey && !distractors.includes(rKey)) {
      distractors.push(rKey);
    }
  }

  const options = [correctItem, ...distractors.map(k => ({ hanzi: k, ...vocabState.vocabulary[k] }))];
  options.sort(() => Math.random() - 0.5);

  // Randomize Quiz Mode for Maximum Challenge! (Zh->Vi, Vi->Zh, Typing)
  const quizModes = ['zh-to-vi', 'vi-to-zh', 'typing'];
  const mode = quizModes[Math.floor(Math.random() * quizModes.length)];

  vocabState.quizCurrentQuestion = {
    mode,
    correctHanzi: correctKey,
    correctMeaning: correctItem.meaning,
    correctPinyin: correctItem.pinyin,
    correctHanViet: correctItem.han_viet,
    options
  };

  const tagEl = document.getElementById('quizTypeTag');
  const hanziEl = document.getElementById('quizQuestionHanzi');
  const pinyinEl = document.getElementById('quizQuestionPinyin');
  const revealBtn = document.getElementById('quizRevealHintBtn');
  const hintCountEl = document.getElementById('quizHintCountText');

  if (hintCountEl) hintCountEl.textContent = `${vocabState.quizHintCredits}/3`;
  if (revealBtn) revealBtn.style.display = 'none';

  if (mode === 'zh-to-vi') {
    // Mode 1: Trung ➔ Việt (Display Hanzi + Pinyin -> Pick Meaning, Hint = Hán Việt)
    if (tagEl) tagEl.textContent = '🇨🇳 ➔ 🇻🇳 Chọn nghĩa tiếng Việt đúng:';
    if (hanziEl) hanziEl.textContent = correctItem.hanzi;
    if (pinyinEl) {
      pinyinEl.style.display = 'block';
      pinyinEl.textContent = correctItem.pinyin || '';
    }

    if (optionsContainer) {
      optionsContainer.style.display = 'flex';
      optionsContainer.innerHTML = options.map(opt => `
        <button class="quiz-option-btn" data-hanzi="${escapeHtml(opt.hanzi)}" onclick="handleQuizAnswer('${escapeHtml(opt.hanzi)}')">
          <span class="quiz-opt-text">${escapeHtml(opt.meaning || opt.pinyin || opt.hanzi)}</span>
          <span class="quiz-opt-hanviet" style="display: none; color: var(--accent-purple); margin-left: 8px;">(Hán Việt: ${escapeHtml(opt.han_viet || 'N/A')})</span>
          <span class="quiz-opt-extra" style="display: none; color: var(--accent-warning); margin-left: 8px;">(${escapeHtml(opt.hanzi)} - ${escapeHtml(opt.pinyin || '')})</span>
        </button>
      `).join('');
    }

    if (revealBtn) {
      revealBtn.style.display = 'inline-block';
      if (vocabState.quizHintCredits > 0) {
        revealBtn.disabled = false;
        revealBtn.textContent = `💡 Xem gợi ý Hán Việt (Còn ${vocabState.quizHintCredits}/3)`;
      } else {
        revealBtn.disabled = true;
        revealBtn.textContent = '🔒 Đã hết lượt gợi ý (0/3)';
      }
    }

    if (typingForm) typingForm.style.display = 'none';

  } else if (mode === 'vi-to-zh') {
    // Mode 2: Việt ➔ Trung (Display Meaning -> Hide Pinyin initially until hint or answer)
    if (tagEl) tagEl.textContent = '🇻🇳 ➔ 🇨🇳 Chọn từ Hán tự tiếng Trung đúng:';
    if (hanziEl) hanziEl.textContent = correctItem.meaning || correctItem.hanzi;
    if (pinyinEl) {
      pinyinEl.style.display = 'block';
      pinyinEl.textContent = correctItem.han_viet ? `Hán Việt: ${correctItem.han_viet}` : '';
    }

    if (optionsContainer) {
      optionsContainer.style.display = 'flex';
      optionsContainer.innerHTML = options.map(opt => `
        <button class="quiz-option-btn" data-hanzi="${escapeHtml(opt.hanzi)}" onclick="handleQuizAnswer('${escapeHtml(opt.hanzi)}')">
          <span style="font-size: 1.1rem; font-weight: 700;">${escapeHtml(opt.hanzi)}</span>
          <span class="quiz-opt-pinyin" style="display: none; color: var(--accent-warning); margin-left: 8px;">(${escapeHtml(opt.pinyin || '')})</span>
          <span class="quiz-opt-meaning" style="display: none; color: var(--text-secondary); margin-left: 8px;">- ${escapeHtml(opt.meaning || '')}</span>
        </button>
      `).join('');
    }

    if (revealBtn) {
      revealBtn.style.display = 'inline-block';
      if (vocabState.quizHintCredits > 0) {
        revealBtn.disabled = false;
        revealBtn.textContent = `💡 Xem gợi ý Pinyin (Còn ${vocabState.quizHintCredits}/3)`;
      } else {
        revealBtn.disabled = true;
        revealBtn.textContent = '🔒 Đã hết lượt gợi ý (0/3)';
      }
    }

    if (typingForm) typingForm.style.display = 'none';

  } else if (mode === 'typing') {
    // Mode 3: Gõ từ Trung (Display Meaning -> Hide Pinyin behind 3 Hint Credits limit)
    if (tagEl) tagEl.textContent = '✍️ Gõ Hán tự tiếng Trung tương ứng:';
    if (hanziEl) hanziEl.textContent = correctItem.meaning;
    if (pinyinEl) pinyinEl.style.display = 'none'; // Hidden by default

    if (revealBtn) {
      revealBtn.style.display = 'inline-block';
      if (vocabState.quizHintCredits > 0) {
        revealBtn.disabled = false;
        revealBtn.textContent = `💡 Xem gợi ý Pinyin (Còn ${vocabState.quizHintCredits}/3)`;
      } else {
        revealBtn.disabled = true;
        revealBtn.textContent = '🔒 Đã hết lượt gợi ý (0/3)';
      }
    }

    if (optionsContainer) optionsContainer.style.display = 'none';
    if (typingForm) typingForm.style.display = 'flex';
    if (typingInput) setTimeout(() => typingInput.focus(), 100);
  }
}

function checkQuizStreakReward() {
  const streak = vocabState.quizStreak;
  const rewardMilestones = [5, 10, 20, 30, 50];
  if (rewardMilestones.includes(streak)) {
    vocabState.quizHintCredits++;
    const hintCountEl = document.getElementById('quizHintCountText');
    if (hintCountEl) hintCountEl.textContent = `${vocabState.quizHintCredits}`;

    const feedbackBox = document.getElementById('quizFeedbackBox');
    if (feedbackBox) {
      feedbackBox.style.display = 'block';
      feedbackBox.className = 'quiz-feedback-box correct';
      feedbackBox.innerHTML = `🎁 <strong>Thưởng chuỗi 🔥 ${streak}!</strong> Bạn vừa nhận được <strong>+1 lượt Gợi ý 💡</strong>! (Hiện có: ${vocabState.quizHintCredits} lượt)`;
    }
  }
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
    checkQuizStreakReward();
  } else {
    vocabState.quizStreak = 0;
    vocabState.quizHintCredits = 3; // Reset 3 Hint Credits on Streak Break!
  }

  // Update Score Board
  document.getElementById('quizScoreText').textContent = vocabState.quizScore;
  document.getElementById('quizStreakText').textContent = vocabState.quizStreak;
  document.getElementById('quizTotalText').textContent = vocabState.quizTotal;
  const hintCountEl = document.getElementById('quizHintCountText');
  if (hintCountEl) hintCountEl.textContent = `${vocabState.quizHintCredits}`;

  // Hide Reveal Hint Button after answering
  const revealBtn = document.getElementById('quizRevealHintBtn');
  if (revealBtn) revealBtn.style.display = 'none';

  // Reveal Pinyin & Meaning for ALL 4 options so learner learns from all choices
  document.querySelectorAll('.quiz-opt-pinyin, .quiz-opt-meaning, .quiz-opt-extra, .quiz-opt-hanviet').forEach(el => {
    el.style.display = 'inline';
  });

  // Highlight Options
  const optionBtns = document.querySelectorAll('.quiz-option-btn');
  optionBtns.forEach(btn => {
    const hanziAttr = btn.getAttribute('data-hanzi');
    if (hanziAttr === q.correctHanzi) {
      btn.classList.add('correct');
    } else if (hanziAttr === selectedHanzi) {
      btn.classList.add('wrong');
    }
  });

  document.getElementById('nextQuizBtn').style.display = 'inline-flex';
}

function handleTypingAnswer() {
  if (vocabState.quizAnswered) return;
  vocabState.quizAnswered = true;

  const q = vocabState.quizCurrentQuestion;
  const input = document.getElementById('quizTypingInput');
  const typedVal = input ? input.value.trim() : '';

  const isCorrect = typedVal === q.correctHanzi;
  vocabState.quizTotal++;
  if (isCorrect) {
    vocabState.quizScore += 10;
    vocabState.quizStreak++;
    checkQuizStreakReward();
  } else {
    vocabState.quizStreak = 0;
    vocabState.quizHintCredits = 3; // Reset 3 Hint Credits on Streak Break!
  }

  document.getElementById('quizScoreText').textContent = vocabState.quizScore;
  document.getElementById('quizStreakText').textContent = vocabState.quizStreak;
  document.getElementById('quizTotalText').textContent = vocabState.quizTotal;
  const hintCountEl = document.getElementById('quizHintCountText');
  if (hintCountEl) hintCountEl.textContent = `${vocabState.quizHintCredits}`;

  const rewardMilestones = [5, 10, 20, 30, 50];
  const feedbackBox = document.getElementById('quizFeedbackBox');
  if (feedbackBox && (!isCorrect || !rewardMilestones.includes(vocabState.quizStreak))) {
    feedbackBox.style.display = 'block';
    if (isCorrect) {
      feedbackBox.className = 'quiz-feedback-box correct';
      feedbackBox.innerHTML = `🎉 Chính xác! <strong>${escapeHtml(q.correctHanzi)}</strong> (${escapeHtml(q.correctPinyin)})`;
    } else {
      feedbackBox.className = 'quiz-feedback-box wrong';
      feedbackBox.innerHTML = `❌ Chưa đúng! Đáp án chuẩn: <strong>${escapeHtml(q.correctHanzi)}</strong> (${escapeHtml(q.correctPinyin)})`;
    }
  }

  document.getElementById('nextQuizBtn').style.display = 'inline-flex';
}

/* ==========================================================================
   VIEW 4: THỐNG KÊ (STATS)
   ========================================================================== */
function renderStats() {
  const entries = Object.entries(vocabState.vocabulary);
  const totalWords = entries.length;
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  let learnedWords = 0;
  let newWords = 0;
  let masteredWords = 0; // interval >= 90 (Trí nhớ dài hạn >3 tháng)
  let learningWords = 0; // interval > 0 && interval < 90

  let dueToday = 0;
  let dueTomorrow = 0;
  let dueNext7Days = 0;
  let dueLongTerm = 0; // interval >= 90 (Lịch ôn >3 tháng)

  entries.forEach(([_, val]) => {
    const isNew = !val.next_review && !val.interval;
    if (isNew) {
      newWords++;
    } else {
      learnedWords++;
      const interval = val.interval || 0;
      if (interval >= 90) {
        masteredWords++;
        dueLongTerm++;
      } else {
        learningWords++;
        if (val.next_review) {
          const reviewDate = new Date(val.next_review);
          if (reviewDate <= now) {
            dueToday++;
          } else if (reviewDate <= tomorrow) {
            dueTomorrow++;
          } else if (reviewDate <= in7Days) {
            dueNext7Days++;
          }
        }
      }
    }
  });

  const masteredCount = masteredWords;
  const masteryRate = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;
  const newPct = totalWords > 0 ? ((newWords / totalWords) * 100).toFixed(1) : 0;
  const learnPct = totalWords > 0 ? ((learningWords / totalWords) * 100).toFixed(1) : 0;
  const masterPct = totalWords > 0 ? ((masteredWords / totalWords) * 100).toFixed(1) : 0;

  // Key Metrics
  document.getElementById('statTotalWords').textContent = totalWords;
  document.getElementById('statLearnedWords').textContent = learnedWords;
  document.getElementById('statNewWords').textContent = newWords;
  document.getElementById('statDueToday').textContent = dueToday;

  // Progress Bar & Legend
  document.getElementById('statMasteryRate').textContent = `${masteryRate}% Thuộc bài`;
  
  const barNew = document.getElementById('barNew');
  const barLearning = document.getElementById('barLearning');
  const barMastered = document.getElementById('barMastered');
  if (barNew) barNew.style.width = `${newPct}%`;
  if (barLearning) barLearning.style.width = `${learnPct}%`;
  if (barMastered) barMastered.style.width = `${masterPct}%`;

  const elValNew = document.getElementById('valNewWords');
  const elValLearn = document.getElementById('valLearningWords');
  const elValMaster = document.getElementById('valMasteredWords');
  if (elValNew) elValNew.textContent = `${newWords} từ (${newPct}%)`;
  if (elValLearn) elValLearn.textContent = `${learningWords} từ (${learnPct}%)`;
  if (elValMaster) elValMaster.textContent = `${masteredWords} từ (${masterPct}%)`;

  // Forecast Schedule
  const elToday = document.getElementById('forecastToday');
  const elTomorrow = document.getElementById('forecastTomorrow');
  const el7Days = document.getElementById('forecastNext7Days');
  const elLongTerm = document.getElementById('forecastLongTerm');
  if (elToday) elToday.textContent = `${dueToday} từ`;
  if (elTomorrow) elTomorrow.textContent = `${dueTomorrow} từ`;
  if (el7Days) el7Days.textContent = `${dueNext7Days} từ`;
  if (elLongTerm) elLongTerm.textContent = `${dueLongTerm} từ`;

  // Heatmap & Streak render
  renderAnkiHeatmap();

  // Top words
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
