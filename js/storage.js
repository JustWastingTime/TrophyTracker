const STORAGE_KEY = 'trophy-tracker-state';

export function loadState() {
  const fromHash = loadFromHash();
  if (fromHash) return fromHash;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }

  return defaultState();
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize(state)));
  } catch { /* quota */ }
  updateHash(state);
}

function defaultState() {
  return {
    importedWins: {},
    manualWins: {},
    manualUnwins: {},
    selectedCharacter: null,
    welcomeDismissed: false,
    filters: {
      distance: ['Sprint', 'Mile', 'Medium', 'Long'],
      terrain: ['Turf', 'Dirt'],
      grade: ['G1', 'G2', 'G3'],
      showWonOnly: false,
      showMissingOnly: false,
    },
  };
}

function serialize(state) {
  return {
    importedWins: state.importedWins,
    manualWins: state.manualWins,
    manualUnwins: state.manualUnwins || {},
    selectedCharacter: state.selectedCharacter,
    welcomeDismissed: state.welcomeDismissed,
    filters: state.filters,
  };
}

function loadFromHash() {
  const hash = location.hash.slice(1);
  if (!hash.startsWith('s=')) return null;

  try {
    const json = LZString.decompressFromEncodedURIComponent(hash.slice(2));
    if (!json) return null;
    const parsed = JSON.parse(json);
    return { ...defaultState(), ...parsed };
  } catch {
    return null;
  }
}

function updateHash(state) {
  const payload = serialize(state);
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
  const next = `#s=${compressed}`;
  if (location.hash !== next) {
    history.replaceState(null, '', next);
  }
}

export function getWinsForCharacter(state, charaId) {
  const cid = String(charaId);
  const imported = new Set(state.importedWins[cid] || []);
  const manual = new Set(state.manualWins[cid] || []);
  return new Set([...imported, ...manual]);
}

export function isRaceWon(state, charaId, raceId) {
  return getWinsForCharacter(state, charaId).has(raceId);
}

export function toggleRaceWin(state, charaId, raceId) {
  const cid = String(charaId);
  const imported = new Set(state.importedWins[cid] || []);
  const manual = new Set(state.manualWins[cid] || []);
  const currentlyWon = imported.has(raceId) || manual.has(raceId);

  if (currentlyWon) {
    if (manual.has(raceId)) {
      manual.delete(raceId);
    } else if (imported.has(raceId)) {
      // Can't un-import; add to a "hidden" list — use manual as override
      // Store un-won overrides separately
      if (!state.manualUnwins) state.manualUnwins = {};
      if (!state.manualUnwins[cid]) state.manualUnwins[cid] = [];
      const unwins = new Set(state.manualUnwins[cid]);
      unwins.add(raceId);
      state.manualUnwins[cid] = [...unwins];
    }
  } else {
    manual.add(raceId);
    if (state.manualUnwins?.[cid]) {
      state.manualUnwins[cid] = state.manualUnwins[cid].filter((id) => id !== raceId);
    }
  }

  state.manualWins[cid] = [...manual];
  return state;
}

export function getEffectiveWins(state, charaId) {
  const cid = String(charaId);
  const wins = getWinsForCharacter(state, charaId);
  const unwins = new Set(state.manualUnwins?.[cid] || []);
  for (const id of unwins) wins.delete(id);
  return wins;
}

export function mergeImportedWins(state, winsByCharacter) {
  state.importedWins = winsByCharacter;
  return state;
}

export function buildShareUrl() {
  return location.href;
}
