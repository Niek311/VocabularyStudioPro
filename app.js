/**
 * Vocabulary Studio Pro - Standalone JavaScript Application Engine
 */

// Initial State
let vocabState = {
  version: 1,
  vocabulary: {},
  sourceFileName: 'Default Vocabulary',
  activeTab: 'directory', // directory, flashcards, quiz, stats
  theme: localStorage.getItem('vocab_theme') || 'dark',
  searchQuery: '',
  sortBy: 'count-desc', // count-desc, recent-desc, az
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
  selectedAnswer: null
};

// Sample fallback vocabulary for instant demo
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
    }
  }
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadDataFromLocalStorage();
  bindEvents();
  renderApp();
});

// Theme Management
function initTheme() {
  document.documentElement.setAttribute('data-theme', vocabState.theme);
  updateThemeIcon();
}

function toggleTheme() {
  vocabState.theme = vocabState.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', vocabState.theme);
  localStorage.setItem('vocab_theme', vocabState.theme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.innerHTML = vocabState.theme === 'dark' ? '☀️' : '🌙';
    btn.title = vocabState.theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối';
  }
}

// LocalStorage Persistence
function loadDataFromLocalStorage() {
  const saved = localStorage.getItem('vocab_studio_data');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.vocabulary) {
        vocabState.vocabulary = parsed.vocabulary;
        vocabState.version = parsed.version || 1;
        vocabState.sourceFileName = localStorage.getItem('vocab_studio_filename') || 'Dữ liệu đã lưu';
        return;
      }
    } catch (e) {
      console.error("Lỗi đọc dữ liệu từ LocalStorage:", e);
    }
  }
  // Default to sample if empty
  vocabState.vocabulary = { ...SAMPLE_VOCABULARY.vocabulary };
  vocabState.sourceFileName = 'Từ vựng Mẫu';
}

function saveDataToLocalStorage() {
  const obj = {
    version: vocabState.version,
    vocabulary: vocabState.vocabulary
  };
  localStorage.setItem('vocab_studio_data', JSON.stringify(obj));
  localStorage.setItem('vocab_studio_filename', vocabState.sourceFileName);
}

// Audio Speech Synthesis (Chinese TTS)
function speakWord(text) {
  if (!('speechSynthesis' in window)) {
    alert("Trình duyệt của bạn không hỗ trợ đọc âm thanh (Speech Synthesis).");
    return;
  }
  window.speechSynthesis.cancel(); // Stop ongoing speech
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.85; // Slightly slower for language learning clarity
  window.speechSynthesis.speak(utterance);
}

// Binding Main UI Events
function bindEvents() {
  // Theme Toggle
  document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

  // Nav Tabs
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.dataset.tab;
      switchTab(tab);
    });
  });

  // Search & Filter
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      vocabState.searchQuery = e.target.value.trim().toLowerCase();
      renderDirectoryView();
    });
  }

  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      vocabState.sortBy = e.target.value;
      renderDirectoryView();
    });
  }

  // File Actions
  document.getElementById('openFileBtn').addEventListener('click', () => {
    document.getElementById('fileInputHidden').click();
  });

  document.getElementById('fileInputHidden').addEventListener('change', handleFileSelect);
  document.getElementById('exportJsonBtn').addEventListener('click', exportJsonFile);
  document.getElementById('exportCsvBtn').addEventListener('click', exportCsvFile);
  document.getElementById('addWordBtn').addEventListener('click', () => openWordModal());
  document.getElementById('loadSampleBtn').addEventListener('click', loadSampleData);

  // Drag & Drop
  const body = document.body;
  body.addEventListener('dragover', (e) => e.preventDefault());
  body.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processJsonFile(e.dataTransfer.files[0]);
    }
  });

  // Modal Controls
  document.getElementById('closeModalBtn').addEventListener('click', closeWordModal);
  document.getElementById('cancelModalBtn').addEventListener('click', closeWordModal);
  document.getElementById('saveWordBtn').addEventListener('click', saveWordFromModal);
  document.getElementById('addMeaningRowBtn').addEventListener('click', () => addMeaningInputRow(''));
}

