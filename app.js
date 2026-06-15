const STORAGE_RULES_KEY = 'koikoiRules';
const STORAGE_STATE_KEY = 'koikoiGameState';

const defaultRules = {
  totalRounds: 12,
  doubleOverScore: { enabled: true, threshold: 7 },
  koikoiGaeshi: { enabled: true, multiplier: 2 },
  yakuSettings: {
    gokou: { label: '五光', enabled: true, point: 10, description: '五枚の光札を揃える役' },
    shikou: { label: '四光', enabled: true, point: 8, description: '四枚の光札を揃える役' },
    sankou: { label: '三光', enabled: true, point: 5, description: '三枚の光札を揃える役' },
    ameShikou: { label: '雨四光', enabled: true, point: 7, description: '雨の光を含む四光の変種' },
    tsukimiDeIppai: { label: '月見で一杯', enabled: true, point: 5, description: '月見の札と杯の札を揃える役' },
    hanamiDeIppai: { label: '花見で一杯', enabled: true, point: 5, description: '花見の札と杯の札を揃える役' },
    inozhikaCho: { label: '猪鹿蝶', enabled: true, point: 5, description: '猪・鹿・蝶の種札を揃える役' },
    akatan: { label: '赤短', enabled: true, point: 5, description: '赤短の札を揃える役' },
    aotan: { label: '青短', enabled: true, point: 5, description: '青短の札を揃える役' },
    tane: { label: 'タネ', enabled: true, point: 1, countable: true, baseCount: 5, description: 'タネ札は5枚以上で1点から増えていく' },
    tan: { label: 'タン', enabled: true, point: 1, countable: true, baseCount: 5, description: '短（タン）は5枚以上で1点から増えていく' },
    kasu: { label: 'カス', enabled: true, point: 1, countable: true, baseCount: 10, description: 'カス札は基準枚数以上で1枚ごとに点が増える（例:12枚で3点）' }
  }
};

const defaultState = {
  currentDealer: 0,
  players: [
    { name: 'プレイヤー1', totalScore: 0 },
    { name: 'プレイヤー2', totalScore: 0 }
  ],
  history: [],
  activeKoikoiPlayer: null,
  editingEntryId: null
};

let rules = loadRules();
let state = loadState();
let roundForm = createEmptyRoundForm();

