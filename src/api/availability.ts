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
