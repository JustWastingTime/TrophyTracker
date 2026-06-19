import { groupRacesByTimeline, distanceLabel, buildRaceAliasIndex } from './calendar.js';
import {
  loadState, saveState, resetState, getEffectiveWins, toggleRaceWin, mergeImportedWins, buildShareUrl,
  countWonGroups, isTrophyGroupWon,
} from './storage.js';
import { parseTrophyData, setsToArrays } from './trophy.js';

let races = [];
let characters = [];
let trophyMap = {};
let state = loadState();
let timeline = [];
let aliasesById = new Map();
let trophyGroups = [];
let raceById = new Map();

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

async function init() {
  const [r, c, t] = await Promise.all([
    fetch('data/races.json').then((r) => r.json()),
    fetch('data/characters.json').then((r) => r.json()),
    fetch('data/trophy-map.json').then((r) => r.json()),
  ]);
  races = r;
  characters = c;
  trophyMap = t;
  timeline = groupRacesByTimeline(races);
  ({ aliasesById, groups: trophyGroups } = buildRaceAliasIndex(races));
  raceById = new Map(races.map((race) => [race.id, race]));

  if (!state.selectedCharacter && characters.length) {
    state.selectedCharacter = characters[0].id;
  }

  bindEvents();
  populateCharacterSelect();
  applyFilterCheckboxes();
  render();
  updateWelcome();
}

function bindEvents() {
  $('#characterSelect').addEventListener('change', (e) => {
    state.selectedCharacter = Number(e.target.value);
    updateCharPortrait();
    saveState(state);
    render();
  });

  const openUpload = () => $('#fileInput').click();
  $('#uploadBtn').addEventListener('click', openUpload);
  $('#welcomeUpload').addEventListener('click', openUpload);
  $('#welcomeSkip').addEventListener('click', dismissWelcome);

  $('#fileInput').addEventListener('change', handleFileUpload);

  $('#shareBtn').addEventListener('click', () => {
    saveState(state);
    navigator.clipboard.writeText(buildShareUrl()).then(() => {
      toast('Link copied! Bookmark it to return later.');
    }).catch(() => {
      toast('Could not copy — copy the URL from your address bar.');
    });
  });

  $('#resetBtn').addEventListener('click', handleReset);

  $$('[data-filter]').forEach((el) => {
    el.addEventListener('change', () => {
      syncFiltersFromUI();
      saveState(state);
      applyFilters();
    });
  });

  $('#showWonOnly').addEventListener('change', () => {
    syncFiltersFromUI();
    saveState(state);
    applyFilters();
  });

  $('#showMissingOnly').addEventListener('change', () => {
    syncFiltersFromUI();
    saveState(state);
    applyFilters();
  });

  $('#resetFilters').addEventListener('click', () => {
    state.filters = {
      distance: ['Sprint', 'Mile', 'Medium', 'Long'],
      terrain: ['Turf', 'Dirt'],
      grade: ['G1', 'G2', 'G3'],
      showWonOnly: false,
      showMissingOnly: false,
    };
    applyFilterCheckboxes();
    saveState(state);
    applyFilters();
  });
}