const elements = {
  roundLabel: document.getElementById('roundLabel'),
  resetButton: document.getElementById('resetButton'),
  settingsButton: document.getElementById('settingsButton'),
  enterRoundButton: document.getElementById('enterRoundButton'),
  viewHistoryButton: document.getElementById('viewHistoryButton'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  roundModal: document.getElementById('roundModal'),
  closeRoundModal: document.getElementById('closeRoundModal'),
  yakuList: document.getElementById('yakuList'),
  koikoiCheckbox: document.getElementById('koikoiCheckbox'),
  rawScorePreview: document.getElementById('rawScorePreview'),
  finalScorePreview: document.getElementById('finalScorePreview'),
  koikoiGaeshiPreview: document.getElementById('koikoiGaeshiPreview'),
  saveRoundButton: document.getElementById('saveRoundButton'),
  settingsPanel: document.getElementById('settingsPanel'),
  closeSettings: document.getElementById('closeSettings'),
  closeSettingsButton: document.getElementById('closeSettingsButton'),
  totalRoundsInput: document.getElementById('totalRoundsInput'),
  totalRoundsDisplay: document.getElementById('totalRoundsDisplay'),
  doubleOverToggle: document.getElementById('doubleOverToggle'),
  doubleThresholdInput: document.getElementById('doubleThresholdInput'),
  koikoiGaeshiToggle: document.getElementById('koikoiGaeshiToggle'),
  koikoiMultiplierInput: document.getElementById('koikoiMultiplierInput'),
  yakuSettingsList: document.getElementById('yakuSettingsList'),
  historyPanel: document.getElementById('historyPanel'),
  closeHistory: document.getElementById('closeHistory'),
  closeHistoryButton: document.getElementById('closeHistoryButton'),
  historyList: document.getElementById('historyList'),
  enterRoundButton: document.getElementById('enterRoundButton'),
  playerName0: document.getElementById('playerName0'),
  playerName1: document.getElementById('playerName1'),
  playerScore0: document.getElementById('playerScore0'),
  playerScore1: document.getElementById('playerScore1'),
  playerCard0: document.getElementById('playerCard0'),
  playerCard1: document.getElementById('playerCard1'),
  currentDealerLabel: document.getElementById('currentDealerLabel'),
  winner0: document.getElementById('winner0'),
  winner1: document.getElementById('winner1'),
  winnerDraw: document.getElementById('winnerDraw')
};

// Ensure modal panels are hidden on load (defensive guard against unexpected visible state)
function moveFocusToPrimaryControl() {
  const fallback = elements.enterRoundButton || elements.viewHistoryButton || document.body;
  if (document.activeElement && document.activeElement !== fallback) {
    document.activeElement.blur?.();
    if (fallback && typeof fallback.focus === 'function') {
      fallback.focus();
    }
  }
}

function clearHiddenPanelFocus(panel) {
  if (!panel) return;
  if (panel.contains(document.activeElement)) {
    moveFocusToPrimaryControl();
  }
}

function hidePanel(panel) {
  if (!panel) return;
  clearHiddenPanelFocus(panel);
  panel.classList.add('hidden');
  panel.style.display = 'none';
  panel.setAttribute('aria-hidden', 'true');
}

function showPanel(panel) {
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.style.display = '';
  panel.setAttribute('aria-hidden', 'false');
}

function ensureModalsHidden() {
  try {
    elements.modalBackdrop?.classList.add('hidden');
    elements.modalBackdrop?.style.setProperty('display', 'none', 'important');
    [elements.roundModal, elements.settingsPanel, elements.historyPanel].forEach(panel => {
      hidePanel(panel);
    });
  } catch (e) {
    // ignore
  }
}

function initApplication() {
  ensureModalsHidden();
  bindEventListeners();
  renderAll();
}

function createEmptyRoundForm() {
  return {
    winner: null,
    yakuKeys: [],
    yakuCounts: {},
    koikoiDeclared: false
  };
}

function loadRules() {
  try {
    const saved = localStorage.getItem(STORAGE_RULES_KEY);
    return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(defaultRules));
  } catch (error) {
    return JSON.parse(JSON.stringify(defaultRules));
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.players || !parsed.history) return JSON.parse(JSON.stringify(defaultState));
      return { ...JSON.parse(JSON.stringify(defaultState)), ...parsed };
    }
    return JSON.parse(JSON.stringify(defaultState));
  } catch (error) {
    return JSON.parse(JSON.stringify(defaultState));
  }
}

function saveAll() {
  localStorage.setItem(STORAGE_RULES_KEY, JSON.stringify(rules));
  localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(state));
}

function resetGame() {
  const confirmed = window.confirm('ゲームをリセットして進行状況を消去しますか？');
  if (!confirmed) return;
  rules = JSON.parse(JSON.stringify(defaultRules));
  state = JSON.parse(JSON.stringify(defaultState));
  roundForm = createEmptyRoundForm();
  saveAll();
  renderAll();
}

function renderAll() {
  renderScoreboard();
  renderYakuList();
  renderSettings();
  renderHistory();
  updateScorePreview();
}

function renderScoreboard() {
  elements.playerName0.value = state.players[0].name;
  elements.playerName1.value = state.players[1].name;
  elements.playerScore0.textContent = state.players[0].totalScore;
  elements.playerScore1.textContent = state.players[1].totalScore;
  elements.currentDealerLabel.textContent = state.players[state.currentDealer].name;
  elements.totalRoundsDisplay.textContent = rules.totalRounds;
  elements.totalRoundsInput.value = rules.totalRounds;
  elements.doubleOverToggle.checked = rules.doubleOverScore.enabled;
  elements.doubleThresholdInput.value = rules.doubleOverScore.threshold;
  elements.koikoiGaeshiToggle.checked = rules.koikoiGaeshi.enabled;
  elements.koikoiMultiplierInput.value = rules.koikoiGaeshi.multiplier;

  document.getElementById('dealerBadge0').style.visibility = state.currentDealer === 0 ? 'visible' : 'hidden';
  document.getElementById('dealerBadge1').style.visibility = state.currentDealer === 1 ? 'visible' : 'hidden';

  const currentRound = Math.min(state.history.length + 1, rules.totalRounds);
  elements.roundLabel.textContent = `Round ${currentRound} / ${rules.totalRounds}`;
}

