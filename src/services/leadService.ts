import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import { recordActivity } from './activityService.ts'
import {
  isLeadSource,
  isLeadStatus,
  type Lead,
  type LeadSource,
  type LeadWrite,
} from '../types/lead.ts'
import type { LeadStatus } from '../types/navigation.ts'

export const LEAD_PAGE_SIZE = 25

const LEAD_COLUMNS =
  'id, full_name, email, phone, course_interest, source, status, lost_reason, notes, assigned_to, created_by, archived_at, created_at'

const leadIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type LeadListQuery = {
  search: string
  status: LeadStatus | null
  source: LeadSource | null
  assignee: string | null
  archived: boolean
  page: number
}

export type LeadPage = {
  leads: Lead[]
  total: number
  page: number
  pageSize: number
}

export type LeadFailure = {
  ok: false
  kind: 'permission' | 'unavailable' | 'invalid' | 'server'
  message: string
}

export type LeadResult<T> = { ok: true; data: T } | LeadFailure

type LeadRow = {
  id: string
  full_name: string
  email: string | null
  phone: string
  course_interest: string
  source: string
  status: string
  lost_reason: string | null
  notes: string | null
  assigned_to: string | null
  created_by: string
  archived_at: string | null
  created_at: string
}

type FollowUpRow = {
  lead_id: string
  due_at: string
}

function failureFrom(error: PostgrestError): LeadFailure {
  if (error.code === '42501' || /permission denied|row-level security/i.test(error.message)) {
    return { ok: false, kind: 'permission', message: error.message }
  }
  if (error.code === 'PGRST116') {
    return { ok: false, kind: 'unavailable', message: 'This lead is not available.' }
  }
  if (error.code === '23514' || error.code === '23502') {
    return {
      ok: false,
      kind: 'invalid',
      message: 'The lead was rejected. Check the required fields and the email.',
    }
  }
  return { ok: false, kind: 'server', message: error.message }
}

function toLead(row: LeadRow, names: Map<string, string>, nextFollowUpAt: string | null): Lead | null {
  if (!isLeadStatus(row.status) || !isLeadSource(row.source)) return null
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    courseInterest: row.course_interest,
    source: row.source,
    status: row.status,
    lostReason: row.lost_reason,
    notes: row.notes,
    assignedTo: row.assigned_to,
    assigneeName: row.assigned_to ? (names.get(row.assigned_to) ?? null) : null,
    createdBy: row.created_by,
    creatorName: names.get(row.created_by) ?? null,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    nextFollowUpAt,
  }
}

function rowPayload(input: LeadWrite) {
  return {
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    course_interest: input.courseInterest,
    source: input.source,
    status: input.status,
    lost_reason: input.lostReason,
    notes: input.notes,
    assigned_to: input.assignedTo,
    created_by: input.createdBy,
  }
}

async function nextFollowUps(leadIds: string[]): Promise<LeadResult<Map<string, string>>> {
  const map = new Map<string, string>()
  if (leadIds.length === 0) return { ok: true, data: map }

  const { data, error } = await getSupabaseClient()
    .from('follow_ups')
    .select('lead_id, due_at')
    .in('lead_id', leadIds)
    .eq('status', 'pending')
    .order('due_at', { ascending: true })

  if (error) return failureFrom(error)

  for (const row of (data ?? []) as FollowUpRow[]) {
    if (!map.has(row.lead_id)) map.set(row.lead_id, row.due_at)
  }
  return { ok: true, data: map }
}

async function profileNames(ids: Array<string | null>): Promise<LeadResult<Map<string, string>>> {
  const unique = [...new Set(ids.filter((id): id is string => id !== null && id !== ''))]
  const map = new Map<string, string>()
  if (unique.length === 0) return { ok: true, data: map }

  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('id, full_name')
    .in('id', unique)

  if (error) return failureFrom(error)
  for (const row of data ?? []) map.set(row.id, row.full_name)
  return { ok: true, data: map }
}

