export const FOLLOW_UP_STATUSES = ['pending', 'completed', 'cancelled'] as const

export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number]

export type FollowUpView = 'upcoming' | 'overdue' | 'closed'

export type FollowUp = {
  id: string
  leadId: string
  leadName: string | null
  assignedTo: string
  assigneeName: string | null
  dueAt: string
  note: string
  status: FollowUpStatus
  completedAt: string | null
  createdBy: string
  createdAt: string
}

export type FollowUpWrite = {
  leadId: string
  assignedTo: string
  dueAt: string
  note: string
  createdBy: string
}

export function isFollowUpStatus(value: string): value is FollowUpStatus {
  return (FOLLOW_UP_STATUSES as readonly string[]).includes(value)
}

export function isFollowUpView(value: string): value is FollowUpView {
  return value === 'upcoming' || value === 'overdue' || value === 'closed'
}

export function followUpStatusLabel(followUp: Pick<FollowUp, 'status' | 'dueAt'>, now = new Date()): string {
  if (followUp.status === 'completed') return 'Completed'
  if (followUp.status === 'cancelled') return 'Cancelled'
  if (new Date(followUp.dueAt).getTime() < now.getTime()) return 'Overdue'
  return 'Pending'
}