function renderYakuList() {
  elements.yakuList.innerHTML = '';
  Object.entries(rules.yakuSettings).forEach(([key, config]) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'yaku-card';
    const selected = roundForm.yakuKeys.includes(key);
    if (selected) wrapper.classList.add('selected');
    // Render each yaku as a selectable chip. For countable yaku, select the chip directly and show counts on selection.
    if (config.countable) {
      const enabled = selected;
      const count = roundForm.yakuCounts[key] || 0;
      wrapper.innerHTML = `
        <div class="yaku-detail">
          <span class="yaku-title">${config.label}</span>
          <button type="button" class="info-btn" data-yaku-key="${key}">?</button>
          <span class="small-text">${config.enabled ? '有効' : '無効'}</span>
        </div>
        <div class="yaku-controls">
          <div class="count-controls" style="display:${enabled ? 'flex' : 'none'}; gap:0.5rem; align-items:center;">
            <button type="button" data-action="dec" data-yaku-key="${key}">-</button>
            <input type="number" min="0" value="${count}" data-yaku-key="${key}" class="yaku-count-input" />
            <button type="button" data-action="inc" data-yaku-key="${key}">+</button>
          </div>
        </div>
      `;
      wrapper.querySelector('[data-action="dec"]').addEventListener('click', e => {
        e.stopPropagation();
        const keyName = key;
        roundForm.yakuCounts[keyName] = Math.max(0, (roundForm.yakuCounts[keyName] || 0) - 1);
        renderYakuList();
        updateScorePreview();
      });
      wrapper.querySelector('[data-action="inc"]').addEventListener('click', e => {
        e.stopPropagation();
        const keyName = key;
        roundForm.yakuCounts[keyName] = (roundForm.yakuCounts[keyName] || 0) + 1;
        renderYakuList();
        updateScorePreview();
      });
      wrapper.querySelector('.yaku-count-input').addEventListener('change', event => {
        event.stopPropagation();
        const v = Number(event.target.value) || 0;
        roundForm.yakuCounts[key] = Math.max(0, v);
        updateScorePreview();
      });
      wrapper.querySelector('.info-btn').addEventListener('click', e => { e.stopPropagation(); window.alert(config.description || config.label); });
      wrapper.addEventListener('click', e => {
        if (e.target.closest('.info-btn') || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
        if (!config.enabled) return;
        if (roundForm.yakuKeys.includes(key)) {
          roundForm.yakuKeys = roundForm.yakuKeys.filter(k => k !== key);
        } else {
          if (config.countable && !roundForm.yakuCounts[key]) {
            roundForm.yakuCounts[key] = config.baseCount || 0;
          }
          roundForm.yakuKeys = Array.from(new Set([...roundForm.yakuKeys, key]));
        }
        renderYakuList();
        updateScorePreview();
      });
    } else {
      const checked = selected;
      wrapper.innerHTML = `
        <div class="yaku-detail">
          <span class="yaku-title">${config.label}</span>
          <button type="button" class="info-btn" data-yaku-key="${key}">?</button>
          <span class="small-text">${config.enabled ? '有効' : '無効'}</span>
        </div>
        <input type="checkbox" data-yaku-key="${key}" ${checked ? 'checked' : ''} ${!config.enabled ? 'disabled' : ''} style="display:none;" />
      `;
      const checkbox = wrapper.querySelector('input[type="checkbox"]');
      // Clicking the chip toggles selection
      wrapper.addEventListener('click', e => {
        if (e.target.closest('.info-btn')) return;
        if (!config.enabled) return;
        if (roundForm.yakuKeys.includes(key)) {
          roundForm.yakuKeys = roundForm.yakuKeys.filter(k => k !== key);
        } else {
          roundForm.yakuKeys = Array.from(new Set([...roundForm.yakuKeys, key]));
        }
        renderYakuList();
        updateScorePreview();
      });
      wrapper.querySelector('.info-btn').addEventListener('click', e => { e.stopPropagation(); window.alert(config.description || config.label); });
    }
    elements.yakuList.appendChild(wrapper);
  });
}