function populateCharacterSelect() {
  const sel = $('#characterSelect');
  sel.innerHTML = characters.map((c) =>
    `<option value="${c.id}" ${c.id === state.selectedCharacter ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
  ).join('');
  updateCharPortrait();
}

function updateCharPortrait() {
  const char = characters.find((c) => c.id === state.selectedCharacter);
  const img = $('#charPortrait');
  if (!char?.thumb) {
    img.removeAttribute('src');
    img.alt = '';
    return;
  }
  img.src = char.thumb;
  img.alt = char.name;
}

function applyFilterCheckboxes() {
  const f = state.filters;
  $$('[data-filter="distance"]').forEach((el) => { el.checked = f.distance.includes(el.value); });
  $$('[data-filter="terrain"]').forEach((el) => { el.checked = f.terrain.includes(el.value); });
  $$('[data-filter="grade"]').forEach((el) => { el.checked = f.grade.includes(el.value); });
  $('#showWonOnly').checked = f.showWonOnly;
  $('#showMissingOnly').checked = f.showMissingOnly;
}

function syncFiltersFromUI() {
  state.filters.distance = [...$$('[data-filter="distance"]:checked')].map((el) => el.value);
  state.filters.terrain = [...$$('[data-filter="terrain"]:checked')].map((el) => el.value);
  state.filters.grade = [...$$('[data-filter="grade"]:checked')].map((el) => el.value);
  state.filters.showWonOnly = $('#showWonOnly').checked;
  state.filters.showMissingOnly = $('#showMissingOnly').checked;
}

async function handleFileUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = '';

  try {
    const text = await file.text();
    const raw = JSON.parse(text);
    const parsed = parseTrophyData(raw, trophyMap);
    const asArrays = setsToArrays(parsed);
    const totalWins = Object.values(asArrays).reduce((n, arr) => n + arr.length, 0);

    mergeImportedWins(state, asArrays, aliasesById);
    saveState(state);
    dismissWelcome();
    render();

    if (totalWins === 0) {
      toast('File loaded, but no character trophies were found. You can still check races manually.');
    } else {
      toast(`Imported ${totalWins} wins across ${Object.keys(asArrays).length} characters.`);
    }
  } catch (err) {
    toast(`Could not parse file: ${err.message}`);
  }
}

function dismissWelcome() {
  state.welcomeDismissed = true;
  saveState(state);
  updateWelcome();
}

function handleReset() {
  if (!confirm('Reset all uploaded data, checkmarks, and progress? You will return to the welcome screen.')) {
    return;
  }

  state = resetState();
  if (characters.length) state.selectedCharacter = characters[0].id;
  populateCharacterSelect();
  applyFilterCheckboxes();
  render();
  updateWelcome();
  toast('Progress cleared. Upload your trophy data when you are ready.');
}

function updateWelcome() {
  const el = $('#welcomeOverlay');
  if (state.welcomeDismissed) {
    el.classList.add('dismissed');
    document.documentElement.classList.add('welcome-dismissed');
  } else {
    el.classList.remove('dismissed');
    document.documentElement.classList.remove('welcome-dismissed');
  }
}

function render() {
  renderCalendar();
  renderProgress();
  applyFilters();
}

function renderCalendar() {
  const container = $('#calendar');
  const charaId = state.selectedCharacter;
  const wins = getEffectiveWins(state, charaId, aliasesById);

  let html = '<div class="timeline-line" aria-hidden="true"></div>';

  for (const year of timeline) {
    html += `<section class="timeline-year"><h2 class="year-label">${escapeHtml(year.yearShort)} Year</h2>`;

    for (const month of year.months) {
      html += `<div class="timeline-month">`;
      html += `<div class="month-marker"><span class="month-num">${month.monthNum}</span></div>`;

      for (const day of month.days) {
        html += `<div class="day-row" data-date="${escapeHtml(day.half)} ${escapeHtml(month.month)}">`;
        html += `<div class="day-label">${day.half} · ${month.month.slice(0, 3)}</div>`;
        html += `<div class="race-grid">`;

        for (const race of day.races) {
          const won = wins.has(race.id);
          html += raceCardHtml(race, won);
        }

        html += `</div></div>`;
      }

      html += `</div>`;
    }

    html += `</section>`;
  }

  container.innerHTML = html;

  container.querySelectorAll('.race-card').forEach((card) => {
    card.addEventListener('click', () => {
      const raceId = card.dataset.raceId;
      toggleRaceWin(state, charaId, raceId, aliasesById);
      saveState(state);
      const linkedIds = aliasesById.get(raceId) || [raceId];

      for (const id of linkedIds) {
        const linkedCard = container.querySelector(`[data-race-id="${CSS.escape(id)}"]`);
        if (!linkedCard) continue;
        const linkedWon = getEffectiveWins(state, charaId, aliasesById).has(id);
        linkedCard.classList.toggle('won', linkedWon);
        linkedCard.dataset.won = String(linkedWon);
        linkedCard.setAttribute('aria-pressed', linkedWon);
      }

      renderProgress();
      applyFilters();
    });
  });
}

function raceCardHtml(race, won) {
  const terrainClass = race.terrain === 'Dirt' ? 'dirt' : 'turf';
  const thumbStyle = race.thumb ? `style="background-image:url('${race.thumb}')"` : '';

  return `<article class="race-card${won ? ' won' : ''}"
    data-race-id="${escapeHtml(race.id)}"
    data-grade="${race.grade}"
    data-distance="${race.distance}"
    data-terrain="${race.terrain}"
    data-won="${won}"
    aria-pressed="${won}"
    title="${escapeHtml(race.name)} — click to toggle">
    <div class="race-thumb" ${thumbStyle}></div>
    <div class="race-body">
      <p class="race-name">${escapeHtml(race.name)}</p>
      <div class="race-meta">
        <span class="meta-tag ${race.grade.toLowerCase()}">${race.grade}</span>
        <span class="meta-dist">${distanceLabel(race.distance)}</span>
        <span class="meta-terrain"><span class="terrain-icon ${terrainClass}"></span></span>
      </div>
    </div>
  </article>`;
}

function renderProgress() {
  const charaId = state.selectedCharacter;
  const total = trophyGroups.length;
  const wonCount = countWonGroups(state, charaId, trophyGroups);
  const pct = total ? Math.round((wonCount / total) * 100) : 0;

  $('#overallFill').style.width = `${pct}%`;
  $('#overallFraction').textContent = `${wonCount} / ${total}`;
  $('#overallPct').textContent = `${pct}%`;

  for (const grade of ['G1', 'G2', 'G3']) {
    const gradeGroups = trophyGroups.filter((group) => raceById.get(group[0])?.grade === grade);
    const gradeWon = gradeGroups.filter((group) => isTrophyGroupWon(state, charaId, group)).length;
    const gradeTotal = gradeGroups.length;
    const gradePct = gradeTotal ? (gradeWon / gradeTotal) * 100 : 0;
    $(`#${grade.toLowerCase()}Fill`).style.width = `${gradePct}%`;
    $(`#${grade.toLowerCase()}Fraction`).textContent = `${gradeWon}/${gradeTotal}`;
  }
}

