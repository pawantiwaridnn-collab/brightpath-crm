import { useEffect, useState, type ReactNode } from 'react'
import { checkSupabaseConnection } from '../../lib/supabaseClient.ts'
import { readSupabaseConfig } from '../../lib/supabaseConfig.ts'
import { ConfigScreen } from './ConfigScreen.tsx'

type GateState =
  | { status: 'missing'; missing: string[] }
  | { status: 'checking' }
  | { status: 'ready' }
  | { status: 'error'; message: string }

type ConfigGateProps = {
  children: ReactNode
}

export function ConfigGate({ children }: ConfigGateProps) {
  const config = readSupabaseConfig()
  const [state, setState] = useState<GateState>(() =>
    config.ok ? { status: 'checking' } : { status: 'missing', missing: config.missing },
  )

  useEffect(() => {
    if (!config.ok) return

    let cancelled = false

    const current = readSupabaseConfig()
    if (!current.ok) return

    checkSupabaseConnection(current.url, current.anonKey)
      .then(() => {
        if (!cancelled) setState({ status: 'ready' })
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        const message = caught instanceof Error ? caught.message : 'Supabase could not be reached.'
        setState({ status: 'error', message })
      })

    return () => {
      cancelled = true
    }
  }, [config.ok])

  if (!config.ok) return <ConfigScreen missing={config.missing} />
  if (state.status === 'checking') return <ConfigScreen pending />
  if (state.status === 'error') return <ConfigScreen error={state.message} />

  return children
}