function renderYakuSettings() {
  elements.yakuSettingsList.innerHTML = '';
  Object.entries(rules.yakuSettings).forEach(([key, config]) => {
    const row = document.createElement('div');
    row.className = 'yaku-card';
    row.innerHTML = `
      <div class="yaku-detail">
        <span class="yaku-title">${config.label}</span>
        <label class="setting-row"><span>Enable</span><input type="checkbox" data-yaku-key="${key}" ${config.enabled ? 'checked' : ''} /></label>
      </div>
      <div class="yaku-controls">
        <button type="button" data-action="decrement" data-yaku-key="${key}">-</button>
        <input type="number" min="0" value="${config.point}" data-yaku-key="${key}" class="yaku-point-input" />
        <button type="button" data-action="increment" data-yaku-key="${key}">+</button>
      </div>
    `;
    row.querySelector('[data-action="decrement"]').addEventListener('click', () => changeYakuPoint(key, -1));
    row.querySelector('[data-action="increment"]').addEventListener('click', () => changeYakuPoint(key, 1));
    row.querySelector('input[type="checkbox"]').addEventListener('change', event => {
      rules.yakuSettings[key].enabled = event.target.checked;
      saveAll();
      renderYakuList();
    });
    row.querySelector('.yaku-point-input').addEventListener('change', event => {
      const value = Number(event.target.value);
      if (!Number.isNaN(value) && value >= 0) {
        rules.yakuSettings[key].point = value;
        saveAll();
        renderYakuList();
        updateScorePreview();
      }
    });
    elements.yakuSettingsList.appendChild(row);
  });
}

function changeYakuPoint(key, delta) {
  const setting = rules.yakuSettings[key];
  setting.point = Math.max(0, setting.point + delta);
  saveAll();
  renderYakuSettings();
  updateScorePreview();
}

function updateScorePreview() {
  const rawScore = calculateRawScore(roundForm.yakuKeys);
  let finalScore = rawScore;
  const thresholdApplied = rules.doubleOverScore.enabled && rawScore >= rules.doubleOverScore.threshold;
  let previewLines = [];

  if (thresholdApplied) {
    finalScore = rawScore * 2;
    previewLines.push(`Double applied ×2 (≥ ${rules.doubleOverScore.threshold})`);
  }

  let gaeshiText = 'Koikoi Gaeshi not applied';
  if (roundForm.winner !== null && roundForm.winner !== 'draw') {
    const gaeshiApplied = isKoikoiGaeshiApplied(roundForm.winner, roundForm.koikoiDeclared);
    if (gaeshiApplied) {
      finalScore *= rules.koikoiGaeshi.multiplier;
      gaeshiText = `Koikoi Gaeshi applied ×${rules.koikoiGaeshi.multiplier}`;
      previewLines.push(gaeshiText);
    }
  }

  elements.rawScorePreview.textContent = rawScore;
  elements.finalScorePreview.textContent = finalScore;
  elements.koikoiGaeshiPreview.textContent = previewLines.length ? previewLines.join(' · ') : gaeshiText;
}

function calculateRawScore(selectedKeys, counts = roundForm.yakuCounts) {
  let sum = 0;
  // Sum non-countable selected keys
  selectedKeys.forEach(key => {
    const config = rules.yakuSettings[key];
    if (!config) return;
    if (config.countable) return; // countables handled below
    if (config.enabled) sum += config.point;
  });
  // Handle countable yaku (counts provided by counts object)
  Object.entries(rules.yakuSettings).forEach(([key, config]) => {
    if (!config.countable) return;
    if (!config.enabled) return;
    if (!selectedKeys.includes(key)) return; // only if enabled by checkbox
    const count = counts?.[key] || 0;
    if (count >= (config.baseCount || 0)) {
      // Points = (count - baseCount + 1) * point-per-unit
      const pts = (count - (config.baseCount || 0) + 1) * (config.point || 1);
      sum += pts;
    }
  });
  return sum;
}

