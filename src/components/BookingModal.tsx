import { useEffect, useId, useMemo, useState } from 'react'
import { createBooking, type BookingResponse } from '../api/availability'
import { config } from '../config'
import { formatDayHeading, formatTime, type YMD } from '../lib/date'
import { CheckCircleIcon, ClockIcon, CloseIcon, GlobeIcon, PinIcon, SuccessLargeIcon } from './Icons'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  slotIso: string | null
  day: YMD | null
  hour12: boolean
  timeZone: string
  prefilledPhone?: string
  prefilledName?: string
  prefilledEmail?: string
  onBookingSuccess: (resp: BookingResponse) => void
}

function cleanDigits(val: string) {
  return val.replace(/\D/g, '')
}

function formatPhoneDisplay(raw: string) {
  const digits = cleanDigits(raw)
  if (digits.length === 11 && digits.startsWith('1')) {
    const d = digits.slice(1)
    return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return raw
}


export function BookingModal({
  isOpen,
  onClose,
  slotIso,
  day,
  hour12,
  timeZone,
  prefilledPhone = '',
  prefilledName = '',
  prefilledEmail = '',
  onBookingSuccess,
}: BookingModalProps) {
  const phoneInputId = useId()
  const nameInputId = useId()
  const emailInputId = useId()
  const notesInputId = useId()

  const [phone, setPhone] = useState(prefilledPhone)
  const [name, setName] = useState(prefilledName)
  const [email, setEmail] = useState(prefilledEmail)
  const [notes, setNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BookingResponse | null>(null)

  // Keep state synchronized with prefill props whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setPhone(prefilledPhone)
      setName(prefilledName)
      setEmail(prefilledEmail)
      setNotes('')
      setError(null)
      setResult(null)
    }
  }, [isOpen, prefilledPhone, prefilledName, prefilledEmail])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  const hasPrefilledPhone = useMemo(() => {
    const d = cleanDigits(prefilledPhone)
    return d.length >= 10
  }, [prefilledPhone])

  // Calculate formatted end time (+duration) before any early return
  const endTimeStr = useMemo(() => {
    if (!slotIso) return ''
    try {
      const d = new Date(slotIso)
      const end = new Date(d.getTime() + config.duration * 60000)
      return formatTime(end.toISOString(), timeZone, hour12)
    } catch {
      return ''
    }
  }, [slotIso, timeZone, hour12])

  if (!isOpen || !slotIso) return null

  const heading = day ? formatDayHeading(day) : null
  const formattedStartTime = formatTime(slotIso, timeZone, hour12)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const effectivePhone = hasPrefilledPhone ? prefilledPhone : phone
    const digits = cleanDigits(effectivePhone)
    if (digits.length < 10) {
      setError('Please enter a valid phone number with at least 10 digits.')
      return
    }

    setIsSubmitting(true)

    try {
      const resp = await createBooking({
        phone: effectivePhone,
        slot_time: slotIso,
        duration: config.duration,
        staff_id: config.staffId,
        name: name.trim(),
        email: email.trim(),
        notes: notes.trim(),
        org: config.organization,
      })

      setResult(resp)
      onBookingSuccess(resp)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => !isSubmitting && onClose()}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-card__close"
          aria-label="Close dialog"
          disabled={isSubmitting}
          onClick={onClose}
        >
          <CloseIcon />
        </button>

        {!result ? (
          <>
            <header className="modal-card__header">
              <span className="modal-card__badge">{config.event.organization}</span>
              <h2 id="modal-title" className="modal-card__title">
                {config.event.title}
              </h2>
            </header>

            <div className="modal-summary">
              <div className="modal-summary__item">
                <ClockIcon />
                <div>
                  <strong>
                    {heading ? `${heading.weekday}, ${heading.day}` : ''} • {formattedStartTime}
                    {endTimeStr ? ` – ${endTimeStr}` : ''}
                  </strong>
                  <span>({config.duration} min tour)</span>
                </div>
              </div>

              <div className="modal-summary__item">
                <PinIcon />
                <span>{config.event.address}</span>
              </div>

              <div className="modal-summary__item">
                <GlobeIcon />
                <span>San Francisco time (PT)</span>
              </div>
            </div>

            {hasPrefilledPhone && (
              <div className="modal-prefilled-badge" role="status">
                <CheckCircleIcon />
                <div>
                  <strong>Verified Contact</strong>
                  <p>
                    Booking for phone number:{' '}
                    <code>{formatPhoneDisplay(prefilledPhone)}</code>
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="modal-alert modal-alert--error" role="alert">
                <p>
                  <strong>Unable to schedule tour</strong>
                </p>
                <p>{error}</p>
                {error.toLowerCase().includes('not found') && (
                  <small>
                    Make sure to use the exact phone number you provided during inquiry, or contact our
                    admissions office.
                  </small>
                )}
              </div>
            )}

            <form className="modal-form" onSubmit={handleSubmit}>
              {/* Phone field is HIDDEN if prefilled from URL, otherwise required */}
              {!hasPrefilledPhone && (
                <div className="modal-form__group">
                  <label htmlFor={phoneInputId}>
                    Phone Number <span className="modal-form__req">*</span>
                  </label>
                  <input
                    id={phoneInputId}
                    type="tel"
                    required
                    placeholder="(415) 555-0123"
                    value={phone}
                    disabled={isSubmitting}
                    onChange={(e) => setPhone(e.target.value)}
                    className="modal-form__input"
                  />
                  <span className="modal-form__hint">
                    Enter the phone number you used when contacting admissions.
                  </span>
                </div>
              )}

              <div className="modal-form__row">
                <div className="modal-form__group">
                  <label htmlFor={nameInputId}>Your Name</label>
                  <input
                    id={nameInputId}
                    type="text"
                    placeholder="e.g. Jane Doe"
                    value={name}
                    disabled={isSubmitting}
                    onChange={(e) => setName(e.target.value)}
                    className="modal-form__input"
                  />
                </div>

                <div className="modal-form__group">
                  <label htmlFor={emailInputId}>Email Address</label>
                  <input
                    id={emailInputId}
                    type="email"
                    placeholder="e.g. jane@example.com"
                    value={email}
                    disabled={isSubmitting}
                    onChange={(e) => setEmail(e.target.value)}
                    className="modal-form__input"
                  />
                </div>
              </div>

              <div className="modal-form__group">
                <label htmlFor={notesInputId}>
                  Questions or special notes <span className="modal-form__opt">(optional)</span>
                </label>
                <textarea
                  id={notesInputId}
                  rows={2}
                  placeholder="Tell us what program or interests you'd like to see..."
                  value={notes}
                  disabled={isSubmitting}
                  onChange={(e) => setNotes(e.target.value)}
                  className="modal-form__textarea"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={isSubmitting}
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="btn__spinner" aria-hidden />
                      Booking Tour...
                    </>
                  ) : (
                    'Confirm Campus Tour'
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="modal-success">
            <div className="modal-success__icon">
              <SuccessLargeIcon />
            </div>

            <h2 className="modal-success__title">Tour Confirmed!</h2>
            <p className="modal-success__desc">
              {result.first_name || result.name ? (
                <>
                  Thank you, <strong>{result.first_name || result.name}</strong>! We look forward to
                  showing you around our San Francisco campus.
                </>
              ) : (
                'Your admissions campus tour has been successfully reserved in our system.'
              )}
            </p>

            <div className="modal-success__card">
              <div className="modal-success__row">
                <span className="modal-success__label">When:</span>
                <span className="modal-success__val">
                  {heading ? `${heading.weekday}, ${heading.day}` : ''} at {formattedStartTime} (PT)
                </span>
              </div>
              <div className="modal-success__row">
                <span className="modal-success__label">Where:</span>
                <span className="modal-success__val">{config.event.address}</span>
              </div>
              {result.appointment_id && (
                <div className="modal-success__row">
                  <span className="modal-success__label">Appointment ID:</span>
                  <span className="modal-success__val">#{result.appointment_id}</span>
                </div>
              )}
            </div>

            <div className="modal-success__actions">
              <button type="button" className="btn btn--primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
