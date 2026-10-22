import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import {
  DASHBOARD_PREVIEW_LIMIT,
  type FollowUpBoard,
  type FollowUpPreview,
  type LeadMetrics,
  type RecentLead,
  type RecentLeads,
} from '../types/dashboard.ts'
import { isLeadSource, isLeadStatus, LEAD_SOURCES } from '../types/lead.ts'

function emptyStatusCounts() {
  return {
    New: 0,
    Contacted: 0,
    Qualified: 0,
    Converted: 0,
    Lost: 0,
  }
}

function emptySourceCounts() {
  return {
    website: 0,
    call: 0,
    messaging: 0,
    referral: 0,
    'walk-in': 0,
  } as Record<(typeof LEAD_SOURCES)[number], number>
}

export type DashboardFailure = {
  ok: false
  kind: 'permission' | 'unavailable' | 'invalid' | 'server'
  message: string
}

export type DashboardResult<T> = { ok: true; data: T } | DashboardFailure

type LeadCountRow = {
  status: string
  source: string
}

type RecentRow = {
  id: string
  full_name: string
  status: string
  created_at: string
}

type FollowUpRow = {
  id: string
  lead_id: string
  due_at: string
  note: string
}

function failureFrom(error: PostgrestError): DashboardFailure {
  if (error.code === '42501' || /permission denied|row-level security/i.test(error.message)) {
    return { ok: false, kind: 'permission', message: error.message }
  }
  if (error.code === 'PGRST116') {
    return { ok: false, kind: 'unavailable', message: 'This dashboard is not available.' }
  }
  return { ok: false, kind: 'server', message: error.message }
}

export async function loadLeadMetrics(): Promise<DashboardResult<LeadMetrics>> {
  const { data, error } = await getSupabaseClient()
    .from('leads')
    .select('status, source')
    .is('archived_at', null)

  if (error) return failureFrom(error)

  const byStatus = emptyStatusCounts()
  const bySource = emptySourceCounts()
  for (const row of (data ?? []) as LeadCountRow[]) {
    if (!isLeadStatus(row.status) || !isLeadSource(row.source)) {
      return {
        ok: false,
        kind: 'server',
        message: 'A lead has a status or source the desk does not recognise.',
      }
    }
    byStatus[row.status] += 1
    bySource[row.source] += 1
  }

  return {
    ok: true,
    data: {
      total: (data ?? []).length,
      byStatus,
      bySource,
    },
  }
}

export async function loadRecentLeads(): Promise<DashboardResult<RecentLeads>> {
  const { data, error, count } = await getSupabaseClient()
    .from('leads')
    .select('id, full_name, status, created_at', { count: 'exact' })
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .range(0, DASHBOARD_PREVIEW_LIMIT - 1)

  if (error) return failureFrom(error)

  const leads: RecentLead[] = []
  for (const row of (data ?? []) as RecentRow[]) {
    if (!isLeadStatus(row.status)) {
      return {
        ok: false,
        kind: 'server',
        message: 'A lead has a status the desk does not recognise.',
      }
    }
    leads.push({
      id: row.id,
      fullName: row.full_name,
      status: row.status,
      createdAt: row.created_at,
    })
  }

  return { ok: true, data: { leads, total: count ?? leads.length } }
}

async function previewFollowUps(
  comparison: 'lt' | 'gte',
  boundary: string,
): Promise<DashboardResult<{ total: number; rows: FollowUpRow[] }>> {
  let request = getSupabaseClient()
    .from('follow_ups')
    .select('id, lead_id, due_at, note', { count: 'exact' })
    .eq('status', 'pending')
    .order('due_at', { ascending: true })

  request = comparison === 'lt' ? request.lt('due_at', boundary) : request.gte('due_at', boundary)

  const { data, error, count } = await request.range(0, DASHBOARD_PREVIEW_LIMIT - 1)
  if (error) return failureFrom(error)
  return {
    ok: true,
    data: {
      total: count ?? (data ?? []).length,
      rows: (data ?? []) as FollowUpRow[],
    },
  }
}

async function leadNames(ids: string[]): Promise<DashboardResult<Map<string, string>>> {
  const unique = [...new Set(ids)]
  const map = new Map<string, string>()
  if (unique.length === 0) return { ok: true, data: map }

  const { data, error } = await getSupabaseClient()
    .from('leads')
    .select('id, full_name')
    .in('id', unique)

  if (error) return failureFrom(error)
  for (const row of data ?? []) map.set(row.id, row.full_name)
  return { ok: true, data: map }
}

function withLeadNames(rows: FollowUpRow[], names: Map<string, string>): FollowUpPreview[] {
  return rows.map((row) => ({
    id: row.id,
    leadId: row.lead_id,
    leadName: names.get(row.lead_id) ?? null,
    dueAt: row.due_at,
    note: row.note,
  }))
}

export async function loadFollowUpBoard(now = new Date()): Promise<DashboardResult<FollowUpBoard>> {
  const boundary = now.toISOString()
  const overdue = await previewFollowUps('lt', boundary)
  if (!overdue.ok) return overdue
  const upcoming = await previewFollowUps('gte', boundary)
  if (!upcoming.ok) return upcoming

  const names = await leadNames([
    ...overdue.data.rows.map((row) => row.lead_id),
    ...upcoming.data.rows.map((row) => row.lead_id),
  ])
  if (!names.ok) return names

  return {
    ok: true,
    data: {
      overdueCount: overdue.data.total,
      overdue: withLeadNames(overdue.data.rows, names.data),
      upcomingCount: upcoming.data.total,
      upcoming: withLeadNames(upcoming.data.rows, names.data),
    },
  }
}