function isKoikoiGaeshiApplied(winner, currentKoikoiDeclared) {
  if (!rules.koikoiGaeshi.enabled) return false;
  if (winner === 'draw' || winner === null) return false;
  if (state.activeKoikoiPlayer === null && !currentKoikoiDeclared) return false;
  const loser = winner === 0 ? 1 : 0;
  return state.activeKoikoiPlayer === loser;
}

function openModal(panel) {
  if (!panel) return;
  elements.modalBackdrop.classList.remove('hidden');
  elements.modalBackdrop.style.removeProperty('display');
  showPanel(panel);
}

function closeModal(panel) {
  if (!panel) return;
  hidePanel(panel);
  const anyOpen = [elements.roundModal, elements.settingsPanel, elements.historyPanel].some(p => p && !p.classList.contains('hidden'));
  if (!anyOpen) {
    elements.modalBackdrop.classList.add('hidden');
    elements.modalBackdrop.style.setProperty('display', 'none', 'important');
  }
}

function openRoundModal(editEntry = null) {
  roundForm = createEmptyRoundForm();
  if (editEntry) {
    roundForm.winner = editEntry.winner;
    roundForm.yakuKeys = [...editEntry.yakuKeys];
    roundForm.koikoiDeclared = editEntry.koikoiDeclared;
    state.editingEntryId = editEntry.id;
  } else {
    state.editingEntryId = null;
  }
  updateRoundFormUI();
  openModal(elements.roundModal);
}

function openRoundModalWithWinner(winner) {
  openRoundModal();
  roundForm.winner = winner;
  updateRoundFormUI();
}

function updateRoundFormUI() {
  [elements.winner0, elements.winner1, elements.winnerDraw].forEach(button => button.classList.remove('active'));
  if (roundForm.winner === 0) elements.winner0.classList.add('active');
  if (roundForm.winner === 1) elements.winner1.classList.add('active');
  if (roundForm.winner === 'draw') elements.winnerDraw.classList.add('active');
  elements.koikoiCheckbox.checked = roundForm.koikoiDeclared;
  renderYakuList();
  updateScorePreview();
}

function closeRoundModalHandler() {
  state.editingEntryId = null;
  closeModal(elements.roundModal);
}

function renderSettings() {
  renderYakuSettings();
}

function renderHistory() {
  elements.historyList.innerHTML = '';
  if (state.history.length === 0) {
    elements.historyList.innerHTML = '<p class="small-text">まだラウンドが記録されていません。</p>';
    return;
  }
  state.history.slice().reverse().forEach(entry => {
    const entryNode = document.createElement('div');
    entryNode.className = 'history-entry';
    const winnerText = entry.winner === 'draw' ? '引き分け' : state.players[entry.winner]?.name || 'プレイヤー';
    const yakuLabels = entry.yakuKeys.map(key => rules.yakuSettings[key]?.label || key).join('、') || 'なし';
    entryNode.innerHTML = `
      <div class="history-row">
        <div>
          <strong>ラウンド ${entry.round}</strong>
          <p class="small-text">勝者: ${winnerText}</p>
        </div>
        <div>
          <strong>${entry.finalScore}</strong>
        </div>
      </div>
      <div class="history-row">
        <span>役: ${yakuLabels}</span>
        <span>${entry.koikoiDeclared ? 'こいこい宣言あり' : '宣言なし'}</span>
      </div>
      <div class="history-row history-actions">
        <button data-action="edit" data-entry-id="${entry.id}">編集</button>
        <button data-action="delete" data-entry-id="${entry.id}">削除</button>
      </div>
    `;
    entryNode.querySelector('[data-action="edit"]').addEventListener('click', () => editHistoryEntry(entry.id));
    entryNode.querySelector('[data-action="delete"]').addEventListener('click', () => deleteHistoryEntry(entry.id));
    elements.historyList.appendChild(entryNode);
  });
}