function getFilteredRaces(charaId, applyVisibilityOnly = true) {
  const f = state.filters;
  const wins = getEffectiveWins(state, charaId, aliasesById);

  return races.filter((race) => {
    if (!f.distance.includes(race.distance)) return false;
    if (!f.terrain.includes(race.terrain)) return false;
    if (!f.grade.includes(race.grade)) return false;
    if (applyVisibilityOnly) {
      const won = wins.has(race.id);
      if (f.showWonOnly && !won) return false;
      if (f.showMissingOnly && won) return false;
    }
    return true;
  });
}

function applyFilters() {
  const f = state.filters;
  const wins = getEffectiveWins(state, state.selectedCharacter, aliasesById);

  $$('.race-card').forEach((card) => {
    const grade = card.dataset.grade;
    const distance = card.dataset.distance;
    const terrain = card.dataset.terrain;
    const won = card.dataset.won === 'true';

    let show = f.grade.includes(grade)
      && f.distance.includes(distance)
      && f.terrain.includes(terrain);

    if (f.showWonOnly && !wins.has(card.dataset.raceId)) show = false;
    if (f.showMissingOnly && wins.has(card.dataset.raceId)) show = false;

    card.classList.toggle('hidden', !show);
  });

  renderProgress();
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 3500);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

init();
