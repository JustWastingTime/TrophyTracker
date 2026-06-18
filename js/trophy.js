/**
 * Parse trophy_data.json into wins per character.
 * trophy_id maps to race id via trophyMap.
 *
 * A chara_id entry means the trophy was won — win_count is often 0 when
 * that field failed to load from the game export.
 */
export function parseTrophyData(raw, trophyMap) {
  const winsByCharacter = {};

  if (!Array.isArray(raw)) {
    throw new Error('Expected an array at the root of trophy_data.json');
  }

  for (const trophy of raw) {
    const raceId = trophyMap[String(trophy.trophy_id)];
    if (!raceId) continue;

    for (const instance of trophy.race_instance_info_array || []) {
      for (const chara of instance.trophy_chara_info_array || []) {
        if (chara.chara_id == null) continue;
        const cid = String(chara.chara_id);
        if (!winsByCharacter[cid]) winsByCharacter[cid] = new Set();
        winsByCharacter[cid].add(raceId);
      }
    }
  }

  return winsByCharacter;
}

export function setsToArrays(winsByCharacter) {
  const out = {};
  for (const [cid, set] of Object.entries(winsByCharacter)) {
    out[cid] = [...set];
  }
  return out;
}

export function arraysToSets(winsByCharacter) {
  const out = {};
  for (const [cid, arr] of Object.entries(winsByCharacter || {})) {
    out[cid] = new Set(arr);
  }
  return out;
}