// Tab Switching
function switchTab(tabName) {
  vocabState.activeTab = tabName;
  document.querySelectorAll('.nav-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabName);
  });

  document.querySelectorAll('.tab-content-panel').forEach(panel => {
    panel.style.display = panel.id === `tab-${tabName}` ? 'block' : 'none';
  });

  if (tabName === 'directory') renderDirectoryView();
  if (tabName === 'flashcards') initFlashcardView();
  if (tabName === 'quiz') initQuizView();
  if (tabName === 'stats') renderStatsView();
}

// Main Render Dispatcher
function renderApp() {
  document.getElementById('fileNameText').innerText = vocabState.sourceFileName;
  switchTab(vocabState.activeTab);
}

// --- DIRECTORY VIEW ---
function getFilteredAndSortedRows() {
  const words = Object.keys(vocabState.vocabulary);
  let rows = words.map(word => {
    const info = vocabState.vocabulary[word] || {};
    return {
      word,
      pinyin: info.pinyin || '',
      han_viet: info.han_viet || '',
      meaning: info.meaning || '',
      count: info.count || 1,
      first_seen: info.first_seen || '',
      last_seen: info.last_seen || ''
    };
  });

  // Filter
  if (vocabState.searchQuery) {
    const q = vocabState.searchQuery;
    rows = rows.filter(r => 
      r.word.toLowerCase().includes(q) ||
      r.pinyin.toLowerCase().includes(q) ||
      r.han_viet.toLowerCase().includes(q) ||
      r.meaning.toLowerCase().includes(q)
    );
  }

  // Sort
  if (vocabState.sortBy === 'count-desc') {
    rows.sort((a, b) => b.count - a.count);
  } else if (vocabState.sortBy === 'recent-desc') {
    rows.sort((a, b) => new Date(b.last_seen || 0) - new Date(a.last_seen || 0));
  } else if (vocabState.sortBy === 'az') {
    rows.sort((a, b) => a.word.localeCompare(b.word, 'zh'));
  }

  return rows;
}

function renderDirectoryView() {
  const gridContainer = document.getElementById('vocabGrid');
  const rows = getFilteredAndSortedRows();
  const totalCount = Object.keys(vocabState.vocabulary).length;

  document.getElementById('vocabStatsBadge').innerText = `${rows.length} / ${totalCount} từ`;

  if (rows.length === 0) {
    gridContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
        <h3>Không tìm thấy từ vựng nào</h3>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">Hãy thử từ khóa khác hoặc bấm "+ Thêm từ mới"</p>
      </div>
    `;
    return;
  }

  gridContainer.innerHTML = rows.map(r => `
    <div class="vocab-card fade-in">
      <div>
        <div class="card-top">
          <div class="word-hanzi">${escapeHtml(r.word)}</div>
          <button class="audio-btn" onclick="speakWord('${escapeJsStr(r.word)}')" title="Phát âm tiếng Trung">🔊</button>
        </div>
        
        <div class="card-phonetics">
          ${r.pinyin ? `<span class="pinyin-badge">${escapeHtml(r.pinyin)}</span>` : ''}
          ${r.han_viet ? `<span class="hanviet-badge">[${escapeHtml(r.han_viet)}]</span>` : ''}
        </div>

        <div class="meaning-box">
          ${formatMeaningText(r.meaning)}
        </div>
      </div>

      <div class="card-footer">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="count-pill">Gặp ${r.count} lần</span>
        </div>
        <div class="card-actions">
          <button class="mini-btn" onclick="openWordModal('${escapeJsStr(r.word)}')" title="Sửa từ">✏️</button>
          <button class="mini-btn" onclick="deleteWord('${escapeJsStr(r.word)}')" title="Xóa từ" style="color: var(--accent-danger);">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

function formatMeaningText(meaning) {
  if (!meaning) return '<span style="color: var(--text-muted); italic;">Chưa có nghĩa</span>';
  const parts = meaning.split(';').map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts.map(p => `<div>${escapeHtml(p)}</div>`).join('');
  }
  return escapeHtml(meaning);
}

// --- WORD EDITOR MODAL ---
function openWordModal(wordToEdit = null) {
  vocabState.editingWord = wordToEdit;
  const modalTitle = document.getElementById('modalTitle');
  const txtWord = document.getElementById('txtWord');
  const txtPinyin = document.getElementById('txtPinyin');
  const txtHanViet = document.getElementById('txtHanViet');
  const txtCount = document.getElementById('txtCount');
  const meaningsContainer = document.getElementById('meaningsContainer');

  meaningsContainer.innerHTML = '';

  if (wordToEdit && vocabState.vocabulary[wordToEdit]) {
    const data = vocabState.vocabulary[wordToEdit];
    modalTitle.innerText = 'Chỉnh Sửa Từ Vựng';
    txtWord.value = wordToEdit;
    txtWord.disabled = true; // Key cannot be edited
    txtPinyin.value = data.pinyin || '';
    txtHanViet.value = data.han_viet || '';
    txtCount.value = data.count || 1;

    // Parse meanings
    const rawMeaning = data.meaning || '';
    const parts = rawMeaning.Split ? rawMeaning.Split(';') : rawMeaning.split(';');
    const cleanParts = parts.map(p => p.replace(/^\d+[\.\:\s]*/, '').trim()).filter(Boolean);

    if (cleanParts.length > 0) {
      cleanParts.forEach(m => addMeaningInputRow(m));
    } else {
      addMeaningInputRow('');
    }
  } else {
    modalTitle.innerText = 'Thêm Từ Vựng Mới';
    txtWord.value = '';
    txtWord.disabled = false;
    txtPinyin.value = '';
    txtHanViet.value = '';
    txtCount.value = 1;
    addMeaningInputRow('');
  }

  document.getElementById('wordModalOverlay').classList.add('active');
  if (!wordToEdit) txtWord.focus();
}

function closeWordModal() {
  document.getElementById('wordModalOverlay').classList.remove('active');
  vocabState.editingWord = null;
}

function addMeaningInputRow(val = '') {
  const container = document.getElementById('meaningsContainer');
  const rowId = 'meaning_row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  
  const div = document.createElement('div');
  div.className = 'meaning-row';
  div.id = rowId;
  div.innerHTML = `
    <input type="text" class="form-input meaning-input-field" value="${escapeHtml(val)}" placeholder="Nhập nghĩa của từ..." />
    <button class="btn btn-icon" style="color: var(--accent-danger); flex-shrink: 0;" onclick="removeMeaningRow('${rowId}')">🗑️</button>
  `;
  container.appendChild(div);
}

function removeMeaningRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) row.remove();
}

