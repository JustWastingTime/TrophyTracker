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
