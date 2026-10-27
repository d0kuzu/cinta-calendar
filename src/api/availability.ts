import { config } from '../config'

export interface AvailabilitySlot {
  time: string
}

export interface AvailabilityResponse {
  status: string
  organization: string
  staff_id: number
  duration: number
  from_date: string
  to_date: string
  slots: Record<string, AvailabilitySlot[]> | null
}

export interface CreateBookingPayload {
  phone: string
  slot_time: string
  duration?: number
  staff_id?: number
  name?: string
  email?: string
  notes?: string
  org?: string
}

export interface BookingResponse {
  status: string
  message: string
  appointment_id?: number
  contact_id?: number
  program_id?: number
  name?: string
  first_name?: string
  email?: string
  phone?: string
  date_from?: string
  date_to?: string
  timezone?: string
  staff_id?: number
  title?: string
  error?: string
}

/**
 * GET {base}/campuslogin/booking/availability
 * Returns only FREE slots for the given inclusive date range (YYYY-MM-DD).
 */
export async function fetchAvailability(
  fromDate: string,
  toDate: string,
  signal?: AbortSignal,
): Promise<AvailabilityResponse> {
  const params = new URLSearchParams({
    organization: config.organization,
    staff_id: String(config.staffId),
    duration: String(config.duration),
    from_date: fromDate,
    to_date: toDate,
  })

  const res = await fetch(`${config.apiBaseUrl}/campuslogin/booking/availability?${params}`, {
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body && typeof body.error === 'string') message = body.error
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message)
  }

  return (await res.json()) as AvailabilityResponse
}

/**
 * POST {base}/campuslogin/booking
 * Schedules an admissions tour appointment for the contact matched by phone number.
 */
export async function createBooking(payload: CreateBookingPayload): Promise<BookingResponse> {
  const res = await fetch(`${config.apiBaseUrl}/campuslogin/booking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      phone: payload.phone,
      slot_time: payload.slot_time,
      duration: payload.duration ?? config.duration,
      staff_id: payload.staff_id ?? config.staffId,
      name: payload.name || undefined,
      email: payload.email || undefined,
      notes: payload.notes || undefined,
      org: payload.org ?? config.organization,
    }),
  })

  const data = (await res.json().catch(() => null)) as (BookingResponse & { error?: string }) | null

  if (!res.ok) {
    const errorMsg = data?.error || `Booking failed with status ${res.status}`
    throw new Error(errorMsg)
  }

  return data as BookingResponse
}