function saveWordFromModal() {
  const txtWord = document.getElementById('txtWord').value.trim();
  const txtPinyin = document.getElementById('txtPinyin').value.trim();
  const txtHanViet = document.getElementById('txtHanViet').value.trim();
  const countVal = parseInt(document.getElementById('txtCount').value) || 1;

  if (!txtWord) {
    alert("Vui lòng nhập Từ chữ Hán!");
    return;
  }

  // Gather meaning fields
  const meaningInputs = document.querySelectorAll('.meaning-input-field');
  const meanings = [];
  meaningInputs.forEach(input => {
    const val = input.value.trim().replace(/^\d+[\.\:\s]*/, '');
    if (val) meanings.push(val);
  });

  let finalMeaning = '';
  if (meanings.length === 1) {
    finalMeaning = meanings[0];
  } else if (meanings.length > 1) {
    finalMeaning = meanings.map((m, idx) => `${idx + 1}. ${m}`).join('; ');
  }

  const now = new Date().toISOString();
  const existing = vocabState.vocabulary[txtWord];

  vocabState.vocabulary[txtWord] = {
    count: countVal,
    first_seen: existing && existing.first_seen ? existing.first_seen : now,
    last_seen: now,
    pinyin: txtPinyin,
    han_viet: txtHanViet,
    meaning: finalMeaning
  };

  saveDataToLocalStorage();
  closeWordModal();
  renderDirectoryView();
}

function deleteWord(word) {
  if (confirm(`Bạn có chắc chắn muốn xóa từ '${word}' khỏi kho từ vựng?`)) {
    delete vocabState.vocabulary[word];
    saveDataToLocalStorage();
    renderDirectoryView();
  }
}

// --- FLASHCARDS VIEW ---
function initFlashcardView() {
  const keys = Object.keys(vocabState.vocabulary);
  if (keys.length === 0) {
    document.getElementById('tab-flashcards').innerHTML = `
      <div style="text-align: center; padding: 4rem;">Chưa có từ vựng nào để học Flashcards.</div>
    `;
    return;
  }

  vocabState.flashcardList = keys.map(k => ({ word: k, ...vocabState.vocabulary[k] }));
  vocabState.flashcardIndex = 0;
  vocabState.flashcardFlipped = false;

  renderFlashcard();
}