function addHistoryEntry(entry) {
  state.history.push(entry);
  rebuildTotals();
}

function rebuildTotals() {
  state.players[0].totalScore = 0;
  state.players[1].totalScore = 0;
  let activeKoikoi = null;
  let lastWinner = state.currentDealer;
  state.history.sort((a, b) => a.round - b.round);
  state.history = state.history.map(entry => {
    let rawScore = calculateRawScore(entry.yakuKeys, entry.yakuCounts);
    let finalScore = rawScore;
    const thresholdApplied = rules.doubleOverScore.enabled && rawScore >= rules.doubleOverScore.threshold;
    if (thresholdApplied) {
      finalScore = rawScore * 2;
    }
    const loser = entry.winner === 0 ? 1 : 0;
    const koikoiApplied = rules.koikoiGaeshi.enabled && entry.winner !== 'draw' && entry.winner !== null && activeKoikoi === loser;
    if (koikoiApplied) {
      finalScore *= rules.koikoiGaeshi.multiplier;
    }
    if (entry.winner !== 'draw' && entry.winner !== null) {
      if (entry.koikoiDeclared) {
        activeKoikoi = entry.winner;
      } else {
        activeKoikoi = null;
      }
      lastWinner = entry.winner;
      state.players[entry.winner].totalScore += finalScore;
    }
    return { ...entry, rawScore, finalScore, koikoiApplied, thresholdApplied };
  });
  state.activeKoikoiPlayer = activeKoikoi;
  if (lastWinner !== null && lastWinner !== undefined) {
    state.currentDealer = lastWinner;
  }
  saveAll();
  renderScoreboard();
  renderHistory();
}

function getNextRoundNumber() {
  return state.history.length + 1;
}

function buildRoundEntry() {
  const rawScore = calculateRawScore(roundForm.yakuKeys);
  let finalScore = rawScore;
  let thresholdApplied = false;
  let koikoiApplied = false;

  if (rules.doubleOverScore.enabled && rawScore >= rules.doubleOverScore.threshold) {
    finalScore *= 2;
    thresholdApplied = true;
  }

  if (roundForm.winner !== null && roundForm.winner !== 'draw') {
    const loser = roundForm.winner === 0 ? 1 : 0;
    if (rules.koikoiGaeshi.enabled && state.activeKoikoiPlayer === loser) {
      finalScore *= rules.koikoiGaeshi.multiplier;
      koikoiApplied = true;
    }
  }

  return {
    id: state.editingEntryId ?? crypto.randomUUID(),
    round: getNextRoundNumber(),
    winner: roundForm.winner,
    yakuKeys: [...roundForm.yakuKeys],
    yakuCounts: { ...roundForm.yakuCounts },
    koikoiDeclared: roundForm.koikoiDeclared,
    rawScore,
    finalScore,
    koikoiApplied,
    thresholdApplied
  };
}

function saveRound() {
  if (roundForm.winner === null) {
    window.alert('勝者または引き分けを選択してください。');
    return;
  }

  if (state.editingEntryId) {
    const index = state.history.findIndex(entry => entry.id === state.editingEntryId);
    if (index !== -1) {
      state.history[index] = {
        ...state.history[index],
        winner: roundForm.winner,
        yakuKeys: [...roundForm.yakuKeys],
        yakuCounts: { ...roundForm.yakuCounts },
        koikoiDeclared: roundForm.koikoiDeclared
      };
      state.editingEntryId = null;
      rebuildTotals();
      closeRoundModalHandler();
      return;
    }
  }

  const entry = buildRoundEntry();
  state.history.push(entry);
  if (entry.winner !== 'draw' && entry.winner !== null) {
    if (entry.koikoiDeclared) {
      state.activeKoikoiPlayer = entry.winner;
    } else {
      state.activeKoikoiPlayer = null;
    }
    state.players[entry.winner].totalScore += entry.finalScore;
    if (state.currentDealer !== entry.winner) {
      state.currentDealer = entry.winner;
    }
  }
  saveAll();
  renderAll();
  closeRoundModalHandler();
}

