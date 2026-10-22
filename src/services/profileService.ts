import { getSupabaseClient } from '../lib/supabaseClient.ts'
import { isProfileRole, type Profile } from '../types/profile.ts'

type ProfileRow = {
  id: string
  full_name: string
  role: string
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as ProfileRow
  if (!isProfileRole(row.role)) {
    throw new Error('This account has a role the desk does not recognise.')
  }

  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
  }
}

function toProfile(row: ProfileRow): Profile | null {
  if (!isProfileRole(row.role)) return null
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
  }
}

export type ProfileUpdateResult =
  | { ok: true; profile: Profile }
  | { ok: false; message: string }

const DISPLAY_NAME_LIMIT = 80

export async function updateDisplayName(
  userId: string,
  fullName: string,
): Promise<ProfileUpdateResult> {
  const name = fullName.trim()
  if (name.length === 0) return { ok: false, message: 'Enter a display name.' }
  if (name.length > DISPLAY_NAME_LIMIT) {
    return { ok: false, message: 'Use 80 characters or fewer.' }
  }

  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .update({ full_name: name })
    .eq('id', userId)
    .select('id, full_name, role')
    .single()

  if (error) return { ok: false, message: error.message }

  const profile = toProfile(data as ProfileRow)
  if (!profile) {
    return { ok: false, message: 'This account has a role the desk does not recognise.' }
  }
  return { ok: true, profile }
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('id, full_name, role')
    .order('full_name', { ascending: true })

  if (error) throw new Error(error.message)

  return ((data ?? []) as ProfileRow[]).flatMap((row) => {
    const profile = toProfile(row)
    return profile ? [profile] : []
  })
}