function renderFlashcard() {
  const list = vocabState.flashcardList;
  if (list.length === 0) return;

  const item = list[vocabState.flashcardIndex];
  const card = document.getElementById('flashcardElement');

  if (card) {
    card.classList.toggle('flipped', vocabState.flashcardFlipped);
    
    document.getElementById('flashcardHanzi').innerText = item.word;
    document.getElementById('flashcardPinyin').innerText = item.pinyin || '';
    document.getElementById('flashcardHanViet').innerText = item.han_viet ? `[${item.han_viet}]` : '';
    document.getElementById('flashcardMeaning').innerHTML = formatMeaningText(item.meaning);
    document.getElementById('flashcardProgress').innerText = `${vocabState.flashcardIndex + 1} / ${list.length}`;
  }
}

function toggleFlashcardFlip() {
  vocabState.flashcardFlipped = !vocabState.flashcardFlipped;
  renderFlashcard();
}

function nextFlashcard() {
  vocabState.flashcardFlipped = false;
  vocabState.flashcardIndex = (vocabState.flashcardIndex + 1) % vocabState.flashcardList.length;
  renderFlashcard();
}

function prevFlashcard() {
  vocabState.flashcardFlipped = false;
  vocabState.flashcardIndex = (vocabState.flashcardIndex - 1 + vocabState.flashcardList.length) % vocabState.flashcardList.length;
  renderFlashcard();
}

function shuffleFlashcards() {
  vocabState.flashcardList.sort(() => Math.random() - 0.5);
  vocabState.flashcardIndex = 0;
  vocabState.flashcardFlipped = false;
  renderFlashcard();
}

function speakCurrentFlashcard(e) {
  e.stopPropagation();
  const item = vocabState.flashcardList[vocabState.flashcardIndex];
  if (item) speakWord(item.word);
}

// --- QUIZ VIEW ---
function initQuizView() {
  const keys = Object.keys(vocabState.vocabulary);
  if (keys.length < 4) {
    document.getElementById('tab-quiz').innerHTML = `
      <div style="text-align: center; padding: 4rem; color: var(--text-muted);">
        <h3>Cần ít nhất 4 từ vựng để bắt đầu Trắc nghiệm</h3>
        <p style="margin-top: 0.5rem;">Hãy thêm từ mới hoặc tải từ vựng mẫu vào kho.</p>
      </div>
    `;
    return;
  }

  generateNextQuizQuestion();
}

function generateNextQuizQuestion() {
  const keys = Object.keys(vocabState.vocabulary);
  const targetKey = keys[Math.floor(Math.random() * keys.length)];
  const targetInfo = vocabState.vocabulary[targetKey];

  // Pick 3 wrong options
  const wrongOptions = keys.filter(k => k !== targetKey).sort(() => Math.random() - 0.5).slice(0, 3);
  const allOptions = [targetKey, ...wrongOptions].sort(() => Math.random() - 0.5);

  vocabState.quizCurrentQuestion = {
    targetKey,
    targetInfo,
    allOptions
  };
  vocabState.quizAnswered = false;
  vocabState.selectedAnswer = null;

  renderQuiz();
}

function renderQuiz() {
  const q = vocabState.quizCurrentQuestion;
  if (!q) return;

  document.getElementById('quizWordText').innerText = q.targetKey;
  document.getElementById('quizPinyinText').innerText = q.targetInfo.pinyin || '';
  document.getElementById('quizScoreText').innerText = `Điểm: ${vocabState.quizScore}`;
  document.getElementById('quizStreakText').innerText = `Chuỗi: ${vocabState.quizStreak} 🔥`;

  const container = document.getElementById('quizOptionsContainer');
  container.innerHTML = q.allOptions.map((optKey, idx) => {
    const info = vocabState.vocabulary[optKey];
    let btnClass = 'quiz-option-btn';

    if (vocabState.quizAnswered) {
      if (optKey === q.targetKey) btnClass += ' correct';
      else if (optKey === vocabState.selectedAnswer) btnClass += ' wrong';
    }

    return `
      <button class="${btnClass}" onclick="handleQuizAnswer('${escapeJsStr(optKey)}')">
        <span style="color: var(--accent-primary); font-weight: bold; margin-right: 0.5rem;">${String.fromCharCode(65 + idx)}.</span>
        ${escapeHtml(info.meaning || info.han_viet || optKey)}
      </button>
    `;
  }).join('');
}

