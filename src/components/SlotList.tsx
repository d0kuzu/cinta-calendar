import type { YMD } from '../lib/date'
import { formatDayHeading, formatTime } from '../lib/date'
import { AlertIcon, CalendarOffIcon } from './Icons'

export type SlotsStatus = 'idle' | 'loading' | 'success' | 'error'

interface SlotListProps {
  day: YMD | null
  slots: string[]
  status: SlotsStatus
  error?: string
  hour12: boolean
  timeZone: string
  onToggleFormat: (hour12: boolean) => void
  onRetry: () => void
  onSelectSlot: (slotIso: string) => void
}

export function SlotList({
  day,
  slots,
  status,
  error,
  hour12,
  timeZone,
  onToggleFormat,
  onRetry,
  onSelectSlot,
}: SlotListProps) {
  const heading = day ? formatDayHeading(day) : null

  return (
    <section className="slots" aria-label="Available times">
      <header className="slots__header">
        <h3 className="slots__day">
          {heading ? (
            <>
              {heading.weekday} <span>{heading.day}</span>
            </>
          ) : (
            <span>Select a date</span>
          )}
        </h3>

        <div className="toggle" role="group" aria-label="Time format">
          <button
            id="time-format-12h"
            type="button"
            className={hour12 ? 'is-active' : ''}
            aria-pressed={hour12}
            onClick={() => onToggleFormat(true)}
          >
            12h
          </button>
          <button
            id="time-format-24h"
            type="button"
            className={!hour12 ? 'is-active' : ''}
            aria-pressed={!hour12}
            onClick={() => onToggleFormat(false)}
          >
            24h
          </button>
        </div>
      </header>

      <div className="slots__body">
        {status === 'loading' && (
          <ul className="slots__list" aria-busy>
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="slot slot--skeleton" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </ul>
        )}

        {status === 'error' && (
          <div className="slots__state">
            <AlertIcon />
            <p>Couldn&apos;t load available times.</p>
            {error && <small>{error}</small>}
            <button id="slots-retry" type="button" className="btn" onClick={onRetry}>
              Try again
            </button>
          </div>
        )}

        {status === 'success' && slots.length === 0 && (
          <div className="slots__state">
            <CalendarOffIcon />
            <p>{day ? 'No available times on this day.' : 'No available times this month.'}</p>
            <small>Try another date or the next month.</small>
          </div>
        )}

        {status === 'success' && slots.length > 0 && (
          <ul className="slots__list" key={day ?? 'none'}>
            {slots.map((iso, i) => (
              <li key={iso}>
                <button
                  type="button"
                  className="slot slot--btn"
                  style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                  onClick={() => onSelectSlot(iso)}
                  title={`Book tour for ${formatTime(iso, timeZone, hour12)}`}
                >
                  <span className="slot__dot" aria-hidden />
                  <time dateTime={iso}>{formatTime(iso, timeZone, hour12)}</time>
                  <span className="slot__action">Book</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
