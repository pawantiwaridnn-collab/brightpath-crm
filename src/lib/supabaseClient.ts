import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readSupabaseConfig } from './supabaseConfig.ts'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (client) return client

  const config = readSupabaseConfig()
  if (!config.ok) {
    throw new Error(`Missing Supabase configuration: ${config.missing.join(', ')}`)
  }

  client = createClient(config.url, config.anonKey)
  return client
}

export async function checkSupabaseConnection(url: string, anonKey: string) {
  const healthUrl = `${url.replace(/\/$/, '')}/auth/v1/health`
  let response: Response

  try {
    response = await fetch(healthUrl, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    })
  } catch {
    throw new Error('Supabase could not be reached. Check the project URL and network connection.')
  }

  if (!response.ok) {
    throw new Error(`Supabase rejected the connection (${response.status}).`)
  }

  const { error } = await getSupabaseClient().auth.getSession()
  if (error) throw new Error(error.message)
}
