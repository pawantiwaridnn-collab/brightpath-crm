import { LEAD_SOURCES, type LeadSource } from '../../types/lead.ts'
import { LEAD_STATUSES, type LeadStatus } from '../../types/navigation.ts'

export function conversionRate(converted: number, total: number): number {
  if (total === 0) return 0
  return Math.round((converted / total) * 100)
}

export function dashboardFailureTitle(kind: 'permission' | 'unavailable' | 'invalid' | 'server'): string {
  if (kind === 'permission') return 'You do not have access'
  if (kind === 'unavailable') return 'This dashboard is not available'
  if (kind === 'invalid') return 'The dashboard was rejected'
  return 'The request failed'
}

export const STATUS_ORDER: readonly LeadStatus[] = LEAD_STATUSES
export const SOURCE_ORDER: readonly LeadSource[] = LEAD_SOURCES
