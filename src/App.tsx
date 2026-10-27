import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchAvailability, type BookingResponse } from './api/availability'
import { BookingModal } from './components/BookingModal'
import { Calendar } from './components/Calendar'
import { InfoPanel } from './components/InfoPanel'
import { SlotList, type SlotsStatus } from './components/SlotList'
import { config } from './config'
import {
  addDays,
  addMonths,
  buildMonthGrid,
  groupSlotsByDay,
  makeYMD,
  monthKey,
  parseYMD,
  todayInTz,
  type YMD,
} from './lib/date'
import './App.css'

type MonthState =
  | { status: 'loading' }
  | { status: 'success'; days: Record<YMD, string[]> }
  | { status: 'error'; error: string }

const HOUR12_STORAGE_KEY = 'cinta-calendar.hour12'

export default function App() {
  const tz = config.timeZone
  const today = useMemo(() => todayInTz(tz), [tz])
  const todayParts = parseYMD(today)
  const maxDate = useMemo(() => addDays(today, config.maxDaysAhead), [today])
  const maxDateParts = useMemo(() => parseYMD(maxDate), [maxDate])

  const [view, setView] = useState({ y: todayParts.y, m: todayParts.m })
  const [months, setMonths] = useState<Record<string, MonthState>>({})
  const [selected, setSelected] = useState<YMD | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [hour12, setHour12] = useState(() => localStorage.getItem(HOUR12_STORAGE_KEY) === '1')

  // Booking Modal State
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [isBookingOpen, setIsBookingOpen] = useState(false)

  // URL Prefill State (e.g. ?phone=+14155551234&name=Jane&email=jane@example.com)
  const [prefilledPhone, setPrefilledPhone] = useState('')
  const [prefilledName, setPrefilledName] = useState('')
  const [prefilledEmail, setPrefilledEmail] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const phone =
      params.get('phone') ||
      params.get('tel') ||
      params.get('telephone') ||
      params.get('mobile') ||
      params.get('p') ||
      ''
    const name = params.get('name') || params.get('first_name') || ''
    const email = params.get('email') || ''

    if (phone) setPrefilledPhone(phone.trim())
    if (name) setPrefilledName(name.trim())
    if (email) setPrefilledEmail(email.trim())
  }, [])

  const monthsRef = useRef(months)
  useEffect(() => {
    monthsRef.current = months
  }, [months])

  const key = monthKey(view.y, view.m)
  const grid = useMemo(() => buildMonthGrid(view.y, view.m), [view.y, view.m])
  const current = months[key]

  // Fetch free slots for the visible month (capped at maxDate = today + 7 days)
  useEffect(() => {
    if (monthsRef.current[key]?.status === 'success') return

    const firstOfMonth = makeYMD(view.y, view.m, 1)
    const lastCell = [...grid].reverse().find((c) => c !== null)
    const from = firstOfMonth < today ? today : firstOfMonth
    let to = lastCell?.ymd ?? firstOfMonth
    if (to > maxDate) {
      to = maxDate
    }

    if (to < today || from > maxDate) {
      setMonths((prev) => ({ ...prev, [key]: { status: 'success', days: {} } }))
      return
    }

    const ctrl = new AbortController()
    setMonths((prev) => ({ ...prev, [key]: { status: 'loading' } }))

    fetchAvailability(from, to, ctrl.signal)
      .then((res) => {
        const days = groupSlotsByDay(res.slots, tz, new Date(), maxDate)
        setMonths((prev) => ({ ...prev, [key]: { status: 'success', days } }))
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return
        const error = err instanceof Error ? err.message : String(err)
        setMonths((prev) => ({ ...prev, [key]: { status: 'error', error } }))
      })

    return () => ctrl.abort()
  }, [key, reloadToken, grid, today, maxDate, tz, view.y, view.m])

  // All loaded days across months (so trailing next-month cells light up too)
  const availableDays = useMemo(() => {
    const merged: Record<YMD, string[]> = {}
    for (const state of Object.values(months)) {
      if (state.status === 'success') Object.assign(merged, state.days)
    }
    return merged
  }, [months])

  // Auto-select the first available day when a month finishes loading
  useEffect(() => {
    if (current?.status !== 'success') return
    setSelected((prev) => {
      if (prev && prev.startsWith(key) && prev >= today && prev <= maxDate && availableDays[prev]?.length) return prev
      const first = grid.find((c) => c && c.inMonth && c.ymd >= today && c.ymd <= maxDate && current.days[c.ymd]?.length)
      return first ? first.ymd : null
    })
  }, [current, grid, key, today, maxDate, availableDays])

  const toggleFormat = useCallback((value: boolean) => {
    setHour12(value)
    localStorage.setItem(HOUR12_STORAGE_KEY, value ? '1' : '0')
  }, [])

  const retry = useCallback(() => {
    setMonths((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setReloadToken((t) => t + 1)
  }, [key])

  const handleSelectSlot = useCallback((slotIso: string) => {
    setSelectedSlot(slotIso)
    setIsBookingOpen(true)
  }, [])

  const handleBookingSuccess = useCallback(
    (_resp: BookingResponse) => {
      // Invalidate the current month's cache so the booked slot is refreshed immediately
      setMonths((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      setReloadToken((t) => t + 1)
    },
    [key],
  )

  const goMonth = (delta: number) => setView((v) => addMonths(v.y, v.m, delta))
  const canGoPrev = view.y * 12 + view.m > todayParts.y * 12 + todayParts.m
  const canGoNext = view.y * 12 + view.m < maxDateParts.y * 12 + maxDateParts.m

  let slotsStatus: SlotsStatus = 'success'
  let slots: string[] = []
  if (selected && availableDays[selected]) {
    slots = availableDays[selected]
  } else if (!current || current.status === 'loading') {
    slotsStatus = 'loading'
  } else if (current.status === 'error') {
    slotsStatus = 'error'
  }

  return (
    <main className="page">
      <div className="booker">
        <InfoPanel prefilledName={prefilledName} prefilledPhone={prefilledPhone} />
        <Calendar
          year={view.y}
          month={view.m}
          grid={grid}
          today={today}
          maxDate={maxDate}
          selected={selected}
          availableDays={availableDays}
          loading={current?.status === 'loading'}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          onPrev={() => goMonth(-1)}
          onNext={() => goMonth(1)}
          onSelect={setSelected}
        />
        <SlotList
          day={selected}
          slots={slots}
          status={slotsStatus}
          error={current?.status === 'error' ? current.error : undefined}
          hour12={hour12}
          timeZone={tz}
          onToggleFormat={toggleFormat}
          onRetry={retry}
          onSelectSlot={handleSelectSlot}
        />
      </div>

      {isBookingOpen && selectedSlot && (
        <BookingModal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          slotIso={selectedSlot}
          day={selected}
          hour12={hour12}
          timeZone={tz}
          prefilledPhone={prefilledPhone}
          prefilledName={prefilledName}
          prefilledEmail={prefilledEmail}
          onBookingSuccess={handleBookingSuccess}
        />
      )}
    </main>
  )
}
