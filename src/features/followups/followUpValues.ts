export type FollowUpDraft = {
  leadId: string
  dueAt: string
  note: string
  assignedTo: string
}

export type FollowUpFieldErrors = Partial<Record<keyof FollowUpDraft, string>>

const leadIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validateFollowUpDraft(
  draft: FollowUpDraft,
):
  | { ok: true; value: { leadId: string; dueAt: string; note: string; assignedTo: string } }
  | { ok: false; errors: FollowUpFieldErrors } {
  const errors: FollowUpFieldErrors = {}
  const note = draft.note.trim()
  const due = new Date(draft.dueAt)

  if (!leadIdPattern.test(draft.leadId)) errors.leadId = 'Choose a lead.'
  if (!draft.dueAt || Number.isNaN(due.getTime())) errors.dueAt = 'Choose a due date and time.'
  if (!note) errors.note = 'Enter a note.'
  if (!draft.assignedTo) errors.assignedTo = 'Choose an assignee.'

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      leadId: draft.leadId,
      dueAt: due.toISOString(),
      note,
      assignedTo: draft.assignedTo,
    },
  }
}

export function followUpFailureTitle(kind: 'permission' | 'unavailable' | 'invalid' | 'server'): string {
  if (kind === 'permission') return 'You do not have access'
  if (kind === 'unavailable') return 'This follow-up is not available'
  if (kind === 'invalid') return 'The follow-up was rejected'
  return 'The request failed'
}
