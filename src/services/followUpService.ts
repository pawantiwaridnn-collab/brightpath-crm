import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import { recordActivity } from './activityService.ts'
import {
  isFollowUpStatus,
  type FollowUp,
  type FollowUpView,
  type FollowUpWrite,
} from '../types/followUp.ts'

export const FOLLOW_UP_PAGE_SIZE = 25

const FOLLOW_UP_COLUMNS =
  'id, lead_id, assigned_to, due_at, note, status, completed_at, created_by, created_at'

const followUpIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type FollowUpPage = {
  followUps: FollowUp[]
  total: number
  page: number
  pageSize: number
}

export type FollowUpFailure = {
  ok: false
  kind: 'permission' | 'unavailable' | 'invalid' | 'server'
  message: string
  saved?: boolean
}

export type FollowUpResult<T> = { ok: true; data: T } | FollowUpFailure

type FollowUpRow = {
  id: string
  lead_id: string
  assigned_to: string
  due_at: string
  note: string
  status: string
  completed_at: string | null
  created_by: string
  created_at: string
}

function failureFrom(error: PostgrestError): FollowUpFailure {
  if (error.code === '42501' || /permission denied|row-level security/i.test(error.message)) {
    return { ok: false, kind: 'permission', message: error.message }
  }
  if (error.code === 'PGRST116') {
    return { ok: false, kind: 'unavailable', message: 'This follow-up is not available.' }
  }
  if (error.code === '23514' || error.code === '23502' || error.code === '23503') {
    return {
      ok: false,
      kind: 'invalid',
      message: 'The follow-up was rejected. Check the lead, due time, note, and assignee.',
    }
  }
  return { ok: false, kind: 'server', message: error.message }
}

async function nameMap(
  table: 'leads' | 'profiles',
  ids: string[],
): Promise<FollowUpResult<Map<string, string>>> {
  const unique = [...new Set(ids.filter((id) => id !== ''))]
  const map = new Map<string, string>()
  if (unique.length === 0) return { ok: true, data: map }

  const { data, error } = await getSupabaseClient()
    .from(table)
    .select('id, full_name')
    .in('id', unique)

  if (error) return failureFrom(error)
  for (const row of data ?? []) map.set(row.id, row.full_name)
  return { ok: true, data: map }
}

async function withNames(rows: FollowUpRow[]): Promise<FollowUpResult<FollowUp[]>> {
  const leads = await nameMap(
    'leads',
    rows.map((row) => row.lead_id),
  )
  if (!leads.ok) return leads
  const profiles = await nameMap(
    'profiles',
    rows.map((row) => row.assigned_to),
  )
  if (!profiles.ok) return profiles

  const followUps: FollowUp[] = []
  for (const row of rows) {
    if (!isFollowUpStatus(row.status)) {
      return {
        ok: false,
        kind: 'server',
        message: 'A follow-up has a status the desk does not recognise.',
      }
    }
    followUps.push({
      id: row.id,
      leadId: row.lead_id,
      leadName: leads.data.get(row.lead_id) ?? null,
      assignedTo: row.assigned_to,
      assigneeName: profiles.data.get(row.assigned_to) ?? null,
      dueAt: row.due_at,
      note: row.note,
      status: row.status,
      completedAt: row.completed_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
    })
  }
  return { ok: true, data: followUps }
}

export async function listFollowUps(
  view: FollowUpView,
  page: number,
  now = new Date(),
): Promise<FollowUpResult<FollowUpPage>> {
  const currentPage = page > 0 ? page : 1
  const from = (currentPage - 1) * FOLLOW_UP_PAGE_SIZE
  const to = from + FOLLOW_UP_PAGE_SIZE - 1
  const boundary = now.toISOString()

  let request = getSupabaseClient().from('follow_ups').select(FOLLOW_UP_COLUMNS, { count: 'exact' })

  if (view === 'closed') {
    request = request.in('status', ['completed', 'cancelled']).order('created_at', { ascending: false })
  } else {
    request = request.eq('status', 'pending').order('due_at', { ascending: true })
    request = view === 'overdue' ? request.lt('due_at', boundary) : request.gte('due_at', boundary)
  }

  const { data, error, count } = await request.range(from, to)
  if (error) return failureFrom(error)

  const followUps = await withNames((data ?? []) as unknown as FollowUpRow[])
  if (!followUps.ok) return followUps

  return {
    ok: true,
    data: {
      followUps: followUps.data,
      total: count ?? followUps.data.length,
      page: currentPage,
      pageSize: FOLLOW_UP_PAGE_SIZE,
    },
  }
}

export async function listFollowUpsForLead(leadId: string): Promise<FollowUpResult<FollowUp[]>> {
  if (!followUpIdPattern.test(leadId)) {
    return { ok: false, kind: 'unavailable', message: 'This lead is not available.' }
  }

  const { data, error } = await getSupabaseClient()
    .from('follow_ups')
    .select(FOLLOW_UP_COLUMNS)
    .eq('lead_id', leadId)
    .order('due_at', { ascending: true })

  if (error) return failureFrom(error)
  return withNames((data ?? []) as unknown as FollowUpRow[])
}

export async function createFollowUp(input: FollowUpWrite): Promise<FollowUpResult<FollowUp>> {
  const { data, error } = await getSupabaseClient()
    .from('follow_ups')
    .insert({
      lead_id: input.leadId,
      assigned_to: input.assignedTo,
      due_at: input.dueAt,
      note: input.note,
      status: 'pending',
      completed_at: null,
      created_by: input.createdBy,
    })
    .select(FOLLOW_UP_COLUMNS)
    .single()

  if (error) return failureFrom(error)
  const followUps = await withNames([data as unknown as FollowUpRow])
  if (!followUps.ok) return followUps
  const followUp = followUps.data[0]
  if (!followUp) {
    return { ok: false, kind: 'server', message: 'The saved follow-up could not be read back.' }
  }
  return { ok: true, data: followUp }
}

async function setStatus(
  id: string,
  status: 'completed' | 'cancelled',
): Promise<FollowUpResult<{ id: string; leadId: string }>> {
  if (!followUpIdPattern.test(id)) {
    return { ok: false, kind: 'unavailable', message: 'This follow-up is not available.' }
  }

  const { data, error } = await getSupabaseClient()
    .from('follow_ups')
    .update(
      status === 'completed'
        ? { status, completed_at: new Date().toISOString() }
        : { status, completed_at: null },
    )
    .eq('id', id)
    .eq('status', 'pending')
    .select('id, lead_id')
    .maybeSingle()

  if (error) return failureFrom(error)
  if (!data) {
    return { ok: false, kind: 'unavailable', message: 'This follow-up is not available.' }
  }
  return { ok: true, data: { id: data.id, leadId: data.lead_id } }
}

export async function completeFollowUp(id: string): Promise<FollowUpResult<{ id: string }>> {
  const result = await setStatus(id, 'completed')
  if (!result.ok) return result
  const recorded = await recordActivity({
    leadId: result.data.leadId,
    activityType: 'follow_up_completed',
    description: 'Follow-up completed.',
  })
  if (!recorded.ok) {
    return {
      ok: false,
      kind: 'server',
      message: `The follow-up was completed, but its history could not be recorded. ${recorded.message}`,
      saved: true,
    }
  }
  return { ok: true, data: { id: result.data.id } }
}

export function cancelFollowUp(id: string): Promise<FollowUpResult<{ id: string }>> {
  return setStatus(id, 'cancelled')
}
