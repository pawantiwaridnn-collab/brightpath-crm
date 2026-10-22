import type { LeadStatus } from '../../types/navigation.ts'

type StatusBadgeProps = {
  status: LeadStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <span className="status-mark" aria-hidden="true" />
      {status}
    </span>
  )
}
