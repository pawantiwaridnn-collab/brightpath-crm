import { useEffect, useState, type ReactNode } from 'react'
import type { AuthError, Session } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../lib/supabaseClient.ts'
import { fetchProfile } from '../../services/profileService.ts'
import type { Profile } from '../../types/profile.ts'
import { AuthContext, type AuthState } from './auth-context.ts'

type AuthProviderProps = {
  children: ReactNode
}

function signInMessage(error: AuthError): string {
  const text = error.message.toLowerCase()
  if (error.code === 'invalid_credentials' || text.includes('invalid login credentials')) {
    return 'Those credentials were not accepted.'
  }
  return error.message
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({ status: 'checking' })

  useEffect(() => {
    const supabase = getSupabaseClient()
    let cancelled = false
    let request = 0
    let sawSession = false

    function applySession(session: Session | null, ended: boolean) {
      const current = ++request
      if (!session) {
        if (!cancelled) {
          setState({
            status: 'signed-out',
            notice: ended ? 'Your session ended. Sign in again.' : undefined,
          })
        }
        return
      }

      sawSession = true
      void fetchProfile(session.user.id)
        .then((profile) => {
          if (cancelled || current !== request) return
          setState(profile ? { status: 'ready', profile } : { status: 'missing-profile' })
        })
        .catch((caught: unknown) => {
          if (cancelled || current !== request) return
          const message = caught instanceof Error ? caught.message : 'Your profile could not be loaded.'
          setState({ status: 'error', message })
        })
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        setState({ status: 'error', message: error.message })
        return
      }
      applySession(data.session, false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(() => {
        if (cancelled) return
        const ended = event === 'SIGNED_OUT' && sawSession
        applySession(session, ended)
      }, 0)
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await getSupabaseClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (!error) return null
    return signInMessage(error)
  }

  async function signOut() {
    const { error } = await getSupabaseClient().auth.signOut()
    if (error) setState({ status: 'error', message: error.message })
  }

  function replaceProfile(profile: Profile) {
    setState((current) => {
      if (current.status !== 'ready' || current.profile.id !== profile.id) return current
      return { status: 'ready', profile }
    })
  }

  const profile = state.status === 'ready' ? state.profile : null

  return (
    <AuthContext.Provider value={{ state, profile, signIn, signOut, replaceProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
