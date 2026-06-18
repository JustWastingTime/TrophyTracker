/**
 * Refresh data/trophy-map.json (and optionally races + characters).
 *
 * Usage:
 *   node scripts/build-data.js <raw-races.json>
 *   node scripts/build-data.js <raw-races.json> <calendar-races.json> <characters.json>
 *
 * raw-races.json — game export with race_id + race_name (for trophy_id mapping)
 * calendar-races.json — optional; TazunaBot-style assets/races.json with career dates
 * characters.json — optional; TazunaBot-style assets/character.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
const BANNER_BASE = 'https://media.gametora.com/umamusume/races/banners/en/';

function bannerUrl(thumbnail, raceId) {
  const fromThumb = thumbnail?.match(/_(\d{4})_00\.png/)?.[1]
    || thumbnail?.match(/\/en\/(\d+)\.png/)?.[1];
  const id = fromThumb || raceId;
  return id ? `${BANNER_BASE}${id}.png` : '';
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[''`’]/g, '').replace(/\s+/g, ' ').trim();
}

function thumbIdFromUrl(url) {
  return url?.match(/_(\d{4})_00\.png/)?.[1]
    || url?.match(/\/en\/(\d+)\.png/)?.[1]
    || null;
}

const [rawPath, calendarPath, charsPath] = process.argv.slice(2);

if (!rawPath) {
  console.error('Usage: node scripts/build-data.js <raw-races.json> [calendar-races.json] [characters.json]');
  process.exit(1);
}

const calendarRaces = calendarPath && fs.existsSync(calendarPath)
  ? JSON.parse(fs.readFileSync(calendarPath, 'utf8'))
  : JSON.parse(fs.readFileSync(path.join(dataDir, 'races.json'), 'utf8'));

// Build name + banner-id lookups from calendar data
const byName = new Map();
const byThumbId = new Map();
for (const r of calendarRaces) {
  const name = normalizeName(r.race_name || r.name || '');
  const id = r.id;
  if (name && id) byName.set(name, id);

  const thumbKey = thumbIdFromUrl(r.thumbnail || r.thumb);
  if (thumbKey && id) byThumbId.set(thumbKey, id);
}

const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
const trophyMap = {};
const seen = new Set();

for (const r of raw) {
  if (seen.has(r.race_id)) continue;
  seen.add(r.race_id);

  const id = byName.get(normalizeName(r.race_name))
    || byThumbId.get(String(r.race_id))
    || byThumbId.get(String(r.thumbnail_id));
  if (id) trophyMap[String(r.race_id)] = id;
}

fs.writeFileSync(path.join(dataDir, 'trophy-map.json'), JSON.stringify(trophyMap));
console.log(`Wrote trophy-map.json (${Object.keys(trophyMap).length} entries)`);

if (calendarPath && fs.existsSync(calendarPath)) {
  const raceIdByCalendarId = {};
  for (const [tid, calId] of Object.entries(trophyMap)) {
    if (!raceIdByCalendarId[calId]) raceIdByCalendarId[calId] = tid;
  }

  const races = JSON.parse(fs.readFileSync(calendarPath, 'utf8'))
    .filter((r) => r.grade !== 'EX' && r.terrain !== 'Based on your career wins')
    .map((r) => ({
      id: r.id,
      name: r.race_name,
      grade: r.grade === '3' ? 'G3' : r.grade,
      terrain: r.terrain,
      distance: r.distance_type,
      date: r.date,
      track: r.racetrack,
      thumb: bannerUrl(r.thumbnail, raceIdByCalendarId[r.id]),
    }));
  fs.writeFileSync(path.join(dataDir, 'races.json'), JSON.stringify(races));
  console.log(`Wrote races.json (${races.length} races)`);
}

if (charsPath && fs.existsSync(charsPath)) {
  const chars = JSON.parse(fs.readFileSync(charsPath, 'utf8'));
  const base = new Map();
  for (const c of chars) {
    const m = c.id.match(/^(\d{6})/);
    if (!m) continue;
    const charaId = parseInt(m[1].slice(0, 4), 10);
    if (!base.has(charaId)) {
      base.set(charaId, { id: charaId, name: c.character_name, thumb: c.thumbnail });
    }
  }
  const characters = [...base.values()].sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(path.join(dataDir, 'characters.json'), JSON.stringify(characters));
  console.log(`Wrote characters.json (${characters.length} characters)`);
}
