/** Dates are plain ISO strings (YYYY-MM-DD) so they survive localStorage and compare lexically. */
const MS_DAY = 86_400_000

export const parseISO = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}
export const toISO = (ms: number) => new Date(ms).toISOString().slice(0, 10)
export const addDays = (d: string, n: number) => toISO(parseISO(d) + n * MS_DAY)
export const daysBetween = (a: string, b: string) => Math.round((parseISO(b) - parseISO(a)) / MS_DAY)
export const startOfYear = (year: number) => `${year}-01-01`
export const endOfYear = (year: number) => `${year}-12-31`
export const daysInYear = (year: number) => daysBetween(startOfYear(year), endOfYear(year)) + 1
export const dateOfYearDay = (year: number, doy: number) => addDays(startOfYear(year), doy)

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** 0 = Monday ... 6 = Sunday */
export const weekdayIndex = (d: string) => (new Date(parseISO(d)).getUTCDay() + 6) % 7

export function formatDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  return `${day} ${MONTHS[m - 1].slice(0, 3)} ${y}`
}

/** All the cells of a month grid (Mon-first), padded with days from neighbouring months. */
export function monthGrid(year: number, month: number): string[] {
  const first = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lead = weekdayIndex(first)
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const total = Math.ceil((lead + days) / 7) * 7
  return Array.from({ length: total }, (_, i) => addDays(first, i - lead))
}
