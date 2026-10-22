export function activityLabel(activityType: string): string {
  if (activityType === 'lead_created') return 'Lead created'
  if (activityType === 'status_changed') return 'Status changed'
  if (activityType === 'notes_updated') return 'Notes updated'
  if (activityType === 'follow_up_completed') return 'Follow-up completed'
  return activityType
}

export function activityFailureTitle(kind: 'permission' | 'unavailable' | 'invalid' | 'server'): string {
  if (kind === 'permission') return 'You do not have access'
  if (kind === 'unavailable') return 'This history is not available'
  if (kind === 'invalid') return 'The history row was rejected'
  return 'The request failed'
}
