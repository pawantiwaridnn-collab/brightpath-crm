const URL_KEY = ['VITE', 'SUPABASE', 'URL'].join('_')
const ANON_KEY = ['VITE', 'SUPABASE', 'ANON', 'KEY'].join('_')

export type SupabaseConfig =
  | { ok: true; url: string; anonKey: string }
  | { ok: false; missing: string[] }

export function readSupabaseConfig(): SupabaseConfig {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
  const missing: string[] = []

  if (!url) missing.push(URL_KEY)
  if (!anonKey) missing.push(ANON_KEY)
  if (missing.length > 0) return { ok: false, missing }

  return { ok: true, url, anonKey }
}