function editHistoryEntry(entryId) {
  const entry = state.history.find(item => item.id === entryId);
  if (!entry) return;
  roundForm.winner = entry.winner;
  roundForm.yakuKeys = [...entry.yakuKeys];
  roundForm.yakuCounts = { ...(entry.yakuCounts || {}) };
  roundForm.koikoiDeclared = entry.koikoiDeclared;
  state.editingEntryId = entry.id;
  openModal(elements.roundModal);
  updateRoundFormUI();
}

function deleteHistoryEntry(entryId) {
  const confirmed = window.confirm('この履歴を削除しますか？');
  if (!confirmed) return;
  state.history = state.history.filter(entry => entry.id !== entryId);
  rebuildTotals();
}

function toggleWinner(value) {
  if (roundForm.winner === value) {
    roundForm.winner = null;
  } else {
    roundForm.winner = value;
  }
  updateRoundFormUI();
}

function bindEventListeners() {
  elements.resetButton.addEventListener('click', resetGame);
  elements.settingsButton.addEventListener('click', () => {
    rules = loadRules();
    renderSettings();
    openModal(elements.settingsPanel);
  });
  elements.closeSettings.addEventListener('click', () => closeModal(elements.settingsPanel));
  elements.closeSettingsButton.addEventListener('click', () => closeModal(elements.settingsPanel));
  elements.enterRoundButton.addEventListener('click', () => openRoundModal());
  elements.viewHistoryButton.addEventListener('click', () => openModal(elements.historyPanel));
  elements.closeHistory.addEventListener('click', () => closeModal(elements.historyPanel));
  elements.closeHistoryButton.addEventListener('click', () => closeModal(elements.historyPanel));
  elements.playerCard0.addEventListener('click', () => {
    rules = loadRules();
    openRoundModalWithWinner(0);
  });
  elements.playerCard1.addEventListener('click', () => {
    rules = loadRules();
    openRoundModalWithWinner(1);
  });
  elements.closeRoundModal.addEventListener('click', closeRoundModalHandler);
  elements.winner0.addEventListener('click', () => toggleWinner(0));
  elements.winner1.addEventListener('click', () => toggleWinner(1));
  elements.winnerDraw.addEventListener('click', () => toggleWinner('draw'));
  elements.koikoiCheckbox.addEventListener('change', event => {
    roundForm.koikoiDeclared = event.target.checked;
    updateScorePreview();
  });
  elements.saveRoundButton.addEventListener('click', saveRound);

  elements.totalRoundsInput.addEventListener('change', event => {
    const value = Number(event.target.value);
    if (!Number.isNaN(value) && value >= 4) {
      rules.totalRounds = value;
      saveAll();
      renderScoreboard();
    }
  });
  elements.doubleOverToggle.addEventListener('change', event => {
    rules.doubleOverScore.enabled = event.target.checked;
    saveAll();
    updateScorePreview();
  });
  elements.doubleThresholdInput.addEventListener('change', event => {
    const value = Number(event.target.value);
    if (!Number.isNaN(value) && value >= 1) {
      rules.doubleOverScore.threshold = value;
      saveAll();
      updateScorePreview();
    }
  });
  elements.koikoiGaeshiToggle.addEventListener('change', event => {
    rules.koikoiGaeshi.enabled = event.target.checked;
    saveAll();
    updateScorePreview();
  });
  elements.koikoiMultiplierInput.addEventListener('change', event => {
    const value = Number(event.target.value);
    if (!Number.isNaN(value) && value >= 1) {
      rules.koikoiGaeshi.multiplier = value;
      saveAll();
      updateScorePreview();
    }
  });

  elements.playerName0.addEventListener('change', event => {
    state.players[0].name = event.target.value || 'プレイヤー1';
    saveAll();
    renderAll();
  });
  elements.playerName1.addEventListener('change', event => {
    state.players[1].name = event.target.value || 'プレイヤー2';
    saveAll();
    renderAll();
  });

  elements.modalBackdrop.addEventListener('click', () => {
    closeModal(elements.roundModal);
    closeModal(elements.settingsPanel);
    closeModal(elements.historyPanel);
    state.editingEntryId = null;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApplication);
} else {
  initApplication();
}
