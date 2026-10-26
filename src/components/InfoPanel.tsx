import { config } from '../config'
import { ClockIcon, GlobeIcon, PinIcon } from './Icons'

function formatDuration(minutes: number) {
  if (minutes % 60 === 0) return `${minutes / 60}h`
  if (minutes > 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  return `${minutes}m`
}

export function InfoPanel() {
  const { event } = config
  const initials = event.organization
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')

  return (
    <aside className="info" aria-label="Event details">
      <div className="info__avatar" aria-hidden>
        {initials}
      </div>
      <p className="info__org">{event.organization}</p>
      <h1 className="info__title">{event.title}</h1>
      <p className="info__desc">{event.description}</p>

      <ul className="info__meta">
        <li>
          <ClockIcon />
          <span>{formatDuration(config.duration)}</span>
        </li>
        <li title={event.address}>
          <PinIcon />
          <span className="info__ellipsis">{event.address}</span>
        </li>
        <li title="All times are shown in San Francisco time">
          <GlobeIcon />
          <span>America/Los_Angeles</span>
        </li>
      </ul>
    </aside>
  )
}
