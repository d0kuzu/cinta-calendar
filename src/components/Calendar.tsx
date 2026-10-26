import type { CalendarCell, YMD } from '../lib/date'
import { formatMonth, formatMonthShort } from '../lib/date'
import { ChevronLeft, ChevronRight } from './Icons'

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

interface CalendarProps {
  year: number
  month: number
  grid: (CalendarCell | null)[]
  today: YMD
  selected: YMD | null
  availableDays: Record<YMD, string[]>
  loading: boolean
  canGoPrev: boolean
  onPrev: () => void
  onNext: () => void
  onSelect: (day: YMD) => void
}

export function Calendar({
  year,
  month,
  grid,
  today,
  selected,
  availableDays,
  loading,
  canGoPrev,
  onPrev,
  onNext,
  onSelect,
}: CalendarProps) {
  return (
    <section className="cal" aria-label="Choose a date">
      <header className="cal__header">
        <h2 className="cal__month">
          {formatMonth(year, month)} <span>{year}</span>
        </h2>
        <div className="cal__nav">
          <button
            id="calendar-prev-month"
            type="button"
            className="icon-btn"
            onClick={onPrev}
            disabled={!canGoPrev}
            aria-label="Previous month"
          >
            <ChevronLeft />
          </button>
          <button
            id="calendar-next-month"
            type="button"
            className="icon-btn"
            onClick={onNext}
            aria-label="Next month"
          >
            <ChevronRight />
          </button>
        </div>
      </header>

      <div className={`cal__progress ${loading ? 'is-active' : ''}`} aria-hidden />

      <div className="cal__grid" role="grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="cal__weekday" role="columnheader">
            {w}
          </div>
        ))}

        {grid.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} className="cal__blank" />

          const isPast = cell.ymd < today
          const isAvailable = !isPast && (availableDays[cell.ymd]?.length ?? 0) > 0
          const isSelected = cell.ymd === selected
          const isToday = cell.ymd === today

          const cls = [
            'day',
            isAvailable && 'day--available',
            isSelected && 'day--selected',
            isToday && 'day--today',
            !cell.inMonth && 'day--outside',
            loading && !isAvailable && !isPast && 'day--loading',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={cell.ymd}
              id={`day-${cell.ymd}`}
              type="button"
              className={cls}
              disabled={!isAvailable}
              aria-pressed={isSelected}
              aria-label={`${cell.ymd}${isAvailable ? ', available' : ''}`}
              onClick={() => onSelect(cell.ymd)}
            >
              {!cell.inMonth && cell.day === 1 && (
                <span className="day__badge">{formatMonthShort(cell.month)}</span>
              )}
              {cell.day}
            </button>
          )
        })}
      </div>
    </section>
  )
}
