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

export function resetState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }

  if (location.hash) {
    history.replaceState(null, '', location.pathname + location.search);
  }

  return defaultState();
}

function defaultState() {
  return {
    importedWins: {},
    manualWins: {},
    manualUnwins: {},
    selectedCharacter: null,
    welcomeDismissed: false,
    filters: {
      distance: ['Sprint', 'Mile', 'Medium', 'Long', 'Varies'],
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

function expandIds(raceId, aliasesById) {
  return aliasesById?.get(raceId) || [raceId];
}

function isGroupWon(imported, manual, unwins, raceId, aliasesById) {
  return expandIds(raceId, aliasesById).some(
    (id) => (imported.has(id) || manual.has(id)) && !unwins.has(id),
  );
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

export function toggleRaceWin(state, charaId, raceId, aliasesById) {
  const cid = String(charaId);
  const ids = expandIds(raceId, aliasesById);
  const imported = new Set(state.importedWins[cid] || []);
  const manual = new Set(state.manualWins[cid] || []);
  const groupWon = isGroupWon(imported, manual, new Set(state.manualUnwins?.[cid] || []), raceId, aliasesById);

  if (groupWon) {
    for (const id of ids) {
      manual.delete(id);
      if (imported.has(id)) {
        if (!state.manualUnwins) state.manualUnwins = {};
        if (!state.manualUnwins[cid]) state.manualUnwins[cid] = [];
        const unwins = new Set(state.manualUnwins[cid]);
        unwins.add(id);
        state.manualUnwins[cid] = [...unwins];
      }
    }
  } else {
    for (const id of ids) {
      manual.add(id);
      if (state.manualUnwins?.[cid]) {
        state.manualUnwins[cid] = state.manualUnwins[cid].filter((uid) => uid !== id);
      }
    }
  }

  state.manualWins[cid] = [...manual];
  return state;
}

export function getEffectiveWins(state, charaId, aliasesById) {
  const cid = String(charaId);
  const imported = new Set(state.importedWins[cid] || []);
  const manual = new Set(state.manualWins[cid] || []);
  const unwins = new Set(state.manualUnwins?.[cid] || []);
  const expanded = new Set();

  for (const id of [...imported, ...manual]) {
    if (unwins.has(id)) continue;
    for (const alias of expandIds(id, aliasesById)) expanded.add(alias);
  }

  return expanded;
}

function isGroupWonInState(state, charaId, group) {
  const cid = String(charaId);
  const imported = new Set(state.importedWins[cid] || []);
  const manual = new Set(state.manualWins[cid] || []);
  const unwins = new Set(state.manualUnwins?.[cid] || []);
  return group.some((id) => (imported.has(id) || manual.has(id)) && !unwins.has(id));
}

export function isTrophyGroupWon(state, charaId, group) {
  return isGroupWonInState(state, charaId, group);
}

export function countWonGroups(state, charaId, groups) {
  return groups.filter((group) => isGroupWonInState(state, charaId, group)).length;
}

export function mergeImportedWins(state, winsByCharacter, aliasesById) {
  const expanded = {};
  for (const [cid, raceIds] of Object.entries(winsByCharacter)) {
    expanded[cid] = [...expandRaceIdsFromArrays(raceIds, aliasesById)];
  }
  state.importedWins = expanded;
  return state;
}

function expandRaceIdsFromArrays(raceIds, aliasesById) {
  const out = new Set();
  for (const id of raceIds) {
    for (const alias of expandIds(id, aliasesById)) out.add(alias);
  }
  return out;
}

export function buildShareUrl() {
  return location.href;
}
