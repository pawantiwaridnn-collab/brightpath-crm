import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import type { Activity, ActivityWrite } from '../types/activity.ts'

const ACTIVITY_COLUMNS = 'id, lead_id, actor_id, activity_type, description, created_at'

const leadIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ActivityFailure = {
  ok: false
  kind: 'permission' | 'unavailable' | 'invalid' | 'server'
  message: string
}

export type ActivityResult<T> = { ok: true; data: T } | ActivityFailure

type ActivityRow = {
  id: string
  lead_id: string
  actor_id: string
  activity_type: string
  description: string
  created_at: string
}

function failureFrom(error: PostgrestError): ActivityFailure {
  if (error.code === '42501' || /permission denied|row-level security/i.test(error.message)) {
    return { ok: false, kind: 'permission', message: error.message }
  }
  if (error.code === 'PGRST116') {
    return { ok: false, kind: 'unavailable', message: 'This history is not available.' }
  }
  if (error.code === '23514' || error.code === '23502' || error.code === '23503') {
    return { ok: false, kind: 'invalid', message: 'The history row was rejected.' }
  }
  return { ok: false, kind: 'server', message: error.message }
}

async function actorNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id) => id !== ''))]
  const map = new Map<string, string>()
  if (unique.length === 0) return map

  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('id, full_name')
    .in('id', unique)

  if (error) return map
  for (const row of data ?? []) map.set(row.id, row.full_name)
  return map
}

export async function listActivities(leadId: string): Promise<ActivityResult<Activity[]>> {
  if (!leadIdPattern.test(leadId)) {
    return { ok: false, kind: 'unavailable', message: 'This lead is not available.' }
  }

  const { data, error } = await getSupabaseClient()
    .from('activities')
    .select(ACTIVITY_COLUMNS)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) return failureFrom(error)

  const rows = (data ?? []) as unknown as ActivityRow[]
  const names = await actorNames(rows.map((row) => row.actor_id))
  return {
    ok: true,
    data: rows.map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      actorId: row.actor_id,
      actorName: names.get(row.actor_id) ?? null,
      activityType: row.activity_type,
      description: row.description,
      createdAt: row.created_at,
    })),
  }
}

export async function recordActivity(
  input: ActivityWrite,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: sessionData, error: sessionError } = await getSupabaseClient().auth.getSession()
  const actorId = sessionData.session?.user.id
  if (sessionError || !actorId) {
    return { ok: false, message: 'Sign in again before the history row can be recorded.' }
  }

  const { error } = await getSupabaseClient()
    .from('activities')
    .insert({
      lead_id: input.leadId,
      actor_id: actorId,
      activity_type: input.activityType,
      description: input.description,
    })
    .select('id')
    .single()

  if (error) return { ok: false, message: error.message }
  return { ok: true }
}
