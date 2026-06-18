const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEAR_ORDER = { 'Junior Year': 1, 'Classic Year': 2, 'Senior Year': 3 };
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseCareerDate(dateStr) {
  const m = dateStr.match(/^(.+?) - (Early|Late) (.+)$/);
  if (!m) return { sort: 99999, year: '', half: '', month: '', monthNum: 0 };

  const yearTier = YEAR_ORDER[m[1]] || 9;
  const monthIdx = MONTHS.indexOf(m[3]);
  const half = m[2];
  const monthOrder = yearTier === 1
    ? (monthIdx >= 6 ? monthIdx - 6 : monthIdx + 6)
    : monthIdx;

  return {
    sort: yearTier * 1000 + monthOrder * 10 + (half === 'Early' ? 0 : 1),
    year: m[1],
    half,
    month: m[3],
    monthNum: monthIdx + 1,
    yearShort: m[1].replace(' Year', ''),
  };
}

export function groupRacesByTimeline(races) {
  const slots = new Map();

  for (const race of races) {
    const parsed = parseCareerDate(race.date);
    const key = `${parsed.sort}|${race.date}`;
    if (!slots.has(key)) {
      slots.set(key, { ...parsed, date: race.date, races: [] });
    }
    slots.get(key).races.push(race);
  }

  const sorted = [...slots.values()].sort((a, b) => a.sort - b.sort);
  const years = [];
  let currentYear = null;

  for (const slot of sorted) {
    if (!currentYear || currentYear.label !== slot.year) {
      currentYear = { label: slot.year, yearShort: slot.yearShort, months: [] };
      years.push(currentYear);
    }

    const monthKey = `${slot.month}-${slot.year}`;
    let month = currentYear.months.find((m) => m.key === monthKey);
    if (!month) {
      month = {
        key: monthKey,
        month: slot.month,
        monthNum: slot.monthNum,
        days: [],
      };
      currentYear.months.push(month);
    }

    month.days.push({ half: slot.half, races: slot.races });
  }

  return years;
}

export function distanceLabel(d) {
  const map = { Sprint: 'Sprint', Mile: 'Mile', Medium: 'Med', Long: 'Long' };
  return map[d] || d;
}

/**
 * Races that share a trophy (e.g. Classic + Senior Takarazuka Kinen) are grouped
 * by name and banner art so one win counts for every calendar slot.
 */
export function buildRaceAliasIndex(races) {
  const byName = new Map();

  for (const race of races) {
    if (!byName.has(race.name)) byName.set(race.name, []);
    byName.get(race.name).push(race);
  }

  const aliasesById = new Map();
  const groups = [];

  for (const [name, list] of byName) {
    if (list.length < 2) {
      groups.push([list[0].id]);
      aliasesById.set(list[0].id, [list[0].id]);
      continue;
    }

    const byThumb = new Map();
    for (const race of list) {
      const key = race.thumb || name;
      if (!byThumb.has(key)) byThumb.set(key, []);
      byThumb.get(key).push(race.id);
    }

    for (const ids of byThumb.values()) {
      groups.push(ids);
      for (const id of ids) aliasesById.set(id, ids);
    }
  }

  return { aliasesById, groups };
}

export function expandRaceIds(raceIds, aliasesById) {
  const out = new Set();
  for (const id of raceIds) {
    for (const alias of aliasesById.get(id) || [id]) out.add(alias);
  }
  return out;
}
