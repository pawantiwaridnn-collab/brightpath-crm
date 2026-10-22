import {
  isLeadSource,
  isLeadStatus,
  type Lead,
  type LeadWrite,
} from '../../types/lead.ts'

export type LeadDraft = {
  fullName: string
  email: string
  phone: string
  courseInterest: string
  source: string
  status: string
  lostReason: string
  notes: string
  assignedTo: string
}

export type LeadFieldErrors = Partial<Record<keyof LeadDraft, string>>

export const emptyLeadDraft: LeadDraft = {
  fullName: '',
  email: '',
  phone: '',
  courseInterest: '',
  source: '',
  status: 'New',
  lostReason: '',
  notes: '',
  assignedTo: '',
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function draftFromLead(lead: Lead): LeadDraft {
  return {
    fullName: lead.fullName,
    email: lead.email ?? '',
    phone: lead.phone,
    courseInterest: lead.courseInterest,
    source: lead.source,
    status: lead.status,
    lostReason: lead.lostReason ?? '',
    notes: lead.notes ?? '',
    assignedTo: lead.assignedTo ?? '',
  }
}

export function validateLeadDraft(
  draft: LeadDraft,
): { ok: true; value: Omit<LeadWrite, 'createdBy'> } | { ok: false; errors: LeadFieldErrors } {
  const errors: LeadFieldErrors = {}
  const fullName = draft.fullName.trim()
  const phone = draft.phone.trim()
  const courseInterest = draft.courseInterest.trim()
  const email = draft.email.trim()
  const lostReason = draft.lostReason.trim()
  const notes = draft.notes.trim()

  if (!fullName) errors.fullName = "Enter the student's name."
  if (!phone) errors.phone = 'Enter a phone number.'
  if (!courseInterest) errors.courseInterest = 'Enter the course of interest.'
  if (!isLeadSource(draft.source)) errors.source = 'Choose a source.'
  if (!isLeadStatus(draft.status)) errors.status = 'Choose a status.'
  if (email && !emailPattern.test(email)) {
    errors.email = 'Enter an email address with a name and a domain.'
  }
  if (draft.status === 'Lost' && !lostReason) {
    errors.lostReason = 'Enter a reason for marking this lead Lost.'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  if (!isLeadSource(draft.source) || !isLeadStatus(draft.status)) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      fullName,
      phone,
      courseInterest,
      email: email || null,
      source: draft.source,
      status: draft.status,
      lostReason: draft.status === 'Lost' ? lostReason : null,
      notes: notes || null,
      assignedTo: draft.assignedTo || null,
    },
  }
}

export function assigneeLabel(lead: Pick<Lead, 'assignedTo' | 'assigneeName'>): string {
  if (!lead.assignedTo) return 'Unassigned'
  return lead.assigneeName ?? 'Assigned'
}

export function leadFailureTitle(kind: 'permission' | 'unavailable' | 'invalid' | 'server'): string {
  if (kind === 'permission') return 'You do not have access'
  if (kind === 'unavailable') return 'This lead is not available'
  if (kind === 'invalid') return 'The lead was rejected'
  return 'The request failed'
}