async function leadsFromRows(
  rows: LeadRow[],
  followUps: Map<string, string>,
): Promise<LeadResult<Lead[]>> {
  const names = await profileNames(rows.flatMap((row) => [row.assigned_to, row.created_by]))
  if (!names.ok) return names

  const leads: Lead[] = []
  for (const row of rows) {
    const lead = toLead(row, names.data, followUps.get(row.id) ?? null)
    if (!lead) {
      return {
        ok: false,
        kind: 'server',
        message: 'A lead row has a status or source the desk does not recognise.',
      }
    }
    leads.push(lead)
  }
  return { ok: true, data: leads }
}

function searchFilter(term: string): string | null {
  const safe = term.trim().replace(/["\\%_]/g, '')
  if (!safe) return null
  const quoted = `"%${safe}%"`
  return ['full_name', 'phone', 'email', 'course_interest']
    .map((column) => `${column}.ilike.${quoted}`)
    .join(',')
}

export async function listLeads(query: LeadListQuery): Promise<LeadResult<LeadPage>> {
  const page = query.page > 0 ? query.page : 1
  const from = (page - 1) * LEAD_PAGE_SIZE
  const to = from + LEAD_PAGE_SIZE - 1

  let request = getSupabaseClient()
    .from('leads')
    .select(LEAD_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })

  request = query.archived
    ? request.not('archived_at', 'is', null)
    : request.is('archived_at', null)

  if (query.status) request = request.eq('status', query.status)
  if (query.source) request = request.eq('source', query.source)
  if (query.assignee === 'unassigned') request = request.is('assigned_to', null)
  else if (query.assignee) request = request.eq('assigned_to', query.assignee)

  const orFilter = searchFilter(query.search)
  if (orFilter) request = request.or(orFilter)

  const { data, error, count } = await request.range(from, to)
  if (error) return failureFrom(error)

  const rows = (data ?? []) as unknown as LeadRow[]
  const followUps = await nextFollowUps(rows.map((row) => row.id))
  if (!followUps.ok) return followUps
  const leads = await leadsFromRows(rows, followUps.data)
  if (!leads.ok) return leads

  return {
    ok: true,
    data: {
      leads: leads.data,
      total: count ?? leads.data.length,
      page,
      pageSize: LEAD_PAGE_SIZE,
    },
  }
}

export async function getLead(id: string): Promise<LeadResult<Lead>> {
  if (!leadIdPattern.test(id)) {
    return { ok: false, kind: 'unavailable', message: 'This lead is not available.' }
  }

  const { data, error } = await getSupabaseClient()
    .from('leads')
    .select(LEAD_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error) return failureFrom(error)
  if (!data) {
    return { ok: false, kind: 'unavailable', message: 'This lead is not available.' }
  }

  const followUps = await nextFollowUps([id])
  if (!followUps.ok) return followUps
  const leads = await leadsFromRows([data as unknown as LeadRow], followUps.data)
  if (!leads.ok) return leads
  const lead = leads.data[0]
  if (!lead) {
    return {
      ok: false,
      kind: 'server',
      message: 'This lead has a status or source the desk does not recognise.',
    }
  }
  return { ok: true, data: lead }
}

export async function createLead(input: LeadWrite): Promise<LeadResult<Lead>> {
  // Insert without returning the row. Databases that still use can_access_lead()
  // in the select policy reject INSERT ... RETURNING. The follow-up read sees
  // the committed row. After 20261021123000_lead_select_on_row.sql, returning
  // the row directly also succeeds.
  const { error } = await getSupabaseClient().from('leads').insert(rowPayload(input))
  if (error) return failureFrom(error)

  const { data, error: readError } = await getSupabaseClient()
    .from('leads')
    .select(LEAD_COLUMNS)
    .eq('created_by', input.createdBy)
    .eq('phone', input.phone)
    .eq('full_name', input.fullName)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (readError) return failureFrom(readError)
  if (!data) {
    return { ok: false, kind: 'unavailable', message: 'The saved lead could not be read back.' }
  }

  const saved = data as unknown as LeadRow
  const followUps = await nextFollowUps([saved.id])
  if (!followUps.ok) return followUps
  const leads = await leadsFromRows([saved], followUps.data)
  if (!leads.ok) return leads
  const lead = leads.data[0]
  if (!lead) {
    return { ok: false, kind: 'server', message: 'The saved lead could not be read back.' }
  }
  const historyError = await recordLeadHistory(lead.id, [
    { activityType: 'lead_created', description: 'Enquiry recorded.' },
  ])
  if (historyError) return historyError
  return { ok: true, data: lead }
}

export async function updateLead(id: string, input: LeadWrite): Promise<LeadResult<Lead>> {
  const prior = await getSupabaseClient()
    .from('leads')
    .select('status, notes')
    .eq('id', id)
    .maybeSingle()

  if (prior.error) return failureFrom(prior.error)
  if (!prior.data) {
    return { ok: false, kind: 'unavailable', message: 'This lead is not available.' }
  }

  const { data, error } = await getSupabaseClient()
    .from('leads')
    .update(rowPayload(input))
    .eq('id', id)
    .select(LEAD_COLUMNS)
    .maybeSingle()

  if (error) return failureFrom(error)
  if (!data) {
    return { ok: false, kind: 'unavailable', message: 'This lead is not available.' }
  }

  const row = data as unknown as LeadRow
  const followUps = await nextFollowUps([row.id])
  if (!followUps.ok) return followUps
  const leads = await leadsFromRows([row], followUps.data)
  if (!leads.ok) return leads
  const lead = leads.data[0]
  if (!lead) {
    return { ok: false, kind: 'server', message: 'The saved lead could not be read back.' }
  }
  const historyError = await recordLeadHistory(id, historyEvents(prior.data, input))
  if (historyError) return historyError
  return { ok: true, data: lead }
}

function historyEvents(
  prior: { status: string; notes: string | null },
  input: LeadWrite,
): { activityType: string; description: string }[] {
  const events: { activityType: string; description: string }[] = []
  if (prior.status !== input.status) {
    const description =
      input.status === 'Lost'
        ? `Status changed from ${prior.status} to Lost. Reason: ${(input.lostReason ?? '').trim()}.`
        : `Status changed from ${prior.status} to ${input.status}.`
    events.push({ activityType: 'status_changed', description })
  }
  if ((prior.notes ?? '').trim() !== (input.notes ?? '').trim()) {
    events.push({ activityType: 'notes_updated', description: 'Notes updated.' })
  }
  return events
}

async function recordLeadHistory(
  leadId: string,
  events: { activityType: string; description: string }[],
): Promise<LeadFailure | null> {
  for (const event of events) {
    const recorded = await recordActivity({
      leadId,
      activityType: event.activityType,
      description: event.description,
    })
    if (!recorded.ok) {
      return {
        ok: false,
        kind: 'server',
        message: `The enquiry was saved, but its history could not be recorded. ${recorded.message}`,
      }
    }
  }
  return null
}

export async function setLeadArchived(id: string, archived: boolean): Promise<LeadResult<{ id: string }>> {
  const { data, error } = await getSupabaseClient()
    .from('leads')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) return failureFrom(error)
  if (!data) {
    return { ok: false, kind: 'unavailable', message: 'This lead is not available.' }
  }
  return { ok: true, data: { id: data.id } }
}

export async function listWorkingLeadChoices(): Promise<LeadResult<{ id: string; fullName: string }[]>> {
  const { data, error } = await getSupabaseClient()
    .from('leads')
    .select('id, full_name')
    .is('archived_at', null)
    .order('full_name', { ascending: true })

  if (error) return failureFrom(error)
  return {
    ok: true,
    data: (data ?? []).map((row) => ({ id: row.id, fullName: row.full_name })),
  }
}
