import type { LeadSource } from './lead.ts'
import type { LeadStatus } from './navigation.ts'

export const DASHBOARD_PREVIEW_LIMIT = 5

export type StatusCounts = Record<LeadStatus, number>

export type SourceCounts = Record<LeadSource, number>

export type LeadMetrics = {
  total: number
  byStatus: StatusCounts
  bySource: SourceCounts
}

export type RecentLead = {
  id: string
  fullName: string
  status: LeadStatus
  createdAt: string
}

export type RecentLeads = {
  leads: RecentLead[]
  total: number
}

export type FollowUpPreview = {
  id: string
  leadId: string
  leadName: string | null
  dueAt: string
  note: string
}

export type FollowUpBoard = {
  overdueCount: number
  overdue: FollowUpPreview[]
  upcomingCount: number
  upcoming: FollowUpPreview[]
}
