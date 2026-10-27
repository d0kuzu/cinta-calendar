import type { AvailabilitySlot } from '../api/availability'

/** Calendar date string: YYYY-MM-DD (no time zone attached) */
export type YMD = string

const pad = (n: number) => String(n).padStart(2, '0')

export const makeYMD = (y: number, m: number, d: number): YMD => `${y}-${pad(m)}-${pad(d)}`
export const monthKey = (y: number, m: number) => `${y}-${pad(m)}`

export function parseYMD(s: YMD) {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m, d }
}

const ymdFormatters = new Map<string, Intl.DateTimeFormat>()

/** Calendar date of an instant as seen in the given time zone */
export function toYMDInTz(date: Date, timeZone: string): YMD {
  let fmt = ymdFormatters.get(timeZone)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    ymdFormatters.set(timeZone, fmt)
  }
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

export const todayInTz = (timeZone: string) => toYMDInTz(new Date(), timeZone)

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()
const weekdayOf = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).getUTCDay()

export function addMonths(y: number, m: number, delta: number) {
  const idx = y * 12 + (m - 1) + delta
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 }
}

export function addDays(ymd: YMD, days: number): YMD {
  const { y, m, d } = parseYMD(ymd)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return makeYMD(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

export interface CalendarCell {
  ymd: YMD
  day: number
  month: number
  inMonth: boolean
}

/** Month grid (Sunday first): leading blanks, month days, trailing next-month days to finish the week */
export function buildMonthGrid(y: number, m: number): (CalendarCell | null)[] {
  const cells: (CalendarCell | null)[] = []
  const lead = weekdayOf(y, m, 1)
  for (let i = 0; i < lead; i++) cells.push(null)

  const total = daysInMonth(y, m)
  for (let d = 1; d <= total; d++) cells.push({ ymd: makeYMD(y, m, d), day: d, month: m, inMonth: true })

  const next = addMonths(y, m, 1)
  let d = 1
  while (cells.length % 7 !== 0) {
    cells.push({ ymd: makeYMD(next.y, next.m, d), day: d, month: next.m, inMonth: false })
    d++
  }
  return cells
}

/**
 * Re-groups backend slots by their calendar day in `timeZone`
 * (does not rely on backend date keys) and drops slots that already started.
 */
export function groupSlotsByDay(
  slots: Record<string, AvailabilitySlot[]> | null | undefined,
  timeZone: string,
  now: Date = new Date(),
  maxDate?: YMD,
): Record<YMD, string[]> {
  const result: Record<YMD, string[]> = {}
  if (!slots) return result

  for (const list of Object.values(slots)) {
    for (const slot of list ?? []) {
      const date = new Date(slot.time)
      if (Number.isNaN(date.getTime()) || date <= now) continue
      const day = toYMDInTz(date, timeZone)
      if (maxDate && day > maxDate) continue
      ;(result[day] ??= []).push(slot.time)
    }
  }

  for (const day of Object.keys(result)) {
    result[day] = Array.from(new Set(result[day])).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    )
  }
  return result
}

export function formatTime(iso: string, timeZone: string, hour12: boolean) {
  const text = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: hour12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    hourCycle: hour12 ? 'h12' : 'h23',
  }).format(new Date(iso))
  return hour12 ? text.replace(/\s?([AP]M)$/i, (_, p: string) => p.toLowerCase()) : text
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** "Tue" + "27th" for a calendar day */
export function formatDayHeading(ymd: YMD) {
  const { y, m, d } = parseYMD(ymd)
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  )
  return { weekday, day: ordinal(d) }
}

export function formatMonth(y: number, m: number) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  )
}

export function formatMonthShort(m: number) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2000, m - 1, 1)))
    .toUpperCase()
}
