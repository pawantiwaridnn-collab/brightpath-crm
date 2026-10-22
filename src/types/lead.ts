import { LEAD_STATUSES, type LeadStatus } from './navigation.ts'

export const LEAD_SOURCES = ['website', 'call', 'messaging', 'referral', 'walk-in'] as const

export type LeadSource = (typeof LEAD_SOURCES)[number]

export type Lead = {
  id: string
  fullName: string
  email: string | null
  phone: string
  courseInterest: string
  source: LeadSource
  status: LeadStatus
  lostReason: string | null
  notes: string | null
  assignedTo: string | null
  assigneeName: string | null
  createdBy: string
  creatorName: string | null
  archivedAt: string | null
  createdAt: string
  nextFollowUpAt: string | null
}

export type LeadWrite = {
  fullName: string
  email: string | null
  phone: string
  courseInterest: string
  source: LeadSource
  status: LeadStatus
  lostReason: string | null
  notes: string | null
  assignedTo: string | null
  createdBy: string
}

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value)
}

export function isLeadSource(value: string): value is LeadSource {
  return (LEAD_SOURCES as readonly string[]).includes(value)
}

export function leadSourceLabel(source: LeadSource): string {
  if (source === 'walk-in') return 'Walk-in'
  return source.charAt(0).toUpperCase() + source.slice(1)
}