function handleQuizAnswer(selectedKey) {
  if (vocabState.quizAnswered) return;

  vocabState.quizAnswered = true;
  vocabState.selectedAnswer = selectedKey;
  vocabState.quizTotal++;

  if (selectedKey === vocabState.quizCurrentQuestion.targetKey) {
    vocabState.quizScore += 10;
    vocabState.quizStreak++;
    speakWord(vocabState.quizCurrentQuestion.targetKey);
  } else {
    vocabState.quizStreak = 0;
  }

  renderQuiz();

  setTimeout(() => {
    generateNextQuizQuestion();
  }, 1600);
}

// --- STATS VIEW ---
function renderStatsView() {
  const keys = Object.keys(vocabState.vocabulary);
  const totalWords = keys.length;
  let totalCount = 0;
  
  keys.forEach(k => {
    totalCount += (vocabState.vocabulary[k].count || 1);
  });

  const avgFreq = totalWords ? (totalCount / totalWords).toFixed(1) : 0;

  document.getElementById('statTotalWords').innerText = totalWords;
  document.getElementById('statTotalCount').innerText = totalCount;
  document.getElementById('statAvgFreq').innerText = avgFreq;

  // Render Top 10 chart
  const top10 = keys.map(k => ({ word: k, count: vocabState.vocabulary[k].count || 1 }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10);

  const chartContainer = document.getElementById('top10Chart');
  const maxCount = top10[0] ? top10[0].count : 1;

  chartContainer.innerHTML = top10.map(item => `
    <div style="margin-bottom: 0.85rem;">
      <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.25rem;">
        <span style="font-weight: 700; font-size: 1.1rem;">${escapeHtml(item.word)}</span>
        <span style="color: var(--accent-primary); font-weight: bold;">${item.count} lần</span>
      </div>
      <div style="background: rgba(255,255,255,0.08); height: 10px; border-radius: 5px; overflow: hidden;">
        <div style="width: ${(item.count / maxCount) * 100}%; background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary)); height: 100%; border-radius: 5px; transition: width 0.5s ease;"></div>
      </div>
    </div>
  `).join('');
}

// --- FILE IMPORT & EXPORT ---
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processJsonFile(file);
}

function processJsonFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      if (parsed && (parsed.vocabulary || parsed.version)) {
        vocabState.vocabulary = parsed.vocabulary || {};
        vocabState.version = parsed.version || 1;
        vocabState.sourceFileName = file.name;
        saveDataToLocalStorage();
        renderApp();
        alert(`Đã tải thành công file '${file.name}' với ${Object.keys(vocabState.vocabulary).length} từ vựng!`);
      } else {
        alert("Cấu trúc file JSON không đúng định dạng từ vựng chuẩn (thiếu thuộc tính 'vocabulary').");
      }
    } catch (err) {
      alert("Lỗi khi đọc file JSON: " + err.message);
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function loadSampleData() {
  if (confirm("Bạn có muốn nạp dữ liệu từ vựng mẫu để dùng thử ứng dụng không?")) {
    vocabState.vocabulary = { ...SAMPLE_VOCABULARY.vocabulary };
    vocabState.sourceFileName = 'Từ vựng Mẫu';
    saveDataToLocalStorage();
    renderApp();
  }
}

function exportJsonFile() {
  const obj = {
    version: vocabState.version,
    vocabulary: vocabState.vocabulary
  };
  const jsonStr = JSON.stringify(obj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = vocabState.sourceFileName.endsWith('.json') ? vocabState.sourceFileName : `${vocabState.sourceFileName}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsvFile() {
  const rows = getFilteredAndSortedRows();
  let csv = '\uFEFFTừ,Pinyin,Hán Việt,Nghĩa,Số lần gặp,Ngày đọc đầu tiên,Lần gặp gần nhất\n';

  rows.forEach(r => {
    csv += `"${r.word}","${r.pinyin}","${r.han_viet}","${r.meaning.replace(/"/g, '""')}","${r.count}","${r.first_seen}","${r.last_seen}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `TuVung_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Utility Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeJsStr(str) {
  if (!str) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}
