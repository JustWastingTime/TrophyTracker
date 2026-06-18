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

const [rawPath, calendarPath, charsPath] = process.argv.slice(2);

if (!rawPath) {
  console.error('Usage: node scripts/build-data.js <raw-races.json> [calendar-races.json] [characters.json]');
  process.exit(1);
}

const calendarRaces = calendarPath && fs.existsSync(calendarPath)
  ? JSON.parse(fs.readFileSync(calendarPath, 'utf8'))
  : JSON.parse(fs.readFileSync(path.join(dataDir, 'races.json'), 'utf8'));

// Build name lookup from calendar data (id field or name)
const byName = new Map();
for (const r of calendarRaces) {
  const name = (r.race_name || r.name || '').toLowerCase();
  const id = r.id;
  if (name && id) byName.set(name, id);
}

const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
const trophyMap = {};
const seen = new Set();

for (const r of raw) {
  if (seen.has(r.race_id)) continue;
  seen.add(r.race_id);
  const id = byName.get(r.race_name.toLowerCase());
  if (id) trophyMap[String(r.race_id)] = id;
}

fs.writeFileSync(path.join(dataDir, 'trophy-map.json'), JSON.stringify(trophyMap));
console.log(`Wrote trophy-map.json (${Object.keys(trophyMap).length} entries)`);

if (calendarPath && fs.existsSync(calendarPath)) {
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
      thumb: r.thumbnail,
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
