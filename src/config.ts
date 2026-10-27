const env = import.meta.env

export const config = {
  /** Base URL of the backend (without trailing slash) */
  apiBaseUrl: (env.VITE_API_BASE_URL || 'https://api.zerde.co/diaxel').replace(/\/+$/, ''),
  /** CampusLogin organization on the backend side: "cinta" | "canada" */
  organization: env.VITE_ORGANIZATION || 'cinta',
  /** CampusLogin staff (user) id whose availability is shown */
  staffId: Number(env.VITE_STAFF_ID || 12001),
  /** Slot duration in minutes */
  duration: Number(env.VITE_DURATION || 60),
  /** All dates/times are shown in San Francisco time */
  timeZone: 'America/Los_Angeles',

  event: {
    organization: 'Cinta Aveda Institute',
    title: 'San Francisco Campus Tour',
    description: 'Visit our campus in San Francisco',
    address: '305 Kearny Street, San Francisco, CA',
  },
} as const
